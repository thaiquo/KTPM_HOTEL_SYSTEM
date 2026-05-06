package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.dto.RefundRequest;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransactionStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;

@Service
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    private final RefundTransactionRepository refundRepository;
    private final BookingRepository bookingRepository;
    private final PaymentGateway paymentGateway;
    private final RefundQueueProducer refundQueueProducer;
    private final RefundPaymentTransactionRepository paymentTransactionRepository;
    private final RefundAuditService refundAuditService;
    private final RefundNotificationService refundNotificationService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${payment.service.url:http://payment-service:8085}")
    private String paymentServiceUrl;

    public RefundService(RefundTransactionRepository refundRepository,
                         BookingRepository bookingRepository,
                         PaymentGateway paymentGateway,
                         RefundQueueProducer refundQueueProducer,
                         RefundPaymentTransactionRepository paymentTransactionRepository,
                         RefundAuditService refundAuditService,
                         RefundNotificationService refundNotificationService) {
        this.refundRepository = refundRepository;
        this.bookingRepository = bookingRepository;
        this.paymentGateway = paymentGateway;
        this.refundQueueProducer = refundQueueProducer;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.refundAuditService = refundAuditService;
        this.refundNotificationService = refundNotificationService;
    }

    @Transactional
    public RefundTransaction createRefundTransaction(Booking booking, CancellationPolicyResult policyResult) {
        String idempotencyKey = buildIdempotencyKey(booking);

        return refundRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> {
                    RefundTransaction refund = RefundTransaction.create(
                            booking.getId(),
                            resolvePaymentTransactionId(booking),
                            policyResult.getPaidAmount(),
                            policyResult.getCancellationFee(),
                            policyResult.getRefundAmount(),
                            BookingConstants.REFUND_METHOD_VNPAY,
                            policyResult.getReason(),
                            idempotencyKey
                    );
                    log.info("Create refund request. bookingId={}, refundAmount={}, idempotencyKey={}",
                            booking.getId(), policyResult.getRefundAmount(), idempotencyKey);
                    RefundTransaction saved = refundRepository.save(refund);
                    refundAuditService.log(saved.getId(), "CREATED", null, RefundStatus.PENDING,
                            String.valueOf(booking.getUserId()), "CUSTOMER", "Refund request created");
                    refundNotificationService.notifyCreated(saved, booking);
                    refundQueueProducer.publishRequested(saved);
                    return saved;
                });
    }

    @Transactional
    public RefundTransaction createEarlyCheckoutRefundTransaction(Booking booking, iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult early) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        if (early == null) {
            throw new IllegalArgumentException("early must not be null");
        }

        BigDecimal refundAmount = early.getRefundAmount() != null ? early.getRefundAmount() : BigDecimal.ZERO;
        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        String idempotencyKey = buildEarlyCheckoutIdempotencyKey(booking);
        return refundRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> {
                    RefundTransaction refund = RefundTransaction.create(
                            booking.getId(),
                            resolvePaymentTransactionId(booking),
                            valueOrZero(booking.getPaidAmount()),
                            0.0,
                            refundAmount.doubleValue(),
                            BookingConstants.REFUND_METHOD_VNPAY,
                            "EARLY_CHECKOUT_REFUND",
                            idempotencyKey
                    );
                    RefundTransaction saved = refundRepository.save(refund);
                    refundAuditService.log(saved.getId(), "CREATED", null, RefundStatus.PENDING,
                            String.valueOf(booking.getUserId()), "CUSTOMER", "Early checkout refund request created");
                    refundNotificationService.notifyCreated(saved, booking);
                    refundQueueProducer.publishRequested(saved);
                    return saved;
                });
    }

    @Transactional
    public RefundTransaction createRefundRequest(Long bookingId, RefundRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (request == null || request.getCitizenId() == null || request.getCitizenId().isBlank()) {
            throw new IllegalArgumentException("citizenId is required");
        }
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new IllegalArgumentException("reason is required");
        }
        if (request.getUserId() != null && !request.getUserId().equals(booking.getUserId())) {
            throw new IllegalArgumentException("User does not own this booking");
        }

        int refundPercent = calculateRefundPercent(booking, LocalDateTime.now());
        double paidAmount = valueOrZero(booking.getPaidAmount());
        double refundAmount = paidAmount * refundPercent / 100.0;
        String idempotencyKey = BookingConstants.REFUND_IDEMPOTENCY_PREFIX + bookingId;

        RefundTransaction refund = refundRepository.findByIdempotencyKey(idempotencyKey).orElseGet(RefundTransaction::new);
        refund.setBookingId(bookingId);
        refund.setUserId(booking.getUserId());
        refund.setCitizenId(request.getCitizenId());
        refund.setPaymentTransactionId(resolvePaymentTransactionId(booking));
        refund.setPaidAmount(paidAmount);
        refund.setCancellationFee(Math.max(0.0, paidAmount - refundAmount));
        refund.setRefundAmount(refundAmount);
        refund.setRefundPercent(refundPercent);
        refund.setRefundMethod(BookingConstants.REFUND_METHOD_VNPAY);
        refund.setAmount(refundAmount);
        refund.setReason(request.getReason());
        refund.setStatus(RefundStatus.PENDING);
        refund.setAssignedTo(null);
        refund.setAssignedAt(null);
        refund.setProcessedBy(null);
        refund.setProcessedByStaffId(null);
        refund.setProcessedAt(null);
        refund.setCompletedAt(null);
        refund.setRejectReason(null);
        refund.setIdempotencyKey(idempotencyKey);
        if (refund.getCreatedAt() == null) {
            refund.setCreatedAt(LocalDateTime.now());
        }
        refund.setDueAt(LocalDateTime.now().plusHours(BookingConstants.REFUND_SLA_HOURS));
        refund.setPriority(BookingConstants.REFUND_PRIORITY_NORMAL);
        refund.setUpdatedAt(LocalDateTime.now());

        booking.setStatus(BookingStatus.CANCEL_REQUESTED);
        booking.setPaymentStatus(refundAmount > 0 ? BookingConstants.PAYMENT_STATUS_REFUND_PENDING
                : BookingConstants.PAYMENT_STATUS_NO_REFUND);
        bookingRepository.save(booking);

        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "CREATED", null, RefundStatus.PENDING,
                String.valueOf(booking.getUserId()), "CUSTOMER", "Refund request created");
        refundNotificationService.notifyCreated(saved, booking);
        refundQueueProducer.publishRequested(saved);
        return saved;
    }

    @Transactional
    public RefundTransaction approveRefundByStaff(Long refundId, Long staffId) {
        RefundTransaction refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));
        ensureAssignedToStaff(refund, staffId);
        RefundStatus oldStatus = refund.getStatus();
        refund.setStatus(RefundStatus.APPROVED);
        refund.setProcessedByStaffId(staffId);
        refund.setProcessedBy(String.valueOf(staffId));
        refund.setProcessedAt(LocalDateTime.now());
        refund.setUpdatedAt(LocalDateTime.now());
        RefundTransaction approved = refundRepository.save(refund);

        Map<String, Object> paymentRequest = new HashMap<>();
        paymentRequest.put("refundRequestId", refundId);
        paymentRequest.put("bookingId", refund.getBookingId());
        paymentRequest.put("userId", refund.getUserId());
        paymentRequest.put("amount", refund.getRefundAmount());
        restTemplate.postForObject(paymentServiceUrl + "/payments/refunds/" + refundId, paymentRequest, Object.class);

        approved.setStatus(RefundStatus.COMPLETED);
        approved.setCompletedAt(LocalDateTime.now());
        approved.setUpdatedAt(LocalDateTime.now());
        bookingRepository.findById(approved.getBookingId()).ifPresent(booking -> {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancellationReason(approved.getReason());
            booking.setPaymentStatus(valueOrZero(approved.getRefundAmount()) > 0
                    ? BookingConstants.PAYMENT_STATUS_REFUNDED
                    : BookingConstants.PAYMENT_STATUS_NO_REFUND);
            bookingRepository.save(booking);
        });
        refundAuditService.log(refund.getId(), "APPROVED", oldStatus, RefundStatus.COMPLETED,
                String.valueOf(staffId), "REFUND_STAFF", "Refund approved and completed");
        return refundRepository.save(approved);
    }

    @Transactional
    public RefundTransaction rejectRefundByStaff(Long refundId, Long staffId, String reason) {
        RefundTransaction refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));
        ensureAssignedToStaff(refund, staffId);
        RefundStatus oldStatus = refund.getStatus();
        refund.setStatus(RefundStatus.REJECTED);
        refund.setProcessedByStaffId(staffId);
        refund.setProcessedBy(String.valueOf(staffId));
        refund.setProcessedAt(LocalDateTime.now());
        refund.setRejectReason(reason);
        refund.setUpdatedAt(LocalDateTime.now());
        bookingRepository.findById(refund.getBookingId()).ifPresent(booking -> {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_NO_REFUND);
            bookingRepository.save(booking);
        });
        refundAuditService.log(refund.getId(), "REJECTED", oldStatus, RefundStatus.REJECTED,
                String.valueOf(staffId), "REFUND_STAFF", reason);
        return refundRepository.save(refund);
    }

    @Transactional
    public RefundTransaction approveRefund(Long refundId, String processedBy) {
        RefundTransaction refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() == RefundStatus.REFUNDED || refund.getStatus() == RefundStatus.SUCCESS) {
            return refund;
        }
        if (refund.getStatus() == RefundStatus.REJECTED) {
            throw new IllegalStateException("Rejected refund request cannot be approved");
        }

        RefundStatus oldStatus = refund.getStatus();
        RefundPaymentTransaction paymentTransaction = createPaymentTransactionIfAbsent(refund, processedBy);

        refundAuditService.log(refund.getId(), "APPROVED", oldStatus, RefundStatus.PROCESSING,
                processedBy, "REFUND_STAFF", "Refund request approved");
        refundNotificationService.notifyApproved(refund);

        refund.setStatus(RefundStatus.PROCESSING);
        refund.setProcessedBy(processedBy);
        refund.setUpdatedAt(LocalDateTime.now());
        refundRepository.save(refund);
        paymentTransaction.setStatus(RefundPaymentTransactionStatus.PROCESSING);
        paymentTransaction.setUpdatedAt(LocalDateTime.now());
        paymentTransactionRepository.save(paymentTransaction);

        PaymentGateway.GatewayRefundResult gatewayResult = paymentGateway.refund(
                refund.getPaymentTransactionId(),
                valueOrZero(refund.getRefundAmount()),
                refund.getIdempotencyKey());

        Booking booking = bookingRepository.findById(refund.getBookingId())
                .orElseThrow(() -> new IllegalStateException("Booking not found for refund: " + refund.getBookingId()));

        if (gatewayResult.success()) {
            refund.setStatus(RefundStatus.REFUNDED);
            paymentTransaction.setStatus(RefundPaymentTransactionStatus.SUCCESS);
            paymentTransaction.setGatewayRefundTransactionId(gatewayResult.gatewayRefundTransactionId());
            paymentTransaction.setProcessedAt(LocalDateTime.now());
            paymentTransaction.setUpdatedAt(LocalDateTime.now());
            double paidAmount = valueOrZero(refund.getPaidAmount());
            double refundAmount = valueOrZero(refund.getRefundAmount());
            booking.setPaymentStatus(refundAmount >= paidAmount
                    ? BookingConstants.PAYMENT_STATUS_REFUNDED
                    : BookingConstants.PAYMENT_STATUS_PARTIALLY_REFUNDED);
            refundAuditService.log(refund.getId(), "REFUNDED", RefundStatus.PROCESSING, RefundStatus.REFUNDED,
                    processedBy, "SYSTEM", "Refund processed successfully");
            refundNotificationService.notifyRefunded(refund, gatewayResult.gatewayRefundTransactionId());
            log.info("Refund success. refundId={}, bookingId={}, amount={}", refund.getId(), booking.getId(), refundAmount);
        } else {
            refund.setStatus(RefundStatus.FAILED);
            paymentTransaction.setStatus(RefundPaymentTransactionStatus.FAILED);
            paymentTransaction.setNote(gatewayResult.message());
            paymentTransaction.setUpdatedAt(LocalDateTime.now());
            refundAuditService.log(refund.getId(), "FAILED", RefundStatus.PROCESSING, RefundStatus.FAILED,
                    processedBy, "SYSTEM", gatewayResult.message());
            refundNotificationService.notifyFailed(refund, gatewayResult.message());
            refundQueueProducer.publishFailed(refund);
            log.warn("Refund failed. refundId={}, reason={}", refund.getId(), gatewayResult.message());
        }

        refund.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);
        paymentTransactionRepository.save(paymentTransaction);
        return refundRepository.save(refund);
    }

    @Transactional
    public RefundTransaction rejectRefund(Long refundId, String processedBy, String reason) {
        RefundTransaction refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));
        if (refund.getStatus() == RefundStatus.REFUNDED || refund.getStatus() == RefundStatus.SUCCESS) {
            throw new IllegalStateException("Refunded request cannot be rejected");
        }

        RefundStatus oldStatus = refund.getStatus();
        refund.setStatus(RefundStatus.REJECTED);
        refund.setProcessedBy(processedBy);
        refund.setReason(reason != null && !reason.isBlank() ? reason : refund.getReason());
        refund.setUpdatedAt(LocalDateTime.now());

        bookingRepository.findById(refund.getBookingId()).ifPresent(booking -> {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_NO_REFUND);
            bookingRepository.save(booking);
        });

        refundAuditService.log(refund.getId(), "REJECTED", oldStatus, RefundStatus.REJECTED,
                processedBy, "REFUND_STAFF", refund.getReason());
        refundNotificationService.notifyRejected(refund, refund.getReason());
        log.info("Refund rejected. refundId={}, bookingId={}", refund.getId(), refund.getBookingId());
        return refundRepository.save(refund);
    }

    private RefundPaymentTransaction createPaymentTransactionIfAbsent(RefundTransaction refund, String processedBy) {
        return paymentTransactionRepository.findByRefundRequestId(refund.getId())
                .orElseGet(() -> {
                    Long userId = bookingRepository.findById(refund.getBookingId())
                            .map(Booking::getUserId)
                            .orElse(null);
                    RefundPaymentTransaction transaction = RefundPaymentTransaction.create(refund, userId, processedBy);
                    return paymentTransactionRepository.save(transaction);
                });
    }

    private String buildIdempotencyKey(Booking booking) {
        return BookingConstants.REFUND_IDEMPOTENCY_PREFIX + booking.getId();
    }

    private String buildEarlyCheckoutIdempotencyKey(Booking booking) {
        return BookingConstants.EARLY_CHECKOUT_REFUND_IDEMPOTENCY_PREFIX + booking.getId();
    }

    private String resolvePaymentTransactionId(Booking booking) {
        if (booking.getPaymentTransactionId() != null && !booking.getPaymentTransactionId().isBlank()) {
            return booking.getPaymentTransactionId();
        }
        return "vnpay_txn_" + booking.getId();
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    private int calculateRefundPercent(Booking booking, LocalDateTime now) {
        if (booking.isNonRefundable()) {
            return 0;
        }
        LocalDateTime officialCheckIn = booking.getCheckIn().atTime(LocalTime.of(BookingConstants.CHECK_IN_HOUR, 0));
        long hoursBeforeCheckIn = ChronoUnit.HOURS.between(now, officialCheckIn);
        if (hoursBeforeCheckIn >= 72) {
            return 100;
        }
        if (hoursBeforeCheckIn >= 24) {
            return 50;
        }
        return 0;
    }

    private void ensureAssignedToStaff(RefundTransaction refund, Long staffId) {
        if (staffId == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        if (refund.getStatus() != RefundStatus.ASSIGNED && refund.getStatus() != RefundStatus.PROCESSING) {
            throw new IllegalStateException("Refund request must be assigned before processing");
        }
        if (!staffId.equals(refund.getAssignedTo())) {
            throw new IllegalStateException("Refund request is not assigned to staff: " + staffId);
        }
    }
}
