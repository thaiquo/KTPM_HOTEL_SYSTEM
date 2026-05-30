package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "booking_items", indexes = {
    @Index(name = "idx_booking_items_booking_id",    columnList = "booking_id"),
    @Index(name = "idx_booking_items_room_id",       columnList = "roomId"),
    @Index(name = "idx_booking_items_room_type_id",  columnList = "roomTypeId"),
    @Index(name = "idx_booking_items_status",        columnList = "status"),
    @Index(name = "idx_booking_items_check_in",      columnList = "checkIn"),
    @Index(name = "idx_booking_items_check_out",     columnList = "checkOut")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Booking booking;

    private Long roomId;

    private Long roomTypeId;

    /** Snapshots the price at the time of booking to protect against future price changes */
    @Column(name = "price_per_night_at_booking")
    private Double priceSnapshot;

    private Double discount;

    private Double finalPrice;

    @Enumerated(EnumType.STRING)
    private BookingItemStatus status = BookingItemStatus.PENDING_PAYMENT;

    private LocalDate checkIn;
    private LocalDate checkOut;

    private Integer nights;

    private LocalDateTime actualCheckInAt;

    private LocalDateTime actualCheckOutAt;

    private Long representativeGuestId;

    private Long checkedInByStaffId;

    private Long checkedOutByStaffId;

    private BigDecimal roomCharge;

    private BigDecimal serviceCharge;

    private BigDecimal surcharge;

    private BigDecimal damageFee;

    private BigDecimal finalAmount;

    @Column(name = "room_night_lines_json", columnDefinition = "TEXT")
    private String roomNightLinesJson;

    @Transient
    private List<BookingGuest> guests = new ArrayList<>();

    public Double getPricePerNightAtBooking() { return priceSnapshot; }
    public void setPricePerNightAtBooking(Double pricePerNightAtBooking) { this.priceSnapshot = pricePerNightAtBooking; }

    public Long getBookingId() {
        return booking != null ? booking.getId() : null;
    }

    public String getBookingCode() {
        return booking != null ? booking.getBookingCode() : null;
    }

    public String getBookingPaymentStatus() {
        return booking != null ? booking.getPaymentStatus() : null;
    }

    public BookingStatus getBookingStatus() {
        return booking != null ? booking.getStatus() : null;
    }
}
