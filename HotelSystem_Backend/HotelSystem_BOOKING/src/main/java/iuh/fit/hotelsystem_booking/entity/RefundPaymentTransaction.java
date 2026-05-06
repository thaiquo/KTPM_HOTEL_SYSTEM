package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refund_payment_transactions",
        uniqueConstraints = @UniqueConstraint(columnNames = "refund_request_id"))
public class RefundPaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refund_request_id", nullable = false)
    private Long refundRequestId;

    private Long bookingId;
    private Long userId;
    private String paymentTransactionId;
    private String gateway;
    private Double refundAmount;
    private Double cancellationFee;

    @Enumerated(EnumType.STRING)
    private RefundPaymentTransactionStatus status;

    private String gatewayRefundTransactionId;
    private String note;
    private String processedBy;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public Double getCancellationFee() { return cancellationFee; }
    public void setCancellationFee(Double cancellationFee) { this.cancellationFee = cancellationFee; }

    public RefundPaymentTransactionStatus getStatus() { return status; }
    public void setStatus(RefundPaymentTransactionStatus status) { this.status = status; }

    public String getGatewayRefundTransactionId() { return gatewayRefundTransactionId; }
    public void setGatewayRefundTransactionId(String gatewayRefundTransactionId) { this.gatewayRefundTransactionId = gatewayRefundTransactionId; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static RefundPaymentTransaction create(RefundTransaction refundRequest, Long userId, String processedBy) {
        RefundPaymentTransaction transaction = new RefundPaymentTransaction();
        transaction.refundRequestId = refundRequest.getId();
        transaction.bookingId = refundRequest.getBookingId();
        transaction.userId = userId;
        transaction.paymentTransactionId = refundRequest.getPaymentTransactionId();
        transaction.gateway = refundRequest.getRefundMethod();
        transaction.refundAmount = refundRequest.getRefundAmount();
        transaction.cancellationFee = refundRequest.getCancellationFee();
        transaction.status = RefundPaymentTransactionStatus.PENDING;
        transaction.note = refundRequest.getReason();
        transaction.processedBy = processedBy;
        transaction.createdAt = LocalDateTime.now();
        transaction.updatedAt = LocalDateTime.now();
        return transaction;
    }
}
