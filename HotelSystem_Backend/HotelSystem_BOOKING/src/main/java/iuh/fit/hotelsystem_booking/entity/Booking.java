package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Booking entity — bổ sung đầy đủ fields nghiệp vụ:
 * pricing, payment type, holiday flag, hold expiry, cancel info.
 */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ─── Thông tin cơ bản ───────────────────────────────────────
    private Long roomId;
    private Long userId;

    private LocalDate checkIn;
    private LocalDate checkOut;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private LocalDateTime createdAt;

    private Long primaryGuestId;

    private Boolean preCheckinCompleted;

    private Integer guestCount;

    private Integer roomCapacitySnapshot;

    @Enumerated(EnumType.STRING)
    private RatePlan ratePlan;

    private Integer discountPercent;

    private Boolean refundable;

    private Boolean allowModification;

    // ─── Pricing ────────────────────────────────────────────────
    /** Giá gốc 1 đêm (chưa nhân multiplier) */
    private Double pricePerNight;

    /** Số đêm = checkOut - checkIn */
    private Integer nights;

    /** baseTotal = nights × pricePerNight */
    private Double baseTotal;

    /** 1.0 (bình thường) hoặc 1.3 (ngày lễ) */
    private Double priceMultiplier;

    /** finalTotal = baseTotal × priceMultiplier */
    private Double finalTotal;

    /** Số tiền cọc (depositPercent% của finalTotal) */
    private Double depositAmount;

    /** Số tiền khách đã thực sự thanh toán */
    private Double paidAmount;

    // ─── Payment type ────────────────────────────────────────────
    /** FULL / DEPOSIT / HOTEL */
    private String paymentType;

    /** UNPAID / PAID / DEPOSITED / REFUND_PENDING / REFUNDED / PARTIALLY_REFUNDED / NO_REFUND */
    private String paymentStatus;

    /** Transaction ID from payment service/gateway, used for refund idempotency when available. */
    private String paymentTransactionId;

    // ─── Holiday flag ────────────────────────────────────────────
    /** true nếu booking đụng ít nhất 1 ngày lễ Việt Nam */
    @Column(name = "is_holiday_booking")
    private Boolean isHolidayBooking;

    /** true nếu áp dụng non-refundable policy */
    @Column(name = "non_refundable")
    private Boolean nonRefundable;

    // ─── Hold phòng ──────────────────────────────────────────────
    /** Thời điểm hết hạn hold phòng — sau đây booking tự CANCELLED */
    private LocalDateTime holdExpiresAt;

    // ─── Cancel info ─────────────────────────────────────────────
    private LocalDateTime cancelledAt;
    private String cancellationReason;

    // ─── Check-in / Check-out tracking ────────────────────────────
    /** Thời gian thực tế check-in (lưu vào DB) */
    private LocalDateTime actualCheckInAt;

    /** Thời gian thực tế check-out (lưu vào DB) */
    private LocalDateTime actualCheckOutAt;

    // ─── Cleaning tracking ───────────────────────────────────────
    /** Lúc bắt đầu dọn phòng (tính từ checkout) */
    private LocalDateTime cleaningStartAt;

    /** Lúc dọn xong (calculated = cleaningStartAt + 20 phút) */
    private LocalDateTime cleaningEndAt;

    // ════════════════════════════════════════════════════════════
    // Getters / Setters
    // ════════════════════════════════════════════════════════════

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }

    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getPrimaryGuestId() { return primaryGuestId; }
    public void setPrimaryGuestId(Long primaryGuestId) { this.primaryGuestId = primaryGuestId; }

    public Boolean getPreCheckinCompleted() { return preCheckinCompleted; }
    public void setPreCheckinCompleted(Boolean preCheckinCompleted) { this.preCheckinCompleted = preCheckinCompleted; }

    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }

    public Integer getRoomCapacitySnapshot() { return roomCapacitySnapshot; }
    public void setRoomCapacitySnapshot(Integer roomCapacitySnapshot) { this.roomCapacitySnapshot = roomCapacitySnapshot; }

    public RatePlan getRatePlan() { return ratePlan; }
    public void setRatePlan(RatePlan ratePlan) { this.ratePlan = ratePlan; }

    public Integer getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }

    public Boolean getRefundable() { return refundable; }
    public void setRefundable(Boolean refundable) { this.refundable = refundable; }

    public Boolean getAllowModification() { return allowModification; }
    public void setAllowModification(Boolean allowModification) { this.allowModification = allowModification; }

    public Double getPricePerNight() { return pricePerNight; }
    public void setPricePerNight(Double pricePerNight) { this.pricePerNight = pricePerNight; }

    public Integer getNights() { return nights; }
    public void setNights(Integer nights) { this.nights = nights; }

    public Double getBaseTotal() { return baseTotal; }
    public void setBaseTotal(Double baseTotal) { this.baseTotal = baseTotal; }

    public Double getPriceMultiplier() { return priceMultiplier; }
    public void setPriceMultiplier(Double priceMultiplier) { this.priceMultiplier = priceMultiplier; }

    public Double getFinalTotal() { return finalTotal; }
    public void setFinalTotal(Double finalTotal) { this.finalTotal = finalTotal; }

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

    // ─── Helper ──────────────────────────────────────────────────
    public boolean isHoliday() {
        return Boolean.TRUE.equals(isHolidayBooking);
    }

    public boolean isNonRefundable() {
        return Boolean.TRUE.equals(nonRefundable);
    }
}
