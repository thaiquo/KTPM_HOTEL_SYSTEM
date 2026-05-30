package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDateTime;

public class PaymentTransactionDto {
    private Long id;
    private Long bookingId;
    private Long userId;
    private Long payerGuestId;
    private String payerName;
    private String payerPhone;
    private Double totalAmount;
    private Double paidAmount;
    private Double amount;
    private String paymentType;
    private String invoiceCategory;
    private String method;
    private String status;
    private String transactionId;
    private String paymentCode;
    private String vnpTransactionNo;
    private String vnpResponseCode;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getPayerGuestId() { return payerGuestId; }
    public void setPayerGuestId(Long payerGuestId) { this.payerGuestId = payerGuestId; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getPayerPhone() { return payerPhone; }
    public void setPayerPhone(String payerPhone) { this.payerPhone = payerPhone; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public String getInvoiceCategory() { return invoiceCategory; }
    public void setInvoiceCategory(String invoiceCategory) { this.invoiceCategory = invoiceCategory; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }

    public String getVnpTransactionNo() { return vnpTransactionNo; }
    public void setVnpTransactionNo(String vnpTransactionNo) { this.vnpTransactionNo = vnpTransactionNo; }

    public String getVnpResponseCode() { return vnpResponseCode; }
    public void setVnpResponseCode(String vnpResponseCode) { this.vnpResponseCode = vnpResponseCode; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
