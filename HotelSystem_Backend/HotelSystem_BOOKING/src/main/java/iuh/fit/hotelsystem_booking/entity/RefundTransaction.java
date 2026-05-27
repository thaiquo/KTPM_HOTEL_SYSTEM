package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Lưu lại mỗi lần refund.
 * idempotencyKey đảm bảo không refund lặp dù gọi API nhiều lần.
 */
@Entity
@Table(name = "refund_transactions",
       uniqueConstraints = @UniqueConstraint(columnNames = "idempotency_key"))
public class RefundTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;

    private Long userId;

    private String citizenId;

    /** Transaction ID gốc từ VNPAY / PAYMENT service */
    private String paymentTransactionId;

    private Double paidAmount;

    private Double cancellationFee;

    private Double refundAmount;

    private Integer refundPercent;

    private String refundMethod;

    private Double amount;

    @Enumerated(EnumType.STRING)
    private RefundStatus status;

    private String reason;

    private String processedBy;

    private Long processedByStaffId;

    private LocalDateTime processedAt;

    private LocalDateTime completedAt;

    private String rejectReason;

    private Long assignedTo;

    private LocalDateTime assignedAt;

    private LocalDateTime dueAt;

    private String priority;

    /**
     * Key đảm bảo idempotency:
     * "refund_" + bookingId + "_" + paymentTransactionId
     */
    @Column(name = "idempotency_key", unique = true, nullable = false)
    private String idempotencyKey;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ════════════════════════════════════════════════════════════
    // Getters / Setters
    // ════════════════════════════════════════════════════════════

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCitizenId() { return citizenId; }
    public void setCitizenId(String citizenId) { this.citizenId = citizenId; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }

    public Double getCancellationFee() { return cancellationFee; }
    public void setCancellationFee(Double cancellationFee) { this.cancellationFee = cancellationFee; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public Integer getRefundPercent() { return refundPercent; }
    public void setRefundPercent(Integer refundPercent) { this.refundPercent = refundPercent; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public RefundStatus getStatus() { return status; }
    public void setStatus(RefundStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    public Long getAssignedTo() { return assignedTo; }
    public void setAssignedTo(Long assignedTo) { this.assignedTo = assignedTo; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public iuh.fit.hotelsystem_booking.entity.PublicRefundStatus getPublicStatus() {
        return this.status != null ? this.status.toPublic() : null;
    }

    // ─── Factory ─────────────────────────────────────────────────
    public static RefundTransaction create(Long bookingId,
                                           String paymentTransactionId,
                                           Double paidAmount,
                                           Double cancellationFee,
                                           Double refundAmount,
                                           String refundMethod,
                                           String reason,
                                           String idempotencyKey) {
        return create(bookingId, paymentTransactionId, paidAmount, cancellationFee, refundAmount, refundMethod, reason, idempotencyKey, LocalDateTime.now());
    }

    public static RefundTransaction create(Long bookingId,
                                           String paymentTransactionId,
                                           Double paidAmount,
                                           Double cancellationFee,
                                           Double refundAmount,
                                           String refundMethod,
                                           String reason,
                                           String idempotencyKey,
                                           LocalDateTime now) {
        RefundTransaction rt = new RefundTransaction();
        rt.bookingId             = bookingId;
        rt.paymentTransactionId  = paymentTransactionId;
        rt.paidAmount            = paidAmount;
        rt.cancellationFee       = cancellationFee;
        rt.refundAmount          = refundAmount;
        rt.refundMethod          = refundMethod;
        rt.amount                = refundAmount;
        rt.reason                = reason;
        rt.idempotencyKey        = idempotencyKey;
        rt.status                = RefundStatus.PENDING;
        rt.createdAt             = now != null ? now : LocalDateTime.now();
        rt.dueAt                 = rt.createdAt.plusHours(iuh.fit.hotelsystem_booking.constants.BookingConstants.REFUND_SLA_HOURS);
        rt.priority              = iuh.fit.hotelsystem_booking.constants.BookingConstants.REFUND_PRIORITY_NORMAL;
        rt.updatedAt             = rt.createdAt;
        return rt;
    }
}
