package iuh.fit.hotelsystem_booking.cqrs.repository;

import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingRefundReadModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRefundReadModelRepository extends JpaRepository<BookingRefundReadModel, Long> {
    List<BookingRefundReadModel> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<BookingRefundReadModel> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
}
