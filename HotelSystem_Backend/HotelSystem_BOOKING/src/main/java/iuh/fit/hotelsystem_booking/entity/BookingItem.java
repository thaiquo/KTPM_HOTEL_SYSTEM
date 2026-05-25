package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "booking_items")
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
    private BookingItemStatus status = BookingItemStatus.ACTIVE;

    private LocalDate checkIn;
    private LocalDate checkOut;

    private Integer nights;

    public Double getPricePerNightAtBooking() { return priceSnapshot; }
    public void setPricePerNightAtBooking(Double pricePerNightAtBooking) { this.priceSnapshot = pricePerNightAtBooking; }
}
