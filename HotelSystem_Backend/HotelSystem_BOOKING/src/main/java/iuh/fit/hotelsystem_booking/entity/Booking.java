package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Booking entity — redesigned to support multiple rooms (BookingItems).
 */
@Entity
@Table(name = "bookings", indexes = {
    @Index(name = "idx_bookings_user_id",       columnList = "userId"),
    @Index(name = "idx_bookings_status",         columnList = "status"),
    @Index(name = "idx_bookings_booking_code",   columnList = "booking_code"),
    @Index(name = "idx_bookings_created_at",     columnList = "createdAt"),
    @Index(name = "idx_bookings_check_in",       columnList = "checkIn"),
    @Index(name = "idx_bookings_check_out",      columnList = "checkOut"),
    @Index(name = "idx_bookings_user_status",    columnList = "userId, status")
})
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Transient
    private Long roomId;

    @Transient
    private Double pricePerNight;

    @Transient
    private Integer nights;

    @Column(name = "booking_code", unique = true)
    private String bookingCode;

    // ─── Relationships ──────────────────────────────────────────
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingItem> items = new ArrayList<>();

    // ─── Thông tin cơ bản ───────────────────────────────────────
    private Long userId;

    private Integer totalRooms;

    private Integer totalGuests;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    private BookingSource source;

    private String createdBy;

    private LocalDate checkIn;
    private LocalDate checkOut;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime confirmedAt;

    private Long primaryGuestId;

    private Boolean preCheckinCompleted;

    private Integer guestCount;

    private LocalDateTime reservationExpiredAt;

    @Enumerated(EnumType.STRING)
    private BookingLockStatus lockStatus;

    @Enumerated(EnumType.STRING)
    private RatePlan ratePlan;

    private Integer discountPercent;

    private Boolean refundable;

    private Boolean allowModification;

    // ─── Pricing ────────────────────────────────────────────────
    /** baseTotal = sum of (nights × priceSnapshot) of all items */
    private Double baseTotal;

    private Double subtotal;

    private Double taxAmount;

    private Double discountTotal;

    /** 1.0 (bình thường) hoặc 1.3 (ngày lễ) hoặc 1.2 (cuối tuần - áp dụng tại item level nếu cần, hoặc đây là multiplier chung) */
    private Double priceMultiplier;

    /** finalTotal = baseTotal × priceMultiplier */
    private Double finalTotal;

    private Double totalPrice;

    private String currency = "VND";

    private Integer priceSnapshotVersion;

    /** Số tiền cọc (depositPercent% của finalTotal) */
    private Double depositAmount;

    /** Số tiền khách đã thực sự thanh toán */
    private Double paidAmount;

    // ─── Payment type ────────────────────────────────────────────
    private String paymentType;

    private String paymentStatus;

    private String paymentTransactionId;

    // ─── Holiday flag ────────────────────────────────────────────
    @Column(name = "is_holiday_booking")
    private Boolean isHolidayBooking;

    @Column(name = "non_refundable")
    private Boolean nonRefundable;

    // ─── Hold phòng ──────────────────────────────────────────────
    private LocalDateTime holdExpiresAt;

    // ─── Cancel info ─────────────────────────────────────────────
    private LocalDateTime cancelledAt;
    private String cancellationReason;

    // ─── Check-in / Check-out tracking ────────────────────────────
    private LocalDateTime actualCheckInAt;
    private LocalDateTime actualCheckOutAt;

    // ─── Cleaning tracking ───────────────────────────────────────
    private LocalDateTime cleaningStartAt;
    private LocalDateTime cleaningEndAt;

    // ════════════════════════════════════════════════════════════
    // Getters / Setters
    // ════════════════════════════════════════════════════════════

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }

    public List<BookingItem> getItems() { return items; }
    public void setItems(List<BookingItem> items) { this.items = items; }
    
    public void addItem(BookingItem item) {
        items.add(item);
        item.setBooking(this);
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getRoomId() {
        if (roomId != null) {
            return roomId;
        }
        if (items != null && !items.isEmpty()) {
            return items.get(0).getRoomId();
        }
        return null;
    }

    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public Double getPricePerNight() {
        if (pricePerNight != null) {
            return pricePerNight;
        }
        if (items != null && !items.isEmpty() && items.get(0).getPriceSnapshot() != null) {
            return items.get(0).getPriceSnapshot();
        }
        return null;
    }

    public void setPricePerNight(Double pricePerNight) { this.pricePerNight = pricePerNight; }

    public Integer getNights() {
        if (nights != null) {
            return nights;
        }
        if (checkIn != null && checkOut != null) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        }
        return null;
    }

    public void setNights(Integer nights) { this.nights = nights; }

    public Integer getTotalRooms() { return totalRooms; }
    public void setTotalRooms(Integer totalRooms) { this.totalRooms = totalRooms; }

    public Integer getTotalGuests() { return totalGuests; }
    public void setTotalGuests(Integer totalGuests) { this.totalGuests = totalGuests; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public BookingSource getSource() { return source; }
    public void setSource(BookingSource source) { this.source = source; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }

    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public Long getPrimaryGuestId() { return primaryGuestId; }
    public void setPrimaryGuestId(Long primaryGuestId) { this.primaryGuestId = primaryGuestId; }

    public Boolean getPreCheckinCompleted() { return preCheckinCompleted; }
    public void setPreCheckinCompleted(Boolean preCheckinCompleted) { this.preCheckinCompleted = preCheckinCompleted; }

    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }

    public LocalDateTime getReservationExpiredAt() { return reservationExpiredAt; }
    public void setReservationExpiredAt(LocalDateTime reservationExpiredAt) { this.reservationExpiredAt = reservationExpiredAt; }

    public BookingLockStatus getLockStatus() { return lockStatus; }
    public void setLockStatus(BookingLockStatus lockStatus) { this.lockStatus = lockStatus; }

    public RatePlan getRatePlan() { return ratePlan; }
    public void setRatePlan(RatePlan ratePlan) { this.ratePlan = ratePlan; }

    public Integer getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }

    public Boolean getRefundable() { return refundable; }
    public void setRefundable(Boolean refundable) { this.refundable = refundable; }

    public Boolean getAllowModification() { return allowModification; }
    public void setAllowModification(Boolean allowModification) { this.allowModification = allowModification; }

    public Double getBaseTotal() { return baseTotal; }
    public void setBaseTotal(Double baseTotal) { this.baseTotal = baseTotal; }

    public Double getSubtotal() { return subtotal != null ? subtotal : baseTotal; }
    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
        this.baseTotal = subtotal;
    }

    public Double getTaxAmount() { return taxAmount; }
    public void setTaxAmount(Double taxAmount) { this.taxAmount = taxAmount; }

    public Double getDiscountTotal() { return discountTotal; }
    public void setDiscountTotal(Double discountTotal) { this.discountTotal = discountTotal; }

    public Double getPriceMultiplier() { return priceMultiplier; }
    public void setPriceMultiplier(Double priceMultiplier) { this.priceMultiplier = priceMultiplier; }

    public Double getFinalTotal() { return finalTotal; }
    public void setFinalTotal(Double finalTotal) {
        this.finalTotal = finalTotal;
        this.totalPrice = finalTotal;
    }

    public Double getTotalPrice() { return totalPrice != null ? totalPrice : finalTotal; }
    public void setTotalPrice(Double totalPrice) {
        this.totalPrice = totalPrice;
        this.finalTotal = totalPrice;
    }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public Integer getPriceSnapshotVersion() { return priceSnapshotVersion; }
    public void setPriceSnapshotVersion(Integer priceSnapshotVersion) { this.priceSnapshotVersion = priceSnapshotVersion; }

    public Double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(Double depositAmount) { this.depositAmount = depositAmount; }

    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public Boolean getIsHolidayBooking() { return isHolidayBooking; }
    public void setIsHolidayBooking(Boolean isHolidayBooking) { this.isHolidayBooking = isHolidayBooking; }

    public Boolean getNonRefundable() { return nonRefundable; }
    public void setNonRefundable(Boolean nonRefundable) { this.nonRefundable = nonRefundable; }

    public LocalDateTime getHoldExpiresAt() { return holdExpiresAt; }
    public void setHoldExpiresAt(LocalDateTime holdExpiresAt) { this.holdExpiresAt = holdExpiresAt; }

    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public LocalDateTime getActualCheckInAt() { return actualCheckInAt; }
    public void setActualCheckInAt(LocalDateTime actualCheckInAt) { this.actualCheckInAt = actualCheckInAt; }

    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }

    public LocalDateTime getCleaningStartAt() { return cleaningStartAt; }
    public void setCleaningStartAt(LocalDateTime cleaningStartAt) { this.cleaningStartAt = cleaningStartAt; }

    public LocalDateTime getCleaningEndAt() { return cleaningEndAt; }
    public void setCleaningEndAt(LocalDateTime cleaningEndAt) { this.cleaningEndAt = cleaningEndAt; }

    public boolean isHoliday() {
        return Boolean.TRUE.equals(isHolidayBooking);
    }

    public boolean isNonRefundable() {
        return Boolean.TRUE.equals(nonRefundable);
    }
}
