package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class RefundCalculationServiceTest {

    private final RefundCalculationService service = new RefundCalculationService();

    @Test
    void earlyCheckoutOneNightNeverRefundsNegativeOrMoreThanPaid() {
        Booking booking = new Booking();
        booking.setCheckIn(LocalDate.of(2026, 5, 1));
        booking.setCheckOut(LocalDate.of(2026, 5, 2));
        booking.setNights(1);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPricePerNight(1000.0);
        booking.setPriceMultiplier(1.0);
        booking.setPaidAmount(1000.0);

        EarlyCheckoutRefundResult result = service.calculateEarlyCheckoutRefund(
                booking,
                new BookingStay(),
                LocalDateTime.of(2026, 5, 1, 10, 0));

        assertTrue(result.isEarlyCheckout());
        assertEquals(1, result.getUsedNights());
        assertEquals(1, result.getChargeNights());
        assertEquals(0, result.getUnusedNights());
        assertEquals(0, result.getRefundAmount().compareTo(BigDecimal.ZERO));
    }

    @Test
    void flexibleEarlyCheckoutRefundsUnusedNightsAt80PercentWithMinChargeTwoNights() {
        Booking booking = new Booking();
        booking.setCheckIn(LocalDate.of(2026, 5, 1));
        booking.setCheckOut(LocalDate.of(2026, 5, 6));
        booking.setNights(5);
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPricePerNight(1000.0);
        booking.setPriceMultiplier(1.0);
        booking.setPaidAmount(5000.0);

        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 1, 14, 0));

        EarlyCheckoutRefundResult result = service.calculateEarlyCheckoutRefund(
                booking,
                stay,
                LocalDateTime.of(2026, 5, 3, 10, 0));

        assertTrue(result.isEarlyCheckout());
        assertEquals(2, result.getUsedNights());
        assertEquals(2, result.getChargeNights());
        assertEquals(3, result.getUnusedNights());
        assertEquals(new BigDecimal("0.8"), result.getRefundRate());
        assertEquals(new BigDecimal("2400.00"), result.getRefundAmount());
    }

    @Test
    void nonRefundableEarlyCheckoutRefundIsZero() {
        Booking booking = new Booking();
        booking.setCheckIn(LocalDate.of(2026, 5, 1));
        booking.setCheckOut(LocalDate.of(2026, 5, 6));
        booking.setNights(5);
        booking.setRatePlan(RatePlan.NON_REFUNDABLE);
        booking.setNonRefundable(true);
        booking.setPricePerNight(1000.0);
        booking.setPriceMultiplier(1.0);
        booking.setPaidAmount(5000.0);

        EarlyCheckoutRefundResult result = service.calculateEarlyCheckoutRefund(
                booking,
                new BookingStay(),
                LocalDateTime.of(2026, 5, 3, 10, 0));

        assertTrue(result.isEarlyCheckout());
        assertEquals(BigDecimal.ZERO, result.getRefundAmount());
        assertEquals(BigDecimal.ZERO, result.getRefundRate());
    }
}
