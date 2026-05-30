package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingSaga;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookingSagaRepository extends JpaRepository<BookingSaga, Long> {
    List<BookingSaga> findByBookingId(Long bookingId);
    Optional<BookingSaga> findBySagaTypeAndEventKey(String sagaType, String eventKey);
}
