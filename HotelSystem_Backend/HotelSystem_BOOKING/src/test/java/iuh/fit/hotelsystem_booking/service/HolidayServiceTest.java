package iuh.fit.hotelsystem_booking.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class HolidayServiceTest {

    private final HolidayService holidayService = new HolidayService();

    @Test
    void fixedSolarHolidaysOverlapBookingNights() {
        assertTrue(holidayService.isBookingOverlapHoliday(
                LocalDate.of(2026, 4, 30),
                LocalDate.of(2026, 5, 2)));

        assertTrue(holidayService.isBookingOverlapHoliday(
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 3)));
    }

    @Test
    void tetRangeUsesLunarConversion() {
        assertTrue(holidayService.isBookingOverlapHoliday(
                LocalDate.of(2026, 2, 14),
                LocalDate.of(2026, 2, 15)));

        assertTrue(holidayService.isBookingOverlapHoliday(
                LocalDate.of(2026, 2, 21),
                LocalDate.of(2026, 2, 22)));
    }

    @Test
    void normalDaysDoNotOverlapHoliday() {
        assertFalse(holidayService.isBookingOverlapHoliday(
                LocalDate.of(2026, 6, 10),
                LocalDate.of(2026, 6, 12)));
    }

    @Test
    void ninetyDayWindowGeneratesNextYearWhenNeeded() {
        assertTrue(holidayService.getHolidaysWithin90Days(LocalDate.of(2025, 12, 15))
                .stream()
                .anyMatch(h -> h.start().equals(LocalDate.of(2026, 1, 1))));
    }
}
