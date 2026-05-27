package iuh.fit.hotelsystem_payment.dto;

public class RefundPaymentRequest {
    private Long refundRequestId;
    private Long bookingId;
    private Long userId;
    private Double amount;
    private String paymentTransactionId;

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }
}
