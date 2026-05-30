package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.Booking;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CheckInOutServiceTest {

    private final CheckInOutService checkInOutService = new CheckInOutService();

    @Test
    void earlyCheckinBefore12ChargesHalfNight() {
        Booking booking = booking();

        double fee = checkInOutService.calculateEarlyCheckInFee(booking, checkinAt(6, 59));

        assertEquals(1000000.0, fee);
    }

    @Test
    void earlyCheckinBefore7ChargesFullNight() {
        Booking booking = booking();

        double fee = checkInOutService.calculateEarlyCheckInFee(booking, checkinAt(6, 0));

        assertEquals(1000000.0, fee);
    }

    @Test
    void earlyCheckinFrom7To12ChargesHalfNight() {
        Booking booking = booking();

        double fee = checkInOutService.calculateEarlyCheckInFee(booking, checkinAt(7, 0));

        assertEquals(500000.0, fee);
    }

    @Test
    void earlyCheckinFrom12To14IsFree() {
        Booking booking = booking();

        double fee = checkInOutService.calculateEarlyCheckInFee(booking, checkinAt(12, 0));

        assertEquals(0.0, fee);
    }

    @Test
    void checkoutBefore12IsFree() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(11, 45));

        assertEquals(0.0, fee);
    }

    @Test
    void lateCheckoutAt12Charges20Percent() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(12, 0));

        assertEquals(200000.0, fee);
    }

    @Test
    void lateCheckoutWithinFirst30MinutesAfter12Charges20Percent() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(12, 15));

        assertEquals(200000.0, fee);
    }

    @Test
    void lateCheckoutAfter12Before14Charges20Percent() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(13, 0));

        assertEquals(200000.0, fee);
    }

    @Test
    void lateCheckoutAt14Charges50Percent() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(14, 0));

        assertEquals(500000.0, fee);
    }

    @Test
    void lateCheckoutAt18ChargesOneNight() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(18, 0));

        assertEquals(1000000.0, fee);
    }

    @Test
    void lateCheckoutAfter18ChargesOneNight() {
        double fee = checkInOutService.calculateLateCheckOutFee(booking(), checkoutAt(18, 1));

        assertEquals(1000000.0, fee);
    }

    private Booking booking() {
        Booking booking = new Booking();
        booking.setPricePerNight(1000000.0);
        booking.setPriceMultiplier(1.0);
        return booking;
    }

    private LocalDateTime checkoutAt(int hour, int minute) {
        return LocalDateTime.of(LocalDate.now(), LocalTime.of(hour, minute));
    }

    private LocalDateTime checkinAt(int hour, int minute) {
        return LocalDateTime.of(LocalDate.now(), LocalTime.of(hour, minute));
    }
}
