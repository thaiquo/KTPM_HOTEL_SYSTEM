package iuh.fit.hotelsystem_booking.cqrs.controller;

import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingInvoiceReadModel;
import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingRefundReadModel;
import iuh.fit.hotelsystem_booking.cqrs.readmodel.StaffBookingDashboardReadModel;
import iuh.fit.hotelsystem_booking.cqrs.repository.BookingInvoiceReadModelRepository;
import iuh.fit.hotelsystem_booking.cqrs.repository.BookingRefundReadModelRepository;
import iuh.fit.hotelsystem_booking.cqrs.service.StaffBookingDashboardQueryService;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/query")
public class BookingQueryController {

    private final BookingInvoiceReadModelRepository invoiceReadRepository;
    private final BookingRefundReadModelRepository refundReadRepository;
    private final StaffBookingDashboardQueryService staffBookingDashboardQueryService;

    public BookingQueryController(BookingInvoiceReadModelRepository invoiceReadRepository,
                                  BookingRefundReadModelRepository refundReadRepository,
                                  StaffBookingDashboardQueryService staffBookingDashboardQueryService) {
        this.invoiceReadRepository = invoiceReadRepository;
        this.refundReadRepository = refundReadRepository;
        this.staffBookingDashboardQueryService = staffBookingDashboardQueryService;
    }

    @GetMapping("/invoices")
    public Page<BookingInvoiceReadModel> searchInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String invoiceCode,
            @RequestParam(required = false) String bookingCode,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String invoiceStatus,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate) {

        LocalDateTime from = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime to = toDate != null ? toDate.atTime(23, 59, 59) : null;
        Specification<BookingInvoiceReadModel> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (hasText(invoiceCode)) {
                predicates.add(cb.like(cb.lower(root.get("invoiceCode")), contains(invoiceCode)));
            }
            if (hasText(bookingCode)) {
                predicates.add(cb.like(cb.lower(root.get("bookingCode")), contains(bookingCode)));
            }
            if (hasText(customerName)) {
                predicates.add(cb.like(cb.lower(root.get("customerName")), contains(customerName)));
            }
            if (hasText(invoiceStatus)) {
                predicates.add(cb.equal(root.get("invoiceStatus"), invoiceStatus.trim().toUpperCase()));
            }
            if (hasText(paymentStatus)) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus.trim().toUpperCase()));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return invoiceReadRepository.findAll(
                spec,
                PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/refunds/user/{userId}")
    public List<BookingRefundReadModel> getRefundsByUser(@PathVariable Long userId) {
        return refundReadRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/refunds/booking/{bookingId}")
    public List<BookingRefundReadModel> getRefundsByBooking(@PathVariable Long bookingId) {
        return refundReadRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
    }

    @GetMapping("/staff-bookings")
    public Page<StaffBookingDashboardReadModel> searchStaffBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String bookingCode,
            @RequestParam(required = false) String status) {
        BookingStatus bookingStatus = null;
        if (hasText(status)) {
            try {
                bookingStatus = BookingStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        return staffBookingDashboardQueryService.search(page, size, bookingCode, bookingStatus);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String contains(String value) {
        return "%" + value.trim().toLowerCase() + "%";
    }
}
