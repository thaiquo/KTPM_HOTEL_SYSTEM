package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransactionStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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

    private String resolvePaymentTransactionId(Booking booking) {
        if (booking.getPaymentTransactionId() != null && !booking.getPaymentTransactionId().isBlank()) {
            return booking.getPaymentTransactionId();
        }
        return "vnpay_txn_" + booking.getId();
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }
}
