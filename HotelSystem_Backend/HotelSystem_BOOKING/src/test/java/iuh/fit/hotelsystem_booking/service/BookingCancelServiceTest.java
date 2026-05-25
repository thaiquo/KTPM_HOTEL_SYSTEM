package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.Mockito.*;

class BookingCancelServiceTest {

    @Test
    void cancellingTwiceDoesNotCreateSecondRefundRequest() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        RefundService refundService = mock(RefundService.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        BookingCancelService cancelService = new BookingCancelService(
                bookingRepository,
                new CancellationPolicyService(),
                refundService,
                rabbitTemplate);

        Booking booking = new Booking();
        booking.setId(10L);
        booking.setRoomId(20L);
        booking.setUserId(30L);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCheckIn(LocalDate.now().plusDays(5));
        booking.setCheckOut(LocalDate.now().plusDays(7));
        booking.setPaymentType("FULL");
        booking.setPaidAmount(1000000.0);
        booking.setFinalTotal(1000000.0);
        booking.setPricePerNight(500000.0);
        booking.setPriceMultiplier(1.0);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cancelService.cancelBooking(10L, "user requested");
        cancelService.cancelBooking(10L, "user requested again");

        verify(refundService, times(1)).createCancellationRequest(any(Booking.class), any(), anyString());
    }
}
