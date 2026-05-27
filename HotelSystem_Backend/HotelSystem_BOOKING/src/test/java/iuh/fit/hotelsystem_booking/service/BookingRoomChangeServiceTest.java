package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.dto.Room;
import iuh.fit.hotelsystem_booking.dto.RoomChangeRequest;
import iuh.fit.hotelsystem_booking.dto.RoomChangeResponse;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BookingRoomChangeServiceTest {

    @Test
    void changeRoomToMoreExpensiveRoomAddsCheckoutChargeAndOccupiesNewRoom() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository bookingStayRepository = mock(BookingStayRepository.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        BookingServiceLineRepository serviceLineRepository = mock(BookingServiceLineRepository.class);

        BookingService bookingService = new BookingService(
                bookingRepository,
                bookingStayRepository,
                mock(RabbitTemplate.class),
                mock(BookingValidator.class),
                mock(PricingService.class),
                mock(CheckInOutService.class),
                mock(BookingGuestService.class),
                mock(CheckoutService.class),
                mock(PaymentServiceClient.class),
                roomServiceClient,
                serviceLineRepository
        );

        Booking booking = checkedInBooking(1L, 101L, 500000.0);
        Room newRoom = room(202L, "AVAILABLE", 800000.0);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roomServiceClient.getRoomById(202L)).thenReturn(newRoom);
        when(bookingStayRepository.findByBookingId(1L)).thenReturn(Optional.empty());

        RoomChangeRequest request = new RoomChangeRequest();
        request.setFromRoomId(101L);
        request.setToRoomId(202L);
        request.setOldRoomNextStatus("CLEANING");

        RoomChangeResponse response = bookingService.changeRoom(1L, request, 99L);

        assertEquals(202L, booking.getItems().get(0).getRoomId());
        assertEquals("COLLECT", response.getPaymentAction());
        verify(serviceLineRepository).save(any());
        verify(roomServiceClient).updateRoomStatus(eq(101L), any());
        verify(roomServiceClient).updateRoomStatus(eq(202L), any());
    }

    @Test
    void changeRoomToCheaperRoomCreatesRefundRequest() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository bookingStayRepository = mock(BookingStayRepository.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        BookingServiceLineRepository serviceLineRepository = mock(BookingServiceLineRepository.class);
        RefundService refundService = mock(RefundService.class);

        BookingService bookingService = new BookingService(
                bookingRepository,
                bookingStayRepository,
                mock(RabbitTemplate.class),
                mock(BookingValidator.class),
                mock(PricingService.class),
                mock(CheckInOutService.class),
                mock(BookingGuestService.class),
                mock(CheckoutService.class),
                mock(PaymentServiceClient.class),
                roomServiceClient,
                serviceLineRepository
        );
        bookingService.setRefundService(refundService);

        Booking booking = checkedInBooking(2L, 301L, 900000.0);
        Room newRoom = room(302L, "AVAILABLE", 600000.0);
        when(bookingRepository.findById(2L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roomServiceClient.getRoomById(302L)).thenReturn(newRoom);

        RoomChangeRequest request = new RoomChangeRequest();
        request.setFromRoomId(301L);
        request.setToRoomId(302L);

        RoomChangeResponse response = bookingService.changeRoom(2L, request, 99L);

        assertEquals("REFUND", response.getPaymentAction());
        verify(serviceLineRepository, never()).save(any());
        verify(refundService).createRoomChangeRefundTransaction(eq(booking), any(), eq("ROOM_CHANGE_REFUND"));
    }

    private Booking checkedInBooking(Long bookingId, Long roomId, Double price) {
        Booking booking = new Booking();
        booking.setId(bookingId);
        booking.setUserId(10L);
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckIn(LocalDate.now().minusDays(1));
        booking.setCheckOut(LocalDate.now().plusDays(2));
        booking.setPaidAmount(2000000.0);
        booking.setPaymentTransactionId("txn-" + bookingId);
        BookingItem item = new BookingItem();
        item.setBooking(booking);
        item.setRoomId(roomId);
        item.setPriceSnapshot(price);
        item.setStatus(BookingItemStatus.ACTIVE);
        booking.setItems(new ArrayList<>(java.util.List.of(item)));
        return booking;
    }

    private Room room(Long id, String status, Double basePrice) {
        Room.RoomTypeInfo type = new Room.RoomTypeInfo();
        type.setId(id + 1000);
        type.setBasePrice(basePrice);
        Room room = new Room();
        room.setId(id);
        room.setStatus(status);
        room.setRoomType(type);
        return room;
    }
}
