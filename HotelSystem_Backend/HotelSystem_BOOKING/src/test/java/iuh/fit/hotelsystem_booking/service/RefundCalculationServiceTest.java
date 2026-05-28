package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
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
    void oneNightEarlyCheckout_refundZero() {
        Booking b = baseBooking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 2), 1, 500_000.0);
        b.setRatePlan(RatePlan.FLEXIBLE);
        b.setPaidAmount(500_000.0);
        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 1, 14, 0));
        EarlyCheckoutRefundResult r = service.calculateEarlyCheckoutRefund(b, stay, LocalDateTime.of(2026, 5, 1, 10, 0));
        assertTrue(r.isEarlyCheckout());
        assertEquals(0, r.getUnusedNights());
        assertEquals(0, r.getRefundAmount().compareTo(BigDecimal.ZERO));
    }

    @Test
    void fourteenNightsTwoUsed_flexible_refundTwelveNightsAtEightyPercent() {
        Booking b = baseBooking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 15), 14, 1_000_000.0);
        b.setRatePlan(RatePlan.FLEXIBLE);
        b.setPaidAmount(14_000_000.0);
        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 1, 14, 0));
        EarlyCheckoutRefundResult r = service.calculateEarlyCheckoutRefund(b, stay, LocalDateTime.of(2026, 5, 3, 10, 0));
        assertEquals(14, r.getTotalNights());
        assertEquals(2, r.getUsedNights());
        assertEquals(2, r.getChargeNights());
        assertEquals(12, r.getUnusedNights());
        BigDecimal expected = BigDecimal.valueOf(12)
                .multiply(BigDecimal.valueOf(1_000_000))
                .multiply(BigDecimal.valueOf(BookingConstants.EARLY_CHECKOUT_REFUND_RATE));
        assertEquals(0, r.getRefundAmount().compareTo(expected.setScale(2, java.math.RoundingMode.HALF_UP)));
    }

    @Test
    void twoNightsOneUsed_flexible_refundUnusedNightAtEightyPercent() {
        Booking b = baseBooking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3), 2, 1_000_000.0);
        b.setRatePlan(RatePlan.FLEXIBLE);
        b.setPaidAmount(2_000_000.0);
        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 1, 14, 0));

        EarlyCheckoutRefundResult r = service.calculateEarlyCheckoutRefund(b, stay, LocalDateTime.of(2026, 5, 2, 10, 0));

        assertTrue(r.isEarlyCheckout());
        assertEquals(2, r.getTotalNights());
        assertEquals(1, r.getUsedNights());
        assertEquals(1, r.getChargeNights());
        assertEquals(1, r.getUnusedNights());
        assertEquals(0, r.getRefundAmount().compareTo(new BigDecimal("800000.00")));
    }

    @Test
    void twoRoomsTwoNightsOneUsed_refundsAllUnusedRoomNights() {
        Booking b = baseBooking(LocalDate.of(2026, 5, 27), LocalDate.of(2026, 5, 29), 2, 800_000.0);
        b.setRatePlan(RatePlan.FLEXIBLE);
        b.setPaidAmount(3_200_000.0);
        b.addItem(item(202L, LocalDate.of(2026, 5, 27), LocalDate.of(2026, 5, 29), 2, 800_000.0));
        b.addItem(item(301L, LocalDate.of(2026, 5, 27), LocalDate.of(2026, 5, 29), 2, 800_000.0));
        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 27, 14, 0));

        EarlyCheckoutRefundResult r = service.calculateEarlyCheckoutRefund(b, stay, LocalDateTime.of(2026, 5, 28, 10, 0));

        assertTrue(r.isEarlyCheckout());
        assertEquals(1, r.getUnusedNights());
        assertEquals(0, r.getRefundAmount().compareTo(new BigDecimal("1280000.00")));
    }

    @Test
    void nonRefundable_alwaysZeroRefund() {
        Booking b = baseBooking(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 15), 14, 1_000_000.0);
        b.setRatePlan(RatePlan.NON_REFUNDABLE);
        b.setNonRefundable(true);
        b.setPaidAmount(14_000_000.0);
        BookingStay stay = new BookingStay();
        stay.setActualCheckInAt(LocalDateTime.of(2026, 5, 1, 14, 0));
        EarlyCheckoutRefundResult r = service.calculateEarlyCheckoutRefund(b, stay, LocalDateTime.of(2026, 5, 3, 10, 0));
        assertTrue(r.isEarlyCheckout());
        assertEquals(0, r.getRefundAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, r.getRefundRate().compareTo(BigDecimal.ZERO));
    }

    private static Booking baseBooking(LocalDate in, LocalDate out, int nights, double ppn) {
        Booking booking = new Booking();
        booking.setCheckIn(in);
        booking.setCheckOut(out);
        booking.setNights(nights);
        booking.setPricePerNight(ppn);
        booking.setPriceMultiplier(1.0);
        booking.setFinalTotal(ppn * nights);
        return booking;
    }

    private static BookingItem item(Long roomId, LocalDate in, LocalDate out, int nights, double price) {
        BookingItem item = new BookingItem();
        item.setRoomId(roomId);
        item.setCheckIn(in);
        item.setCheckOut(out);
        item.setNights(nights);
        item.setPriceSnapshot(price);
        return item;
    }
}
