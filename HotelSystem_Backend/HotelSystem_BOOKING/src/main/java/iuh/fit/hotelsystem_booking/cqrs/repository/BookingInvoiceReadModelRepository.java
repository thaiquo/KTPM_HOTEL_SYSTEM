package iuh.fit.hotelsystem_booking.cqrs.repository;

import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingInvoiceReadModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BookingInvoiceReadModelRepository extends JpaRepository<BookingInvoiceReadModel, Long>,
        JpaSpecificationExecutor<BookingInvoiceReadModel> {
    Optional<BookingInvoiceReadModel> findByBookingId(Long bookingId);
}
