package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class InvoiceStatusResolver {

    private final BookingRepository bookingRepository;
    private final RefundTransactionRepository refundTransactionRepository;

    public InvoiceStatusResolver(BookingRepository bookingRepository,
                                 RefundTransactionRepository refundTransactionRepository) {
        this.bookingRepository = bookingRepository;
        this.refundTransactionRepository = refundTransactionRepository;
    }

    @Transactional(readOnly = true)
    public String resolve(Long bookingId) {
        if (bookingId == null) {
            return "DRAFT";
        }
        return bookingRepository.findByIdWithItems(bookingId)
                .map(this::resolve)
                .orElse("DRAFT");
    }

    @Transactional(readOnly = true)
    public String resolve(Booking booking) {
        if (booking == null) {
            return "DRAFT";
        }
        if (booking.getStatus() != null && isCancelledStatus(booking.getStatus())) {
            return "CANCELLED";
        }
        List<BookingItem> activeRooms = booking.getItems() == null ? List.of() : booking.getItems().stream()
                .filter(room -> room != null && room.getStatus() != BookingItemStatus.CANCELLED)
                .toList();
        if (activeRooms.isEmpty()) {
            return "DRAFT";
        }

        boolean anyCheckedOut = activeRooms.stream()
                .anyMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT);
        if (!anyCheckedOut) {
            return "DRAFT";
        }

        boolean allCheckedOut = activeRooms.stream()
                .allMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT);
        if (!allCheckedOut) {
            return "PARTIAL";
        }

        RefundState refundState = resolveRefundState(booking.getId());
        if (refundState.pending()) {
            return "PENDING_REFUND";
        }
        if (refundState.completed()) {
            return "REFUNDED";
        }
        return "COMPLETED";
    }

    @Transactional(readOnly = true)
    public RefundState resolveRefundState(Long bookingId) {
        boolean pending = false;
        boolean completed = false;
        if (bookingId == null) {
            return new RefundState(false, false);
        }
        for (RefundTransaction refund : refundTransactionRepository.findByBookingIdOrderByCreatedAtDesc(bookingId)) {
            RefundStatus status = refund.getStatus();
            if (status == null) {
                continue;
            }
            if (status == RefundStatus.PENDING
                    || status == RefundStatus.ASSIGNED
                    || status == RefundStatus.PROCESSING
                    || status == RefundStatus.APPROVED) {
                pending = true;
            }
            if (status == RefundStatus.COMPLETED
                    || status == RefundStatus.REFUNDED
                    || status == RefundStatus.SUCCESS) {
                completed = true;
            }
        }
        return new RefundState(pending, completed);
    }

    public String normalize(String status) {
        if (status == null || status.isBlank()) {
            return "DRAFT";
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if ("PARTIAL_CHECKOUT".equals(normalized) || "PARTIALLY_CHECKED_OUT".equals(normalized)) {
            return "PARTIAL";
        }
        if ("CHECKED_OUT".equals(normalized)) {
            return "COMPLETED";
        }
        if ("REFUND_PENDING".equals(normalized)) {
            return "PENDING_REFUND";
        }
        return normalized;
    }

    private boolean isCancelledStatus(BookingStatus status) {
        return status.name().contains("CANCEL");
    }

    public record RefundState(boolean pending, boolean completed) {
    }
}
