package iuh.fit.hotelsystem_payment.dto;

public class OperationalPaymentRequest {
    private Long bookingId;
    private Long userId;
    private Long staffId;
    private Long payerGuestId;
    private String payerName;
    private String payerPhone;
    private Double amount;
    private String method;
    private String transactionId;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Long getPayerGuestId() { return payerGuestId; }
    public void setPayerGuestId(Long payerGuestId) { this.payerGuestId = payerGuestId; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getPayerPhone() { return payerPhone; }
    public void setPayerPhone(String payerPhone) { this.payerPhone = payerPhone; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
}
