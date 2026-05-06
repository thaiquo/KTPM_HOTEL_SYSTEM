package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_stays", uniqueConstraints = @UniqueConstraint(columnNames = "booking_id"))
public class BookingStay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    private LocalDateTime actualCheckInAt;
    private Long checkedInByStaffId;
    private Long representativeGuestId;
    private String representativeFullName;
    private String representativePhone;
    private String representativeCccd;

    private LocalDateTime actualCheckOutAt;
    private Long checkedOutByStaffId;
    private String earlyCheckoutReason;

    private Integer lateCheckoutMinutes;
    private BigDecimal lateCheckoutFee;

    @Enumerated(EnumType.STRING)
    private LateCheckoutPaymentStatus lateCheckoutPaymentStatus;

    private Integer usedNights;
    private Integer chargeNights;
    private Integer unusedNights;
    private BigDecimal refundRate;
    private BigDecimal refundAmount;

    private Boolean checkoutVerifiedManualOverride;
    private String checkoutVerificationOverrideReason;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public LocalDateTime getActualCheckInAt() { return actualCheckInAt; }
    public void setActualCheckInAt(LocalDateTime actualCheckInAt) { this.actualCheckInAt = actualCheckInAt; }

    public Long getCheckedInByStaffId() { return checkedInByStaffId; }
    public void setCheckedInByStaffId(Long checkedInByStaffId) { this.checkedInByStaffId = checkedInByStaffId; }

    public Long getRepresentativeGuestId() { return representativeGuestId; }
    public void setRepresentativeGuestId(Long representativeGuestId) { this.representativeGuestId = representativeGuestId; }

    public String getRepresentativeFullName() { return representativeFullName; }
    public void setRepresentativeFullName(String representativeFullName) { this.representativeFullName = representativeFullName; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }

    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }

    public Long getCheckedOutByStaffId() { return checkedOutByStaffId; }
    public void setCheckedOutByStaffId(Long checkedOutByStaffId) { this.checkedOutByStaffId = checkedOutByStaffId; }

    public String getEarlyCheckoutReason() { return earlyCheckoutReason; }
    public void setEarlyCheckoutReason(String earlyCheckoutReason) { this.earlyCheckoutReason = earlyCheckoutReason; }

    public Integer getLateCheckoutMinutes() { return lateCheckoutMinutes; }
    public void setLateCheckoutMinutes(Integer lateCheckoutMinutes) { this.lateCheckoutMinutes = lateCheckoutMinutes; }

    public BigDecimal getLateCheckoutFee() { return lateCheckoutFee; }
    public void setLateCheckoutFee(BigDecimal lateCheckoutFee) { this.lateCheckoutFee = lateCheckoutFee; }

    public LateCheckoutPaymentStatus getLateCheckoutPaymentStatus() { return lateCheckoutPaymentStatus; }
    public void setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus lateCheckoutPaymentStatus) {
        this.lateCheckoutPaymentStatus = lateCheckoutPaymentStatus;
    }

    public Integer getUsedNights() { return usedNights; }
    public void setUsedNights(Integer usedNights) { this.usedNights = usedNights; }

    public Integer getChargeNights() { return chargeNights; }
    public void setChargeNights(Integer chargeNights) { this.chargeNights = chargeNights; }

    public Integer getUnusedNights() { return unusedNights; }
    public void setUnusedNights(Integer unusedNights) { this.unusedNights = unusedNights; }

    public BigDecimal getRefundRate() { return refundRate; }
    public void setRefundRate(BigDecimal refundRate) { this.refundRate = refundRate; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public Boolean getCheckoutVerifiedManualOverride() { return checkoutVerifiedManualOverride; }
    public void setCheckoutVerifiedManualOverride(Boolean checkoutVerifiedManualOverride) {
        this.checkoutVerifiedManualOverride = checkoutVerifiedManualOverride;
    }

    public String getCheckoutVerificationOverrideReason() { return checkoutVerificationOverrideReason; }
    public void setCheckoutVerificationOverrideReason(String checkoutVerificationOverrideReason) {
        this.checkoutVerificationOverrideReason = checkoutVerificationOverrideReason;
    }
}
