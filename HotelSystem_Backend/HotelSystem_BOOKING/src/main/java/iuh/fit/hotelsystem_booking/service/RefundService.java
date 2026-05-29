package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.entity.BookingLockStatus;
import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.dto.RefundRequest;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransactionStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;

@Service
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    private final RefundTransactionRepository refundRepository;
    private final BookingRepository bookingRepository;
    private final CancellationPolicyService policyService;
    private final PaymentGateway paymentGateway;
    private final RefundQueueProducer refundQueueProducer;
    private final RefundPaymentTransactionRepository paymentTransactionRepository;
    private final RefundAuditService refundAuditService;
    private final RefundNotificationService refundNotificationService;
    private final PaymentServiceClient paymentServiceClient;
    private RabbitTemplate rabbitTemplate;

    public RefundService(RefundTransactionRepository refundRepository,
                         BookingRepository bookingRepository,
                         CancellationPolicyService policyService,
                         PaymentGateway paymentGateway,
                         RefundQueueProducer refundQueueProducer,
                         RefundPaymentTransactionRepository paymentTransactionRepository,
                         RefundAuditService refundAuditService,
                         RefundNotificationService refundNotificationService,
                         PaymentServiceClient paymentServiceClient) {
        this.refundRepository = refundRepository;
        this.bookingRepository = bookingRepository;
        this.policyService = policyService;
        this.paymentGateway = paymentGateway;
        this.refundQueueProducer = refundQueueProducer;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.refundAuditService = refundAuditService;
        this.refundNotificationService = refundNotificationService;
        this.paymentServiceClient = paymentServiceClient;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setRabbitTemplate(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public RefundTransaction createRefundTransaction(Booking booking, CancellationPolicyResult policyResult) {
        String idempotencyKey = buildIdempotencyKey(booking);
        LocalDateTime now = nowVi();

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
                            idempotencyKey,
                            now
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
    public RefundTransaction createCancellationRequest(Booking booking, CancellationPolicyResult policyResult, String reason) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        if (policyResult == null) {
            throw new IllegalArgumentException("policyResult must not be null");
        }
        String idempotencyKey = buildIdempotencyKey(booking);
        LocalDateTime now = nowVi();
        RefundTransaction refund = refundRepository.findByIdempotencyKey(idempotencyKey).orElseGet(RefundTransaction::new);
        refund.setBookingId(booking.getId());
        refund.setUserId(booking.getUserId());
        refund.setPaymentTransactionId(resolvePaymentTransactionId(booking));
        refund.setPaidAmount(policyResult.getPaidAmount());
        refund.setCancellationFee(policyResult.getCancellationFee());
        refund.setRefundAmount(policyResult.getRefundAmount());
        refund.setRefundPercent(policyResult.getPaidAmount() > 0
                ? (int) Math.round(policyResult.getRefundAmount() * 100.0 / policyResult.getPaidAmount())
                : 0);
        refund.setRefundMethod(BookingConstants.REFUND_METHOD_VNPAY);
        refund.setAmount(policyResult.getRefundAmount());
        refund.setReason(reason != null && !reason.isBlank() ? reason : policyResult.getReason());
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
            refund.setCreatedAt(now);
        }
        refund.setDueAt(now.plusHours(BookingConstants.REFUND_SLA_HOURS));
        refund.setPriority(BookingConstants.REFUND_PRIORITY_NORMAL);
        refund.setUpdatedAt(now);

        booking.setStatus(BookingStatus.CANCEL_REQUESTED);
        booking.setCancellationReason(refund.getReason());
        booking.setPaymentStatus(policyResult.getRefundAmount() > 0
                ? BookingConstants.PAYMENT_STATUS_REFUND_PENDING
                : BookingConstants.PAYMENT_STATUS_NO_REFUND);
        bookingRepository.save(booking);

        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "CREATED", null, RefundStatus.PENDING,
                String.valueOf(booking.getUserId()), "CUSTOMER", "Cancellation request created");
        refundNotificationService.notifyCreated(saved, booking);
        refundQueueProducer.publishRequested(saved);
        return saved;
    }

    @Transactional
    public RefundTransaction createRoomChangeRefundTransaction(Booking booking, BigDecimal refundAmount, String reason) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        BigDecimal amount = refundAmount != null ? refundAmount.abs() : BigDecimal.ZERO;
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        String idempotencyKey = BookingConstants.ROOM_CHANGE_REFUND_IDEMPOTENCY_PREFIX
                + booking.getId() + "_" + amount.toPlainString();
        LocalDateTime now = nowVi();
        return refundRepository.findByIdempotencyKey(idempotencyKey).orElseGet(() -> {
            RefundTransaction refund = RefundTransaction.create(
                    booking.getId(),
                    resolvePaymentTransactionId(booking),
                    valueOrZero(booking.getPaidAmount()),
                    0.0,
                    amount.doubleValue(),
                    BookingConstants.REFUND_METHOD_VNPAY,
                    "ROOM_CHANGE_REFUND",
                    idempotencyKey,
                    now
            );
            refund.setUserId(booking.getUserId());
            refund.setReason(reason != null && !reason.isBlank() ? reason : "ROOM_CHANGE_REFUND");
            RefundTransaction saved = refundRepository.save(refund);
            refundAuditService.log(saved.getId(), "CREATED", null, RefundStatus.PENDING,
                    String.valueOf(booking.getUserId()), "SYSTEM", "Room change refund request created");
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
        LocalDateTime now = nowVi();
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
                            idempotencyKey,
                            now
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
    public synchronized RefundTransaction createAssignedEarlyCheckoutRefundTransaction(Booking booking, BigDecimal settlementAmount, Long staffId) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        BigDecimal amount = settlementAmount != null ? settlementAmount.abs() : BigDecimal.ZERO;
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        String idempotencyKey = buildEarlyCheckoutIdempotencyKey(booking);
        LocalDateTime now = nowVi();
        RefundTransaction refund = refundRepository.findByIdempotencyKey(idempotencyKey).orElseGet(RefundTransaction::new);
        refund.setBookingId(booking.getId());
        refund.setUserId(booking.getUserId());
        refund.setPaymentTransactionId(resolvePaymentTransactionId(booking));
        refund.setPaidAmount(valueOrZero(booking.getPaidAmount()));
        refund.setCancellationFee(0.0);
        refund.setRefundAmount(amount.doubleValue());
        refund.setRefundPercent(valueOrZero(booking.getPaidAmount()) > 0
                ? (int) Math.round(amount.doubleValue() * 100.0 / valueOrZero(booking.getPaidAmount()))
                : 0);
        refund.setRefundMethod(BookingConstants.REFUND_METHOD_VNPAY);
        refund.setAmount(amount.doubleValue());
        refund.setReason("EARLY_CHECKOUT_REFUND");
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setAssignedTo(staffId);
        refund.setAssignedAt(now);
        refund.setProcessedBy(null);
        refund.setProcessedByStaffId(null);
        refund.setProcessedAt(null);
        refund.setCompletedAt(null);
        refund.setRejectReason(null);
        refund.setIdempotencyKey(idempotencyKey);
        if (refund.getCreatedAt() == null) {
            refund.setCreatedAt(now);
        }
        refund.setDueAt(now.plusHours(BookingConstants.REFUND_SLA_HOURS));
        refund.setPriority(BookingConstants.REFUND_PRIORITY_NORMAL);
        refund.setUpdatedAt(now);

        booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_REFUND_PENDING);
        bookingRepository.save(booking);

        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "CREATED_AND_ASSIGNED", null, RefundStatus.ASSIGNED,
                String.valueOf(staffId), "STAFF", "Early checkout refund created automatically at checkout");
        refundNotificationService.notifyCreated(saved, booking);
        refundQueueProducer.publishAssigned(saved);
        return saved;
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

        LocalDateTime now = nowVi();
        CancellationPolicyResult policyResult = policyService.calculateCancellationPolicy(booking, now);
        if (!policyResult.isCanCancel()) {
            throw new IllegalStateException(policyResult.getReason());
        }

        double paidAmount = valueOrZero(booking.getPaidAmount());
        double refundAmount = valueOrZero(policyResult.getRefundAmount());
        String idempotencyKey = BookingConstants.REFUND_IDEMPOTENCY_PREFIX + bookingId;

        RefundTransaction refund = refundRepository.findByIdempotencyKey(idempotencyKey).orElseGet(RefundTransaction::new);
        refund.setBookingId(bookingId);
        refund.setUserId(booking.getUserId());
        refund.setCitizenId(request.getCitizenId());
        refund.setPaymentTransactionId(resolvePaymentTransactionId(booking));
        refund.setPaidAmount(paidAmount);
        refund.setCancellationFee(valueOrZero(policyResult.getCancellationFee()));
        refund.setRefundAmount(refundAmount);
        refund.setRefundPercent(paidAmount > 0 ? (int) Math.round(refundAmount * 100.0 / paidAmount) : 0);
        refund.setRefundMethod(BookingConstants.REFUND_METHOD_VNPAY);
        refund.setAmount(refundAmount);
        refund.setReason(request.getReason() != null && !request.getReason().isBlank()
            ? request.getReason()
            : policyResult.getReason());
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
            refund.setCreatedAt(now);
        }
        refund.setDueAt(now.plusHours(BookingConstants.REFUND_SLA_HOURS));
        refund.setPriority(BookingConstants.REFUND_PRIORITY_NORMAL);
        refund.setUpdatedAt(now);

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

        if (refund.getStatus() == RefundStatus.REFUNDED || refund.getStatus() == RefundStatus.SUCCESS) {
            return refund;
        }
        ensureAssignedToStaff(refund, staffId);

        String processedBy = String.valueOf(staffId);
        RefundStatus oldStatus = refund.getStatus();
        LocalDateTime now = nowVi();
        refund.setStatus(RefundStatus.PROCESSING);
        refund.setProcessedByStaffId(staffId);
        refund.setProcessedBy(processedBy);
        refund.setProcessedAt(now);
        refund.setUpdatedAt(now);
        refundRepository.save(refund);
        refundAuditService.log(refund.getId(), "APPROVED", oldStatus, RefundStatus.PROCESSING,
                processedBy, "REFUND_STAFF", "Refund request approved for processing");
        refundNotificationService.notifyApproved(refund);

        try {
            if (valueOrZero(refund.getRefundAmount()) <= 0.0) {
                return completeApprovedRefundWithoutPayment(refund, processedBy);
            }
            Map<String, Object> paymentRequest = new HashMap<>();
            paymentRequest.put("refundRequestId", refundId);
            paymentRequest.put("bookingId", refund.getBookingId());
            paymentRequest.put("userId", refund.getUserId());
            paymentRequest.put("amount", refund.getRefundAmount());
            paymentRequest.put("paymentTransactionId", refund.getPaymentTransactionId());
            paymentServiceClient.processRefund(refundId, "refund-request:" + refundId, paymentRequest);

            LocalDateTime completedAt = nowVi();
            refund.setStatus(RefundStatus.REFUNDED);
            refund.setCompletedAt(completedAt);
            refund.setUpdatedAt(completedAt);
            bookingRepository.findById(refund.getBookingId()).ifPresent(booking -> {
                boolean isEarlyCheckoutRefund = isNonCancellationRefund(refund);
                if (isEarlyCheckoutRefund) {
                    // Early checkout: booking đã COMPLETED, CHỈ cập nhật payment status
                    // KHÔNG chuyển thành CANCELLED — đây không phải hủy đơn
                    log.info("Early checkout refund completed. Keeping booking {} as COMPLETED.", refund.getBookingId());
                } else {
                    // Cancellation refund: set booking CANCELLED như bình thường
                    if (booking.getStatus() != BookingStatus.CANCELLED) {
                        markBookingCancelledAfterStaffApproval(booking, completedAt, refund.getReason());
                    }
                }
                double refundAmt = valueOrZero(refund.getRefundAmount());
                double paidAmt = valueOrZero(refund.getPaidAmount());
                if (refundAmt <= 0) {
                    booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_NO_REFUND);
                } else if (paidAmt > 0 && refundAmt >= paidAmt) {
                    booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_REFUNDED);
                } else {
                    booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_PARTIALLY_REFUNDED);
                }
                bookingRepository.save(booking);
            });
            refundAuditService.log(refund.getId(), "REFUNDED", RefundStatus.PROCESSING, RefundStatus.REFUNDED,
                    processedBy, "SYSTEM", "Refund processed via payment service");
            refundNotificationService.notifyRefunded(refund, "PAYMENT_SERVICE");
            log.info("Staff refund approved. refundId={}, bookingId={}, amount={}",
                    refund.getId(), refund.getBookingId(), refund.getRefundAmount());
            return refundRepository.save(refund);
        } catch (Exception ex) {
            refund.setStatus(RefundStatus.FAILED);
            refund.setUpdatedAt(nowVi());
            refundAuditService.log(refund.getId(), "FAILED", RefundStatus.PROCESSING, RefundStatus.FAILED,
                    processedBy, "SYSTEM", ex.getMessage());
            refundNotificationService.notifyFailed(refund, ex.getMessage());
            refundQueueProducer.publishFailed(refund);
            log.warn("Staff refund failed. refundId={}, reason={}", refund.getId(), ex.getMessage());
            return refundRepository.save(refund);
        }
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
        LocalDateTime now = nowVi();
        refund.setProcessedAt(now);
        refund.setRejectReason(reason);
        refund.setUpdatedAt(now);
        bookingRepository.findById(refund.getBookingId()).ifPresent(booking -> {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_NO_REFUND);
            bookingRepository.save(booking);
        });
        refundAuditService.log(refund.getId(), "REJECTED", oldStatus, RefundStatus.REJECTED,
                String.valueOf(staffId), "REFUND_STAFF", reason);
        return refundRepository.save(refund);
    }

    private RefundTransaction completeApprovedRefundWithoutPayment(RefundTransaction refund, String processedBy) {
        LocalDateTime completedAt = nowVi();
        refund.setStatus(RefundStatus.REFUNDED);
        refund.setCompletedAt(completedAt);
        refund.setUpdatedAt(completedAt);
        bookingRepository.findById(refund.getBookingId()).ifPresent(booking -> {
            if (!isNonCancellationRefund(refund)) {
                markBookingCancelledAfterStaffApproval(booking, completedAt, refund.getReason());
            }
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_NO_REFUND);
            bookingRepository.save(booking);
        });
        refundAuditService.log(refund.getId(), "APPROVED_NO_REFUND", RefundStatus.PROCESSING, RefundStatus.REFUNDED,
                processedBy, "SYSTEM", "Request approved without refund payment");
        refundNotificationService.notifyRefunded(refund, "NO_REFUND");
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
        LocalDateTime now = nowVi();
        refund.setUpdatedAt(now);
        refundRepository.save(refund);
        paymentTransaction.setStatus(RefundPaymentTransactionStatus.PROCESSING);
        paymentTransaction.setUpdatedAt(now);
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
            LocalDateTime processedAt = nowVi();
            paymentTransaction.setProcessedAt(processedAt);
            paymentTransaction.setUpdatedAt(processedAt);
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
            paymentTransaction.setUpdatedAt(nowVi());
            refundAuditService.log(refund.getId(), "FAILED", RefundStatus.PROCESSING, RefundStatus.FAILED,
                    processedBy, "SYSTEM", gatewayResult.message());
            refundNotificationService.notifyFailed(refund, gatewayResult.message());
            refundQueueProducer.publishFailed(refund);
            log.warn("Refund failed. refundId={}, reason={}", refund.getId(), gatewayResult.message());
        }

        refund.setUpdatedAt(nowVi());
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
        refund.setUpdatedAt(nowVi());

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

    private boolean isNonCancellationRefund(RefundTransaction refund) {
        String reason = refund.getReason() != null ? refund.getReason() : "";
        String key = refund.getIdempotencyKey() != null ? refund.getIdempotencyKey() : "";
        return "EARLY_CHECKOUT_REFUND".equals(reason)
                || "ROOM_CHANGE_REFUND".equals(reason)
                || key.startsWith(BookingConstants.EARLY_CHECKOUT_REFUND_IDEMPOTENCY_PREFIX)
                || key.startsWith(BookingConstants.ROOM_CHANGE_REFUND_IDEMPOTENCY_PREFIX);
    }

    private void markBookingCancelledAfterStaffApproval(Booking booking, LocalDateTime cancelledAt, String reason) {
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setLockStatus(BookingLockStatus.EXPIRED);
        booking.setCancelledAt(cancelledAt);
        booking.setCancellationReason(reason);
        if (rabbitTemplate != null && booking.getItems() != null) {
            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                RoomMessage roomMsg = new RoomMessage();
                roomMsg.setBookingId(booking.getId());
                roomMsg.setRoomId(item.getRoomId());
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.release", roomMsg);
            }
            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "booking.cancelled",
                    new BookingEvent(booking.getId(), booking.getUserId(), "CANCELLED"));
        }
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

    private LocalDateTime nowVi() {
        return ZonedDateTime.now(iuh.fit.hotelsystem_booking.config.TimeConfig.VIETNAM_ZONE).toLocalDateTime();
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
        if (refund.getStatus() != RefundStatus.ASSIGNED
                && refund.getStatus() != RefundStatus.PROCESSING
                && refund.getStatus() != RefundStatus.FAILED) {
            throw new IllegalStateException("Refund request must be assigned before processing");
        }
        if (!staffId.equals(refund.getAssignedTo())) {
            throw new IllegalStateException("Refund request is not assigned to staff: " + staffId);
        }
    }
}
