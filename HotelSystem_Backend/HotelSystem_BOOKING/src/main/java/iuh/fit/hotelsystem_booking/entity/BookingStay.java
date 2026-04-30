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
    private String representativeCccd;

    private LocalDateTime actualCheckOutAt;
    private Long checkedOutByStaffId;

    private Integer lateCheckoutMinutes;
    private BigDecimal lateCheckoutFee;

    @Enumerated(EnumType.STRING)
    private LateCheckoutPaymentStatus lateCheckoutPaymentStatus;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public LocalDateTime getActualCheckInAt() { return actualCheckInAt; }
    public void setActualCheckInAt(LocalDateTime actualCheckInAt) { this.actualCheckInAt = actualCheckInAt; }

    public Long getCheckedInByStaffId() { return checkedInByStaffId; }
    public void setCheckedInByStaffId(Long checkedInByStaffId) { this.checkedInByStaffId = checkedInByStaffId; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }

    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }

    public Long getCheckedOutByStaffId() { return checkedOutByStaffId; }
    public void setCheckedOutByStaffId(Long checkedOutByStaffId) { this.checkedOutByStaffId = checkedOutByStaffId; }

    public Integer getLateCheckoutMinutes() { return lateCheckoutMinutes; }
    public void setLateCheckoutMinutes(Integer lateCheckoutMinutes) { this.lateCheckoutMinutes = lateCheckoutMinutes; }

    public BigDecimal getLateCheckoutFee() { return lateCheckoutFee; }
    public void setLateCheckoutFee(BigDecimal lateCheckoutFee) { this.lateCheckoutFee = lateCheckoutFee; }

    public LateCheckoutPaymentStatus getLateCheckoutPaymentStatus() { return lateCheckoutPaymentStatus; }
    public void setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus lateCheckoutPaymentStatus) {
        this.lateCheckoutPaymentStatus = lateCheckoutPaymentStatus;
    }
}
