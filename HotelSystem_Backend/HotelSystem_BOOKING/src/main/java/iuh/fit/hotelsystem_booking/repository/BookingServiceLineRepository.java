package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingServiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingServiceLineRepository extends JpaRepository<BookingServiceLine, Long> {
    List<BookingServiceLine> findByBookingId(Long bookingId);
}
