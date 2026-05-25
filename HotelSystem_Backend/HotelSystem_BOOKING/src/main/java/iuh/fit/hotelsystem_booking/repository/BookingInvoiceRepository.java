package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingInvoiceRepository extends JpaRepository<BookingInvoice, Long> {
    Optional<BookingInvoice> findByBookingId(Long bookingId);
    Optional<BookingInvoice> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);
    java.util.List<BookingInvoice> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
    java.util.List<BookingInvoice> findAllByOrderByCreatedAtDesc();
}
