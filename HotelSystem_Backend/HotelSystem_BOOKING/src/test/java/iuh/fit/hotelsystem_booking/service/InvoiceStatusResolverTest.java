package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InvoiceStatusResolverTest {

    @Test
    void bookingWithRemainingRoomsIsPartialEvenWhenRefundExists() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        InvoiceStatusResolver resolver = new InvoiceStatusResolver(mock(BookingRepository.class), refundRepository);

        Booking booking = booking(
                room(1L, BookingItemStatus.CHECKED_OUT),
                room(2L, BookingItemStatus.CHECKED_IN));
        when(refundRepository.findByBookingIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(refund(RefundStatus.ASSIGNED)));

        assertEquals("PARTIAL", resolver.resolve(booking));
    }

    @Test
    void allRoomsCheckedOutWithPendingRefundIsPendingRefund() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        InvoiceStatusResolver resolver = new InvoiceStatusResolver(mock(BookingRepository.class), refundRepository);

        Booking booking = booking(
                room(1L, BookingItemStatus.CHECKED_OUT),
                room(2L, BookingItemStatus.CHECKED_OUT));
        when(refundRepository.findByBookingIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(refund(RefundStatus.PROCESSING)));

        assertEquals("PENDING_REFUND", resolver.resolve(booking));
    }

    @Test
    void allRoomsCheckedOutWithCompletedRefundIsRefunded() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        InvoiceStatusResolver resolver = new InvoiceStatusResolver(mock(BookingRepository.class), refundRepository);

        Booking booking = booking(
                room(1L, BookingItemStatus.CHECKED_OUT),
                room(2L, BookingItemStatus.CHECKED_OUT));
        when(refundRepository.findByBookingIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(refund(RefundStatus.REFUNDED)));

        assertEquals("REFUNDED", resolver.resolve(booking));
    }

    @Test
    void allRoomsCheckedOutWithoutRefundIsCompleted() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        InvoiceStatusResolver resolver = new InvoiceStatusResolver(mock(BookingRepository.class), refundRepository);

        Booking booking = booking(room(1L, BookingItemStatus.CHECKED_OUT));
        when(refundRepository.findByBookingIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        assertEquals("COMPLETED", resolver.resolve(booking));
    }

    private Booking booking(BookingItem... rooms) {
        Booking booking = new Booking();
        booking.setId(10L);
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setItems(List.of(rooms));
        for (BookingItem room : rooms) {
            room.setBooking(booking);
        }
        return booking;
    }

    private BookingItem room(Long id, BookingItemStatus status) {
        BookingItem room = new BookingItem();
        room.setId(id);
        room.setStatus(status);
        return room;
    }

    private RefundTransaction refund(RefundStatus status) {
        RefundTransaction refund = new RefundTransaction();
        refund.setBookingId(10L);
        refund.setStatus(status);
        refund.setAmount(1000.0);
        return refund;
    }
}
