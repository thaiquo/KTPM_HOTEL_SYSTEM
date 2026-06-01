package iuh.fit.hotelsystem_booking.cqrs.readmodel;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_invoice_read_model")
public class BookingInvoiceReadModel {
    @Id
    private Long invoiceId;
    private String invoiceCode;
    private Long bookingId;
    private String bookingCode;
    private Long customerUserId;
    private String customerName;
    private String customerPhone;
    private String roomNumbers;
    private String invoiceStatus;
    private String bookingStatus;
    private String paymentStatus;
    private String refundStatus;
    private BigDecimal grossInvoiceAmount = BigDecimal.ZERO;
    private BigDecimal totalRefundAmount = BigDecimal.ZERO;
    private BigDecimal netRevenue = BigDecimal.ZERO;
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal remainingAmount = BigDecimal.ZERO;
    private Long checkoutStaffId;
    private Long checkinStaffId;
    private LocalDateTime checkoutTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }
    public String getInvoiceCode() { return invoiceCode; }
    public void setInvoiceCode(String invoiceCode) { this.invoiceCode = invoiceCode; }
    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }
    public Long getCustomerUserId() { return customerUserId; }
    public void setCustomerUserId(Long customerUserId) { this.customerUserId = customerUserId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getRoomNumbers() { return roomNumbers; }
    public void setRoomNumbers(String roomNumbers) { this.roomNumbers = roomNumbers; }
    public String getInvoiceStatus() { return invoiceStatus; }
    public void setInvoiceStatus(String invoiceStatus) { this.invoiceStatus = invoiceStatus; }
    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }
    public BigDecimal getGrossInvoiceAmount() { return grossInvoiceAmount; }
    public void setGrossInvoiceAmount(BigDecimal grossInvoiceAmount) { this.grossInvoiceAmount = grossInvoiceAmount; }
    public BigDecimal getTotalRefundAmount() { return totalRefundAmount; }
    public void setTotalRefundAmount(BigDecimal totalRefundAmount) { this.totalRefundAmount = totalRefundAmount; }
    public BigDecimal getNetRevenue() { return netRevenue; }
    public void setNetRevenue(BigDecimal netRevenue) { this.netRevenue = netRevenue; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }
    public Long getCheckoutStaffId() { return checkoutStaffId; }
    public void setCheckoutStaffId(Long checkoutStaffId) { this.checkoutStaffId = checkoutStaffId; }
    public Long getCheckinStaffId() { return checkinStaffId; }
    public void setCheckinStaffId(Long checkinStaffId) { this.checkinStaffId = checkinStaffId; }
    public LocalDateTime getCheckoutTime() { return checkoutTime; }
    public void setCheckoutTime(LocalDateTime checkoutTime) { this.checkoutTime = checkoutTime; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
