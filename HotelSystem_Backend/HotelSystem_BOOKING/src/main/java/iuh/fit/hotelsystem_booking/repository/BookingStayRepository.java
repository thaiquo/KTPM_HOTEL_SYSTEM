package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingStay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingStayRepository extends JpaRepository<BookingStay, Long> {
    Optional<BookingStay> findByBookingId(Long bookingId);
}
