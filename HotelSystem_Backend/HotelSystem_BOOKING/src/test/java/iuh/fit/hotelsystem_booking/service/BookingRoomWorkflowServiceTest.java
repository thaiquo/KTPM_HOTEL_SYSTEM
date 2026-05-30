package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.dto.BookingRoomActionResult;
import iuh.fit.hotelsystem_booking.dto.BookingRoomBatchRequest;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingItemRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingRoomWorkflowServiceTest {

    @Test
    void checkOutMultipleRoomsSavesInvoiceAndUpdatesRooms() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        BookingItem item201 = item(1L, booking, 201L);
        BookingItem item302 = item(2L, booking, 302L);
        booking.setItems(List.of(item201, item302));

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(item201));
        when(bookingItemRepository.findByIdWithBooking(2L)).thenReturn(Optional.of(item302));
        when(bookingItemRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingServiceLineRepository.findByBookingId(1L)).thenReturn(List.of());
        when(refundTransactionRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(1L, "EARLY_CHECKOUT_REFUND"))
                .thenReturn(Optional.empty());
        when(bookingInvoiceService.findLatestInvoice(1L)).thenReturn(Optional.empty());
        when(bookingCheckoutBillingService.buildInvoicePayload(anyLong(), any())).thenReturn(Map.of("grandTotal", BigDecimal.valueOf(3200000)));
        when(bookingInvoiceService.saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap())).thenAnswer(inv -> {
            BookingInvoice invoice = new BookingInvoice();
            invoice.setId(99L);
            invoice.setBookingId(1L);
            return invoice;
        });

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L, 2L));
        request.setStaffId(10L);

        var result = service.checkOutRooms(1L, request, 10L);

        assertEquals(2, result.getRooms().size());
        assertTrueAllCheckedOut(result.getRooms());
        assertEquals(99L, result.getInvoiceId());
        assertEquals("INV-99", result.getInvoiceCode());
        assertFalse(result.getErrors().size() > 0);
        verify(bookingInvoiceService, atLeastOnce()).saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap());
        verify(bookingItemRepository, atLeastOnce()).saveAndFlush(any());
        verify(bookingRepository, atLeastOnce()).saveAndFlush(any());
    }

    @Test
    void checkOutMultipleRoomsFailsWhenInvoiceSaveFails() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        BookingItem item201 = item(1L, booking, 201L);
        BookingItem item302 = item(2L, booking, 302L);
        booking.setItems(List.of(item201, item302));

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(item201));
        when(bookingItemRepository.findByIdWithBooking(2L)).thenReturn(Optional.of(item302));
        when(bookingItemRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingServiceLineRepository.findByBookingId(1L)).thenReturn(List.of());
        when(refundTransactionRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(1L, "EARLY_CHECKOUT_REFUND"))
                .thenReturn(Optional.empty());
        when(bookingInvoiceService.findLatestInvoice(1L)).thenReturn(Optional.empty());
        when(bookingCheckoutBillingService.buildInvoicePayload(anyLong(), any())).thenReturn(Map.of("grandTotal", BigDecimal.valueOf(3200000)));
        when(bookingInvoiceService.saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap()))
                .thenThrow(new IllegalStateException("duplicate invoice"));

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L, 2L));
        request.setStaffId(10L);

        assertThrows(IllegalStateException.class, () -> service.checkOutRooms(1L, request, 10L));
    }

    @Test
    void checkOutMultipleRoomsRejectsRoomFromDifferentBooking() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        Booking otherBooking = new Booking();
        otherBooking.setId(2L);
        BookingItem otherBookingRoom = item(1L, otherBooking, 201L);
        booking.setItems(List.of());

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(otherBookingRoom));
        when(bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L));
        request.setStaffId(10L);

        assertThrows(IllegalArgumentException.class, () -> service.checkOutRooms(1L, request, 10L));
        verify(bookingInvoiceService, never()).saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap());
    }

    @Test
    void checkOutMultipleRoomsRejectsAlreadyCheckedOutRoomWith409StyleError() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        BookingItem checkedOut = item(1L, booking, 201L);
        checkedOut.setStatus(BookingItemStatus.CHECKED_OUT);
        booking.setItems(List.of(checkedOut));

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(checkedOut));

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L));
        request.setStaffId(10L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.checkOutRooms(1L, request, 10L));
        assertTrue(ex.getMessage().contains("already checked out"));
        verify(bookingInvoiceService, never()).saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap());
    }

    @Test
    void checkOutMultipleRoomsDoesNotFailWhenRoomStatusPublishFails() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        BookingItem item201 = item(1L, booking, 201L);
        booking.setItems(List.of(item201));

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(item201));
        when(bookingItemRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingServiceLineRepository.findByBookingId(1L)).thenReturn(List.of());
        when(refundTransactionRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(1L, "EARLY_CHECKOUT_REFUND"))
                .thenReturn(Optional.empty());
        when(bookingInvoiceService.findLatestInvoice(1L)).thenReturn(Optional.empty());
        when(bookingCheckoutBillingService.buildInvoicePayload(anyLong(), any())).thenReturn(Map.of("grandTotal", BigDecimal.valueOf(1600000)));
        when(bookingInvoiceService.saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap())).thenAnswer(inv -> {
            BookingInvoice invoice = new BookingInvoice();
            invoice.setId(100L);
            invoice.setBookingId(1L);
            return invoice;
        });
        doThrow(new RuntimeException("rabbit unavailable")).when(rabbitTemplate)
            .convertAndSend(anyString(), anyString(), org.mockito.ArgumentMatchers.<Object>any());

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L));
        request.setStaffId(10L);

        BookingRoomActionResult result = service.checkOutRooms(1L, request, 10L);
        assertTrue(result.isSuccess());
        assertEquals(100L, result.getInvoiceId());
        verify(bookingInvoiceService, atLeastOnce()).saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap());
    }

    @Test
    void checkOutMultipleRoomsUpdatesExistingInvoiceSnapshot() {
        BookingItemRepository bookingItemRepository = mock(BookingItemRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingGuestRepository bookingGuestRepository = mock(BookingGuestRepository.class);
        BookingInvoiceService bookingInvoiceService = mock(BookingInvoiceService.class);
        BookingCheckoutBillingService bookingCheckoutBillingService = mock(BookingCheckoutBillingService.class);
        BookingServiceLineRepository bookingServiceLineRepository = mock(BookingServiceLineRepository.class);
        RefundCalculationService refundCalculationService = new RefundCalculationService();
        RefundTransactionRepository refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);

        Booking booking = booking();
        BookingItem item201 = item(1L, booking, 201L);
        booking.setItems(List.of(item201));

        BookingInvoiceDto existing = new BookingInvoiceDto();
        existing.setId(55L);
        existing.setBookingId(1L);
        existing.setAmount(BigDecimal.valueOf(123));

        when(bookingRepository.findByIdWithItems(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingItemRepository.findByIdWithBooking(1L)).thenReturn(Optional.of(item201));
        when(bookingItemRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(anyLong())).thenReturn(List.of());
        when(bookingServiceLineRepository.findByBookingId(1L)).thenReturn(List.of());
        when(refundTransactionRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(1L, "EARLY_CHECKOUT_REFUND"))
                .thenReturn(Optional.empty());
        when(bookingInvoiceService.findLatestInvoice(1L)).thenReturn(Optional.of(existing));
        when(bookingCheckoutBillingService.buildInvoicePayload(anyLong(), any())).thenReturn(Map.of("grandTotal", BigDecimal.valueOf(123)));
        when(bookingInvoiceService.saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap())).thenAnswer(inv -> {
            BookingInvoice invoice = new BookingInvoice();
            invoice.setId(55L);
            invoice.setBookingId(1L);
            return invoice;
        });

        BookingRoomWorkflowService service = new BookingRoomWorkflowService(
                bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                rabbitTemplate,
                roomServiceClient
        );

        BookingRoomBatchRequest request = new BookingRoomBatchRequest();
        request.setBookingRoomIds(List.of(1L));
        request.setStaffId(10L);

        BookingRoomActionResult result = service.checkOutRooms(1L, request, 10L);
        assertTrue(result.isSuccess());
        assertEquals(55L, result.getInvoiceId());
        verify(bookingInvoiceService, atLeastOnce()).saveCheckoutInvoice(anyLong(), any(), anyString(), anyMap());
    }

    private Booking booking() {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setUserId(10L);
        booking.setBookingCode("BK-1");
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckIn(LocalDate.now().minusDays(2));
        booking.setCheckOut(LocalDate.now().plusDays(3));
        booking.setPaidAmount(3200000.0);
        booking.setFinalTotal(3200000.0);
        booking.setCurrency("VND");
        return booking;
    }

    private BookingItem item(Long id, Booking booking, Long roomId) {
        BookingItem item = new BookingItem();
        item.setId(id);
        item.setBooking(booking);
        item.setRoomId(roomId);
        item.setStatus(BookingItemStatus.CHECKED_IN);
        item.setCheckIn(LocalDate.now().minusDays(2));
        item.setCheckOut(LocalDate.now().plusDays(3));
        item.setNights(5);
        item.setPriceSnapshot(1600000.0);
        return item;
    }

    private void assertTrueAllCheckedOut(List<BookingItem> rooms) {
        for (BookingItem room : rooms) {
            assertNotNull(room);
            assertEquals(BookingItemStatus.CHECKED_OUT, room.getStatus());
        }
    }
}