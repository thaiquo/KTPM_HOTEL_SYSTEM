package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class CancellationPolicyServiceTest {

    private final CancellationPolicyService policyService = new CancellationPolicyService();

    @Test
    void fullCancelBefore24hRefundsAll() {
        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking("FULL", false, false, 1000000, 0),
                LocalDateTime.of(LocalDate.now().plusDays(3), LocalTime.NOON));

        assertEquals("FREE_CANCEL", result.getCancelType());
        assertEquals(0.0, result.getCancellationFee());
        assertEquals(1000000.0, result.getRefundAmount());
    }

    @Test
    void fullCancelWithin24hBefore2hRefunds80Percent() {
        Booking booking = booking("FULL", false, false, 1000000, 0);
        booking.setCheckIn(LocalDate.now().plusDays(1));

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking,
                LocalDateTime.of(booking.getCheckIn(), LocalTime.of(10, 0)));

        assertEquals("PARTIAL_REFUND", result.getCancelType());
        assertEquals(200000.0, result.getCancellationFee());
        assertEquals(800000.0, result.getRefundAmount());
    }

    @Test
    void fullNoShowRefundsZero() {
        Booking booking = booking("FULL", false, false, 1000000, 0);
        booking.setCheckIn(LocalDate.now());

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking,
                LocalDateTime.of(LocalDate.now(), LocalTime.of(15, 0)));

        assertEquals("NO_SHOW", result.getCancelType());
        assertEquals(1000000.0, result.getCancellationFee());
        assertEquals(0.0, result.getRefundAmount());
    }

    @Test
    void depositCancelBefore24hRefundsDeposit() {
        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking("DEPOSIT", false, false, 300000, 300000),
                LocalDateTime.of(LocalDate.now().plusDays(3), LocalTime.NOON));

        assertEquals("FREE_CANCEL", result.getCancelType());
        assertEquals(300000.0, result.getRefundAmount());
    }

    @Test
    void depositCancelWithin24hBefore2hRefunds80PercentOfPaidAmount() {
        Booking booking = booking("DEPOSIT", false, false, 300000, 300000);
        booking.setCheckIn(LocalDate.now().plusDays(1));

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking,
                LocalDateTime.of(booking.getCheckIn(), LocalTime.of(10, 0)));

        assertEquals("PARTIAL_REFUND", result.getCancelType());
        assertEquals(60000.0, result.getCancellationFee());
        assertEquals(240000.0, result.getRefundAmount());
    }

    @Test
    void hotelCancelBefore24hHasNoFee() {
        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking("HOTEL", false, false, 0, 0),
                LocalDateTime.of(LocalDate.now().plusDays(3), LocalTime.NOON));

        assertEquals("FREE_CANCEL", result.getCancelType());
        assertEquals(0.0, result.getCancellationFee());
        assertEquals("NO_REFUND", result.getRefundStatus());
    }

    @Test
    void hotelLateCancelChargesOneNight() {
        Booking booking = booking("HOTEL", false, false, 0, 0);
        booking.setCheckIn(LocalDate.now().plusDays(1));

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking,
                LocalDateTime.of(booking.getCheckIn(), LocalTime.of(10, 0)));

        assertEquals("HOTEL_CHARGE", result.getRefundStatus());
        assertEquals(500000.0, result.getCancellationFee());
    }

    @Test
    void holidayCancelBefore24hRefunds() {
        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking("FULL", true, false, 1300000, 0),
                LocalDateTime.now());

        assertEquals("HOLIDAY", result.getPolicyType());
        assertEquals("FREE_CANCEL", result.getCancelType());
        assertEquals(1300000.0, result.getRefundAmount());
    }

    @Test
    void holidayCancelUnder24hBefore2hRefunds80Percent() {
        Booking booking = booking("FULL", true, false, 1300000, 0);
        booking.setCheckIn(LocalDate.now().plusDays(1));

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking,
                LocalDateTime.of(booking.getCheckIn(), LocalTime.of(10, 0)));

        assertEquals("HOLIDAY", result.getPolicyType());
        assertEquals("PARTIAL_REFUND", result.getCancelType());
        assertEquals(260000.0, result.getCancellationFee());
        assertEquals(1040000.0, result.getRefundAmount());
    }

    @Test
    void nonRefundableCannotBeCancelled() {
        CancellationPolicyResult result = policyService.calculateCancellationPolicy(
                booking("FULL", false, true, 1000000, 0),
                LocalDateTime.now());

        assertFalse(result.isCanCancel());
        assertEquals("NON_REFUNDABLE", result.getPolicyType());
        assertEquals("NOT_ALLOWED", result.getCancelType());
        assertEquals(0.0, result.getRefundAmount());
        assertEquals("NO_REFUND", result.getRefundStatus());
    }

    @Test
    void checkedInBookingCannotBeCancelled() {
        Booking booking = booking("FULL", false, false, 1000000, 0);
        booking.setStatus(BookingStatus.CHECKED_IN);

        CancellationPolicyResult result = policyService.calculateCancellationPolicy(booking, LocalDateTime.now());

        assertFalse(result.isCanCancel());
    }

    private Booking booking(String paymentType, boolean holiday, boolean nonRefundable, double paidAmount, double depositAmount) {
        Booking booking = new Booking();
        booking.setCheckIn(LocalDate.now().plusDays(5));
        booking.setCheckOut(LocalDate.now().plusDays(7));
        booking.setNights(2);
        booking.setPricePerNight(500000.0);
        booking.setPriceMultiplier(holiday ? 1.3 : 1.0);
        booking.setFinalTotal(booking.getNights() * booking.getPricePerNight() * booking.getPriceMultiplier());
        booking.setDepositAmount(depositAmount);
        booking.setPaidAmount(paidAmount);
        booking.setPaymentType(paymentType);
        booking.setIsHolidayBooking(holiday);
        booking.setNonRefundable(nonRefundable);
        booking.setStatus(BookingStatus.CONFIRMED);
        return booking;
    }
}
