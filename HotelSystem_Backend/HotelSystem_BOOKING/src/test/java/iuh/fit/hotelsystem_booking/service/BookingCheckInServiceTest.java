package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BookingCheckInServiceTest {

    @Test
    void depositPaidBookingCanBeCheckedInEvenWhenInvoiceIsPartial() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository bookingStayRepository = mock(BookingStayRepository.class);
        BookingValidator bookingValidator = mock(BookingValidator.class);
        PricingService pricingService = mock(PricingService.class);
        CheckInOutService checkInOutService = mock(CheckInOutService.class);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        CheckoutService checkoutService = mock(CheckoutService.class);
        PaymentServiceClient paymentServiceClient = mock(PaymentServiceClient.class);

        BookingService bookingService = new BookingService(
                bookingRepository,
                bookingStayRepository,
                mock(RabbitTemplate.class),
                bookingValidator,
                pricingService,
                checkInOutService,
                bookingGuestService,
                checkoutService,
                paymentServiceClient,
                mock(iuh.fit.hotelsystem_booking.client.RoomServiceClient.class)
        );

        Booking booking = new Booking();
        booking.setId(1L);
        booking.setRoomId(1L);
        booking.setUserId(42L);
        booking.setCheckIn(LocalDate.now().minusDays(1));
        booking.setCheckOut(LocalDate.now().plusDays(2));
        booking.setStatus(BookingStatus.DEPOSIT_PAID);
        booking.setFinalTotal(2000000.0);
        booking.setDepositAmount(500000.0);
        booking.setPaidAmount(500000.0);

        BookingGuest guest = new BookingGuest();
        guest.setId(10L);
        guest.setFullName("Nguyen Van A");
        guest.setDateOfBirth(LocalDate.of(1990, 1, 1));
        guest.setPrimaryGuest(true);
        guest.setCheckInPerson(true);
        guest.setPhone("0901234567");
        guest.setCccd("123456789012");

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingStayRepository.findByBookingId(1L)).thenReturn(Optional.empty());
        when(checkInOutService.calculateEarlyCheckInFee(any(), any())).thenReturn(0.0);
        when(bookingGuestService.getGuests(1L)).thenReturn(List.of(guest));
        when(bookingGuestService.saveGuests(eq(1L), any())).thenReturn(List.of(guest));

        PaymentStatusResponse paymentStatus = new PaymentStatusResponse();
        paymentStatus.setStatus("PARTIAL");
        paymentStatus.setPaidAmount(500000.0);
        paymentStatus.setRemainingAmount(1500000.0);
        when(paymentServiceClient.getInvoiceStatus(1L)).thenReturn(paymentStatus);

        CheckInRequest request = new CheckInRequest();
        request.setStaffId(123L);
        request.setRepresentativeGuestId(10L);
        request.setRepresentativeCccd("123456789012");
        request.setRepresentativePhone("0901234567");

        assertDoesNotThrow(() -> bookingService.checkIn(1L, request));

        verify(bookingRepository).save(any(Booking.class));
    }
}
