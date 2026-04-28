package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.PricingResult;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class PricingServiceTest {

    private final PricingService pricingService = new PricingService(new HolidayService(), new RatePlanService());

    @Test
    void normalPricing() {
        PricingResult result = pricingService.calculatePrice(
                LocalDate.of(2026, 6, 10),
                LocalDate.of(2026, 6, 12),
                500000);

        assertEquals(2, result.getNights());
        assertFalse(result.isHolidayBooking());
        assertEquals("NORMAL", result.getAppliedRule());
        assertEquals(1000000, result.getBaseTotal());
        assertEquals(1.0, result.getPriceMultiplier());
        assertEquals(1000000, result.getFinalTotal());
        assertEquals(50, result.getDepositPercent());
        assertEquals(500000, result.getDepositAmount());
    }

    @Test
    void fixedSolarHolidayPricingAppliesToWholeBooking() {
        PricingResult result = pricingService.calculatePrice(
                LocalDate.of(2026, 4, 30),
                LocalDate.of(2026, 5, 2),
                500000);

        assertEquals(2, result.getNights());
        assertTrue(result.isHolidayBooking());
        assertEquals("HOLIDAY", result.getAppliedRule());
        assertEquals(1000000, result.getBaseTotal());
        assertEquals(1.3, result.getPriceMultiplier());
        assertEquals(1300000, result.getFinalTotal());
        assertEquals(50, result.getDepositPercent());
        assertEquals(650000, result.getDepositAmount());
    }

    @Test
    void lunarTetPricingAppliesHolidayRules() {
        PricingResult result = pricingService.calculatePrice(
                LocalDate.of(2026, 2, 16),
                LocalDate.of(2026, 2, 18),
                500000);

        assertTrue(result.isHolidayBooking());
        assertEquals("HOLIDAY", result.getAppliedRule());
        assertEquals(1300000, result.getFinalTotal());
    }

    @Test
    void bookingAcrossNewYearOverlapsFixedHoliday() {
        PricingResult result = pricingService.calculatePrice(
                LocalDate.of(2025, 12, 31),
                LocalDate.of(2026, 1, 2),
                500000);

        assertTrue(result.isHolidayBooking());
        assertEquals("HOLIDAY", result.getAppliedRule());
    }

    @Test
    void holidayStayShorterThanMinimumIsRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> pricingService.calculatePrice(
                        LocalDate.of(2026, 4, 30),
                        LocalDate.of(2026, 5, 1),
                        500000));

        assertTrue(ex.getMessage().contains("Minimum stay"));
    }

    @Test
    void nonRefundablePricingAppliesDiscountAndFullPayment() {
        PricingResult result = pricingService.calculatePrice(
                LocalDate.of(2026, 6, 10),
                LocalDate.of(2026, 6, 12),
                500000,
                RatePlan.NON_REFUNDABLE);

        assertEquals("NON_REFUNDABLE", result.getRatePlan());
        assertEquals(10, result.getDiscountPercent());
        assertEquals(900000, result.getFinalTotal());
        assertEquals(900000, result.getDepositAmount());
        assertFalse(result.isRefundable());
        assertEquals("FULL", result.getPaymentType());
    }
}
