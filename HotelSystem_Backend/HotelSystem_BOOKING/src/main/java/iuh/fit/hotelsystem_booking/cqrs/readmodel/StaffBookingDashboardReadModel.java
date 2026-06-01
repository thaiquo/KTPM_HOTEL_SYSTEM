package iuh.fit.hotelsystem_booking.cqrs.readmodel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_booking_dashboard_read_model")
public class StaffBookingDashboardReadModel {
    @Id
    @Column(name = "booking_id")
    private Long id;
    private String bookingCode;
    private Long userId;
    private String customerName;
    private String representativeName;
    private String representativePhone;
    private String representativeCccd;
    private String roomIds;
    private Integer totalRooms = 0;
    private Integer totalGuests = 0;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private String status;
    private String paymentStatus;
    private String refundStatus;
    private String ratePlan;
    private String source;
    private Double totalPrice = 0.0;
    private Double finalTotal = 0.0;
    private Double paidAmount = 0.0;
    private Double depositAmount = 0.0;
    private LocalDateTime actualCheckInAt;
    private LocalDateTime actualCheckOutAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getRepresentativeName() { return representativeName; }
    public void setRepresentativeName(String representativeName) { this.representativeName = representativeName; }
    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }
    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }
    public String getRoomIds() { return roomIds; }
    public void setRoomIds(String roomIds) { this.roomIds = roomIds; }
    public Integer getTotalRooms() { return totalRooms; }
    public void setTotalRooms(Integer totalRooms) { this.totalRooms = totalRooms; }
    public Integer getTotalGuests() { return totalGuests; }
    public void setTotalGuests(Integer totalGuests) { this.totalGuests = totalGuests; }
    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }
    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }
    public String getRatePlan() { return ratePlan; }
    public void setRatePlan(String ratePlan) { this.ratePlan = ratePlan; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }
    public Double getFinalTotal() { return finalTotal; }
    public void setFinalTotal(Double finalTotal) { this.finalTotal = finalTotal; }
    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }
    public Double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(Double depositAmount) { this.depositAmount = depositAmount; }
    public LocalDateTime getActualCheckInAt() { return actualCheckInAt; }
    public void setActualCheckInAt(LocalDateTime actualCheckInAt) { this.actualCheckInAt = actualCheckInAt; }
    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
