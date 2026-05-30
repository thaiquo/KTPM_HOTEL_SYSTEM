package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface BookingInvoiceRepository extends JpaRepository<BookingInvoice, Long>, JpaSpecificationExecutor<BookingInvoice> {
    Optional<BookingInvoice> findByBookingId(Long bookingId);
    Optional<BookingInvoice> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);
    java.util.List<BookingInvoice> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
    java.util.List<BookingInvoice> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BookingInvoice b WHERE b.bookingId = :bookingId ORDER BY b.createdAt DESC")
    Optional<BookingInvoice> findLatestByBookingIdForUpdate(@Param("bookingId") Long bookingId);

}
