package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class BookingInvoiceDto {
    private Long id;
    private Long bookingId;
    private String bookingCode;
    private String invoiceStatus;
    private String bookingStatus;
    private String customerUserId;
    private String customerName;
    private String representativeName;
    private String representativePhone;
    private String representativeCccd;
    private String checkInDate;
    private String checkOutDate;
    private Integer totalRooms;
    private String checkoutStaffId;
    private String checkoutStaffName;
    private String checkinStaffId;
    private String checkinStaffName;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private Long refundTransactionId;
    private String refundStatus;
    private BigDecimal refundSettlementAmount;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal totalAmount;
    private String currency;
    private Object lines; // parsed JSON
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }

    public String getInvoiceStatus() { return invoiceStatus; }
    public void setInvoiceStatus(String invoiceStatus) { this.invoiceStatus = invoiceStatus; }

    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }

    public String getCustomerUserId() { return customerUserId; }
    public void setCustomerUserId(String customerUserId) { this.customerUserId = customerUserId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getRepresentativeName() { return representativeName; }
    public void setRepresentativeName(String representativeName) { this.representativeName = representativeName; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }

    public String getCheckInDate() { return checkInDate; }
    public void setCheckInDate(String checkInDate) { this.checkInDate = checkInDate; }

    public String getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(String checkOutDate) { this.checkOutDate = checkOutDate; }

    public Integer getTotalRooms() { return totalRooms; }
    public void setTotalRooms(Integer totalRooms) { this.totalRooms = totalRooms; }

    public String getCheckoutStaffId() { return checkoutStaffId; }
    public void setCheckoutStaffId(String checkoutStaffId) { this.checkoutStaffId = checkoutStaffId; }

    public String getCheckoutStaffName() { return checkoutStaffName; }
    public void setCheckoutStaffName(String checkoutStaffName) { this.checkoutStaffName = checkoutStaffName; }

    public String getCheckinStaffId() { return checkinStaffId; }
    public void setCheckinStaffId(String checkinStaffId) { this.checkinStaffId = checkinStaffId; }

    public String getCheckinStaffName() { return checkinStaffName; }
    public void setCheckinStaffName(String checkinStaffName) { this.checkinStaffName = checkinStaffName; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public LocalDateTime getCheckedOutAt() { return checkedOutAt; }
    public void setCheckedOutAt(LocalDateTime checkedOutAt) { this.checkedOutAt = checkedOutAt; }

    public Long getRefundTransactionId() { return refundTransactionId; }
    public void setRefundTransactionId(Long refundTransactionId) { this.refundTransactionId = refundTransactionId; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public BigDecimal getRefundSettlementAmount() { return refundSettlementAmount; }
    public void setRefundSettlementAmount(BigDecimal refundSettlementAmount) { this.refundSettlementAmount = refundSettlementAmount; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public Object getLines() { return lines; }
    public void setLines(Object lines) { this.lines = lines; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
