package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CheckoutServiceTest {

    @Test
    void checkoutOnTimeMarksCompletedAndDoesNotPublishRoomCheckout() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 5, 1), 1, 1000.0);
        booking.setStatus(BookingStatus.CHECKED_IN);

        BookingStay stay = new BookingStay();
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(stay));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-01T04:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(99L);
        CheckoutResponse response = service.checkout(1L, request);

        assertEquals(BookingStatus.COMPLETED.name(), response.getBookingStatus());
        assertEquals(0, response.getLateCheckoutFee().compareTo(BigDecimal.ZERO));
        assertFalse(response.isEarlyCheckout());
        verify(paymentClient, never()).requestLateCheckoutFeePayment(anyLong(), any());
        verify(paymentClient, never()).requestEarlyCheckoutRefund(anyLong(), any());

        verify(rabbitTemplate, never()).convertAndSend(eq(RabbitConfig.EXCHANGE), eq("room.checkout"), any(Object.class));
    }

    @Test
    void flexibleEarlyCheckoutCreatesRefundTransaction() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 6), 5, 1000.0);
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPaidAmount(5000.0);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(new BookingStay()));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-03T03:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(1L);
        request.setEarlyCheckoutReason("family emergency");
        CheckoutResponse response = service.checkout(1L, request);

        assertTrue(response.isEarlyCheckout());
        assertEquals(new BigDecimal("2400.00"), response.getRefundAmount());
        assertEquals(BookingConstants.PAYMENT_STATUS_REFUND_PENDING, booking.getPaymentStatus());
        verify(paymentClient).requestEarlyCheckoutRefund(eq(1L), any());
        verify(paymentClient, never()).requestLateCheckoutFeePayment(anyLong(), any());
    }

    @Test
    void lateCheckoutUsesExistingLateFeeRuleAndRequiresPayment() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 5, 1), 1, 1000.0);
        booking.setStatus(BookingStatus.CHECKED_IN);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(new BookingStay()));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-01T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(1L);
        CheckoutResponse response = service.checkout(1L, request);

        assertEquals(BookingStatus.CHECKOUT_PENDING_PAYMENT.name(), response.getBookingStatus());
        assertEquals(new BigDecimal("200.00"), response.getLateCheckoutFee());
        verify(paymentClient).requestLateCheckoutFeePayment(eq(1L), any());
    }

    @Test
    void calculateCheckoutOnPendingPaymentReturnsSavedLateFee() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 5, 1), 1, 1000.0);
        booking.setStatus(BookingStatus.CHECKOUT_PENDING_PAYMENT);

        BookingStay stay = new BookingStay();
        stay.setBookingId(1L);
        stay.setActualCheckOutAt(LocalDateTime.of(2026, 5, 1, 6, 0));
        stay.setLateCheckoutMinutes(120);
        stay.setLateCheckoutFee(new BigDecimal("200.00"));

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(stay));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-01T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckoutResponse response = service.calculateCheckout(1L);

        assertEquals(BookingStatus.CHECKOUT_PENDING_PAYMENT.name(), response.getBookingStatus());
        assertEquals(new BigDecimal("200.00"), response.getLateCheckoutFee());
        assertTrue(response.isPaymentRequired());
        verify(paymentClient, never()).requestLateCheckoutFeePayment(anyLong(), any());
    }

    @Test
    void calculateCheckoutOnPendingPaymentWithPaidLateFeeReturnsNoPaymentRequired() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 5, 1), 1, 1000.0);
        booking.setStatus(BookingStatus.CHECKOUT_PENDING_PAYMENT);

        BookingStay stay = new BookingStay();
        stay.setBookingId(1L);
        stay.setActualCheckOutAt(LocalDateTime.of(2026, 5, 1, 6, 0));
        stay.setLateCheckoutMinutes(120);
        stay.setLateCheckoutFee(new BigDecimal("200.00"));
        stay.setLateCheckoutPaymentStatus(iuh.fit.hotelsystem_booking.entity.LateCheckoutPaymentStatus.PENDING);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(stay));
        iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse lateStatus = new iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse();
        lateStatus.setStatus("PAID");
        when(paymentClient.getLateCheckoutFeeStatus(1L)).thenReturn(lateStatus);
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-01T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckoutResponse response = service.calculateCheckout(1L);

        assertEquals(BookingStatus.CHECKOUT_PENDING_PAYMENT.name(), response.getBookingStatus());
        assertEquals(new BigDecimal("200.00"), response.getLateCheckoutFee());
        assertFalse(response.isPaymentRequired());
        verify(paymentClient).getLateCheckoutFeeStatus(1L);
    }

    @Test
    void checkoutOnPendingPaymentDoesNotRequestDuplicatePayment() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 5, 1), 1, 1000.0);
        booking.setStatus(BookingStatus.CHECKOUT_PENDING_PAYMENT);

        BookingStay stay = new BookingStay();
        stay.setBookingId(1L);
        stay.setActualCheckOutAt(LocalDateTime.of(2026, 5, 1, 6, 0));
        stay.setLateCheckoutMinutes(120);
        stay.setLateCheckoutFee(new BigDecimal("200.00"));

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(stay));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-01T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(1L);
        CheckoutResponse response = service.checkout(1L, request);

        assertEquals(BookingStatus.CHECKOUT_PENDING_PAYMENT.name(), response.getBookingStatus());
        assertEquals(new BigDecimal("200.00"), response.getLateCheckoutFee());
        verify(paymentClient, never()).requestLateCheckoutFeePayment(anyLong(), any());
    }

    @Test
    void earlyCheckoutBeforePlannedCheckoutDateDoesNotAddLateFee() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 6), 5, 1000.0);
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPaidAmount(5000.0);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(new BookingStay()));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-03T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(1L);
        CheckoutResponse response = service.checkout(1L, request);

        assertTrue(response.isEarlyCheckout());
        assertEquals(new BigDecimal("2400.00"), response.getRefundAmount());
        assertEquals(0, response.getLateCheckoutFee().compareTo(BigDecimal.ZERO));
        verify(paymentClient).requestEarlyCheckoutRefund(eq(1L), any());
        verify(paymentClient, never()).requestLateCheckoutFeePayment(anyLong(), any());
    }

    private Booking booking(LocalDate checkIn, LocalDate checkOut, int nights, double pricePerNight) {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setRoomId(10L);
        booking.setUserId(20L);
        booking.setCheckIn(checkIn);
        booking.setCheckOut(checkOut);
        booking.setNights(nights);
        booking.setPricePerNight(pricePerNight);
        booking.setPriceMultiplier(1.0);
        booking.setFinalTotal(pricePerNight * nights);
        booking.setPaidAmount(pricePerNight * nights);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        return booking;
    }

    @Test
    void checkoutProceedsWhenRepresentativeOnFileStaffDoesNotRetypeVerifier() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingStayRepository stayRepository = mock(BookingStayRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentServiceClient paymentClient = mock(PaymentServiceClient.class);

        Booking booking = booking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 6), 5, 1000.0);
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPaidAmount(5000.0);

        BookingStay stay = new BookingStay();
        stay.setRepresentativeFullName("Nguyen Van B");
        stay.setRepresentativePhone("0909123456");

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(stayRepository.findByBookingId(1L)).thenReturn(Optional.of(stay));
        when(stayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Clock clock = fixedClock("2026-05-03T06:00:00Z");
        ObjectProvider<Clock> clockProvider = mock(ObjectProvider.class);
        when(clockProvider.getIfAvailable()).thenReturn(clock);
        BookingGuestService bookingGuestService = mock(BookingGuestService.class);
        when(bookingGuestService.getGuests(anyLong())).thenReturn(Collections.emptyList());
        CheckInOutScheduledService scheduledService = mock(CheckInOutScheduledService.class);
        RoomServiceClient roomServiceClient = mock(RoomServiceClient.class);
        CheckoutService service = new CheckoutService(
                bookingRepository,
                stayRepository,
                bookingGuestService,
                new CheckInOutService(),
                scheduledService,
                roomServiceClient,
                new RefundCalculationService(),
                rabbitTemplate,
                paymentClient,
                clockProvider
        );

        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(1L);

        CheckoutResponse response = service.checkout(1L, request);
        assertTrue(response.isEarlyCheckout());
        verify(paymentClient).requestEarlyCheckoutRefund(eq(1L), any());
    }

    private Clock fixedClock(String isoInstant) {
        return Clock.fixed(Instant.parse(isoInstant), ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
