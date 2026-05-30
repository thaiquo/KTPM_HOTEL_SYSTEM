package iuh.fit.hotelsystem_booking.saga;

import iuh.fit.hotelsystem_booking.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingLockStatus;
import iuh.fit.hotelsystem_booking.entity.BookingSaga;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingSagaRepository;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingSagaOrchestratorTest {

    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final OutboxEventRepository outboxEventRepository = mock(OutboxEventRepository.class);
    private final BookingSagaRepository sagaRepository = mock(BookingSagaRepository.class);
    private final BookingSagaOrchestrator orchestrator =
            new BookingSagaOrchestrator(bookingRepository, outboxEventRepository, sagaRepository);

    @Test
    void fullPaymentConfirmsBookingAndMarksRoomsBooked() {
        Booking booking = booking(1L, BookingStatus.PENDING_PAYMENT);
        PaymentResultMessage result = paymentResult(1L, "FULL_PAID", "txn-1", 960000.0, 960000.0);
        when(sagaRepository.findBySagaTypeAndEventKey("BookingPayment", "txn-1")).thenReturn(Optional.empty());
        when(bookingRepository.findByIdWithItemsForUpdate(1L)).thenReturn(Optional.of(booking));

        orchestrator.processPaymentResult(result);

        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        assertEquals("PAID", booking.getPaymentStatus());
        assertEquals(BookingLockStatus.CONFIRMED, booking.getLockStatus());
        assertEquals(BookingItemStatus.BOOKED, booking.getItems().get(0).getStatus());
        assertEquals(960000.0, booking.getPaidAmount());
        assertNotNull(booking.getConfirmedAt());
        verify(outboxEventRepository, times(1)).save(argThat(event ->
                event != null && "room.confirm".equals(event.getType())));
        verify(outboxEventRepository, times(1)).save(argThat(event ->
                event != null && "booking.confirmed".equals(event.getType())));
        verify(bookingRepository).save(booking);
    }

    @Test
    void duplicateTerminalSagaDoesNotReapplyPaymentResult() {
        BookingSaga saga = new BookingSaga();
        saga.setSagaType("BookingPayment");
        saga.setEventKey("txn-1");
        saga.setState("COMPLETED");
        when(sagaRepository.findBySagaTypeAndEventKey("BookingPayment", "txn-1")).thenReturn(Optional.of(saga));

        orchestrator.processPaymentResult(paymentResult(1L, "FULL_PAID", "txn-1", 960000.0, 960000.0));

        verify(bookingRepository, never()).findByIdWithItemsForUpdate(any());
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    void remainingPaymentConfirmsDepositPaidBookingInsteadOfCancellingIt() {
        Booking booking = booking(2L, BookingStatus.DEPOSIT_PAID);
        booking.setPaidAmount(480000.0);
        booking.getItems().get(0).setStatus(BookingItemStatus.BOOKED);
        PaymentResultMessage result = paymentResult(2L, "REMAINING_PAID", "txn-remaining", 480000.0, 960000.0);
        when(sagaRepository.findBySagaTypeAndEventKey("BookingPayment", "txn-remaining")).thenReturn(Optional.empty());
        when(bookingRepository.findByIdWithItemsForUpdate(2L)).thenReturn(Optional.of(booking));

        orchestrator.processPaymentResult(result);

        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        assertEquals("PAID", booking.getPaymentStatus());
        assertEquals(960000.0, booking.getPaidAmount());
        assertEquals(BookingItemStatus.BOOKED, booking.getItems().get(0).getStatus());
        verify(outboxEventRepository, never()).save(argThat(event ->
                event != null && "room.release".equals(event.getType())));
    }

    @Test
    void failedInitialPaymentCompensatesByCancellingAndReleasingRoom() {
        Booking booking = booking(3L, BookingStatus.PENDING_PAYMENT);
        PaymentResultMessage result = paymentResult(3L, "FAILED", "txn-failed", 0.0, 960000.0);
        when(sagaRepository.findBySagaTypeAndEventKey("BookingPayment", "txn-failed")).thenReturn(Optional.empty());
        when(bookingRepository.findByIdWithItemsForUpdate(3L)).thenReturn(Optional.of(booking));

        orchestrator.processPaymentResult(result);

        assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        assertEquals("FAILED", booking.getPaymentStatus());
        assertEquals(BookingLockStatus.EXPIRED, booking.getLockStatus());
        assertEquals(BookingItemStatus.CANCELLED, booking.getItems().get(0).getStatus());
        verify(outboxEventRepository).save(argThat(event ->
                event != null && "room.release".equals(event.getType())));
    }

    private Booking booking(Long id, BookingStatus status) {
        Booking booking = new Booking();
        booking.setId(id);
        booking.setUserId(10L);
        booking.setStatus(status);
        booking.setFinalTotal(960000.0);
        booking.setDepositAmount(480000.0);
        BookingItem item = new BookingItem();
        item.setRoomId(101L);
        item.setStatus(BookingItemStatus.PENDING_PAYMENT);
        booking.addItem(item);
        return booking;
    }

    private PaymentResultMessage paymentResult(Long bookingId, String status, String transactionId,
                                               Double paidAmount, Double totalAmount) {
        PaymentResultMessage result = new PaymentResultMessage();
        result.setBookingId(bookingId);
        result.setUserId(10L);
        result.setStatus(status);
        result.setTransactionId(transactionId);
        result.setPaidAmount(paidAmount);
        result.setTotalAmount(totalAmount);
        return result;
    }
}
