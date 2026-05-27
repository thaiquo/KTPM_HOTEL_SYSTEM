package iuh.fit.hotelsystem_payment.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refund_transactions", indexes = {
        @Index(name = "idx_refund_tx_booking_id", columnList = "booking_id"),
        @Index(name = "idx_refund_tx_original_payment_id", columnList = "original_payment_id")
})
public class RefundTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;

    /** Links refund to the successful payment row in {@code payments} that funded this refund. */
    @Column(name = "original_payment_id")
    private Long originalPaymentId;

    @Enumerated(EnumType.STRING)
    private RefundReceiverType receiverType;

    private Long receiverId;

    private String receiverName;
    private String receiverPhone;

    @Column(precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private RefundTransactionMethod method;

    @Enumerated(EnumType.STRING)
    private RefundTransactionStatus status;

    @Enumerated(EnumType.STRING)
    private RefundReason reason;

    private Long processedByStaffId;

    @Column(length = 2000)
    private String note;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBookingId() {
        return bookingId;
    }

    public void setBookingId(Long bookingId) {
        this.bookingId = bookingId;
    }

    public Long getOriginalPaymentId() {
        return originalPaymentId;
    }

    public void setOriginalPaymentId(Long originalPaymentId) {
        this.originalPaymentId = originalPaymentId;
    }

    public RefundReceiverType getReceiverType() {
        return receiverType;
    }

    public void setReceiverType(RefundReceiverType receiverType) {
        this.receiverType = receiverType;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public RefundTransactionMethod getMethod() {
        return method;
    }

    public void setMethod(RefundTransactionMethod method) {
        this.method = method;
    }

    public RefundTransactionStatus getStatus() {
        return status;
    }

    public void setStatus(RefundTransactionStatus status) {
        this.status = status;
    }

    public RefundReason getReason() {
        return reason;
    }

    public void setReason(RefundReason reason) {
        this.reason = reason;
    }

    public Long getProcessedByStaffId() {
        return processedByStaffId;
    }

    public void setProcessedByStaffId(Long processedByStaffId) {
        this.processedByStaffId = processedByStaffId;
    }

    

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
