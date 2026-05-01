package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.BookingModificationRequest;
import iuh.fit.hotelsystem_booking.dto.PricingResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BookingModificationServiceTest {

    @Test
    void flexibleBookingCanBeModified() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository bookingStayRepository = mock(BookingStayRepository.class);
        PricingService pricingService = mock(PricingService.class);
        BookingService bookingService = new BookingService(
                bookingRepository,
                bookingStayRepository,
                mock(RabbitTemplate.class),
                mock(BookingValidator.class),
                pricingService,
                mock(CheckInOutService.class),
                mock(BookingGuestService.class),
                mock(CheckoutService.class));

        Booking booking = booking(RatePlan.FLEXIBLE, true);
        PricingResult pricing = new PricingResult();
        pricing.setNights(3);
        pricing.setBaseTotal(1500000);
        pricing.setPriceMultiplier(1.0);
        pricing.setFinalTotal(1500000);
        pricing.setDepositAmount(750000);
        pricing.setDiscountPercent(0);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(pricingService.calculatePrice(any(), any(), anyDouble(), eq(RatePlan.FLEXIBLE))).thenReturn(pricing);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingModificationRequest request = new BookingModificationRequest();
        request.setCheckIn(LocalDate.of(2026, 6, 10));
        request.setCheckOut(LocalDate.of(2026, 6, 13));
        request.setPricePerNight(500000.0);

        Booking result = bookingService.modifyBooking(1L, request);

        assertEquals(3, result.getNights());
        assertEquals(1500000.0, result.getFinalTotal());
    }

    @Test
    void nonRefundableBookingCannotBeModified() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository bookingStayRepository = mock(BookingStayRepository.class);
        BookingService bookingService = new BookingService(
                bookingRepository,
                bookingStayRepository,
                mock(RabbitTemplate.class),
                mock(BookingValidator.class),
                mock(PricingService.class),
                mock(CheckInOutService.class),
                mock(BookingGuestService.class),
                mock(CheckoutService.class));

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking(RatePlan.NON_REFUNDABLE, false)));

        BookingModificationRequest request = new BookingModificationRequest();
        request.setCheckIn(LocalDate.of(2026, 6, 10));
        request.setCheckOut(LocalDate.of(2026, 6, 13));

        assertThrows(IllegalStateException.class, () -> bookingService.modifyBooking(1L, request));
    }

    private Booking booking(RatePlan ratePlan, boolean allowModification) {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setRatePlan(ratePlan);
        booking.setAllowModification(allowModification);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPricePerNight(500000.0);
        return booking;
    }
}
