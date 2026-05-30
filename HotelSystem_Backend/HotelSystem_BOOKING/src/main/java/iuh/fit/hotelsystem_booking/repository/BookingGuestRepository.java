package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingGuestRepository extends JpaRepository<BookingGuest, Long> {
    List<BookingGuest> findByBookingIdOrderByPrimaryGuestDescIdAsc(Long bookingId);
    List<BookingGuest> findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(Long bookingRoomId);
    Optional<BookingGuest> findByIdAndBookingId(Long id, Long bookingId);
    Optional<BookingGuest> findByIdAndBookingRoomId(Long id, Long bookingRoomId);

    // Added for NewInvoiceService
    List<BookingGuest> findByBookingIdIn(List<Long> bookingIds);

    // Search guests by name or phone (for invoice search filters)
    List<BookingGuest> findByFullNameContainingIgnoreCase(String name);
    List<BookingGuest> findByPhoneContaining(String phone);
}
