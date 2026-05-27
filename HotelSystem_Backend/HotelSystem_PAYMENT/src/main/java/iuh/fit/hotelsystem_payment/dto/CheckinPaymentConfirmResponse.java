package iuh.fit.hotelsystem_payment.dto;

public class CheckinPaymentConfirmResponse {
    private String paymentCode;
    private Long bookingId;
    private String bookingCode;
    private Double amount;
    private String status;
    private String paymentType;
    private String invoiceCategory;

    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public String getInvoiceCategory() { return invoiceCategory; }
    public void setInvoiceCategory(String invoiceCategory) { this.invoiceCategory = invoiceCategory; }
}
