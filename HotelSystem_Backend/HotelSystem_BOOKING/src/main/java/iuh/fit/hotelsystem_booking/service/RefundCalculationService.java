package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class RefundCalculationService {

    public EarlyCheckoutRefundResult calculateEarlyCheckoutRefund(Booking booking, BookingStay stay, LocalDateTime actualCheckoutAt) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        if (actualCheckoutAt == null) {
            throw new IllegalArgumentException("actualCheckoutAt must not be null");
        }

        LocalDate plannedCheckout = booking.getCheckOut();
        boolean early = plannedCheckout != null && actualCheckoutAt.toLocalDate().isBefore(plannedCheckout);

        EarlyCheckoutRefundResult result = new EarlyCheckoutRefundResult();
        result.setEarlyCheckout(early);

        int totalNights = resolveTotalNights(booking);
        result.setTotalNights(totalNights);
        BigDecimal nightlyReference = totalNights > 0 ? resolveEffectivePricePerNight(booking, totalNights) : BigDecimal.ZERO;
        result.setEffectivePricePerNight(nightlyReference);

        if (!early || totalNights <= 0) {
            result.setUsedNights(totalNights > 0 ? totalNights : 0);
            result.setChargeNights(totalNights > 0 ? totalNights : 0);
            result.setUnusedNights(0);
            result.setRefundRate(BigDecimal.ZERO);
            result.setRefundAmount(BigDecimal.ZERO);
            return result;
        }

        int usedNights = Math.max(1, resolveUsedNights(booking, stay, actualCheckoutAt));
        int chargeNights = Math.max(usedNights, BookingConstants.EARLY_CHECKOUT_MIN_CHARGE_NIGHTS);
        chargeNights = Math.min(chargeNights, totalNights);
        int unusedNights = Math.max(0, totalNights - chargeNights);

        if (booking.getRatePlan() == RatePlan.NON_REFUNDABLE || booking.isNonRefundable()) {
            result.setUsedNights(usedNights);
            result.setChargeNights(chargeNights);
            result.setUnusedNights(unusedNights);
            result.setRefundRate(BigDecimal.ZERO);
            result.setRefundAmount(BigDecimal.ZERO);
            return result;
        }

        BigDecimal pricePerNight = nightlyReference;
        BigDecimal refundRate = BigDecimal.valueOf(BookingConstants.EARLY_CHECKOUT_REFUND_RATE);
        BigDecimal refundAmount = BigDecimal.valueOf(unusedNights).multiply(pricePerNight).multiply(refundRate)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal paidAmount = BigDecimal.valueOf(valueOrZero(booking.getPaidAmount()));
        if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            refundAmount = BigDecimal.ZERO;
        } else if (refundAmount.compareTo(paidAmount) > 0) {
            refundAmount = paidAmount;
        }

        result.setUsedNights(usedNights);
        result.setChargeNights(chargeNights);
        result.setUnusedNights(unusedNights);
        result.setRefundRate(refundRate);
        result.setRefundAmount(refundAmount);
        return result;
    }

    private int resolveUsedNights(Booking booking, BookingStay stay, LocalDateTime actualCheckoutAt) {
        LocalDate start = booking.getCheckIn();
        if (stay != null && stay.getActualCheckInAt() != null) {
            start = stay.getActualCheckInAt().toLocalDate();
        }
        if (start == null) {
            return 1;
        }
        long days = ChronoUnit.DAYS.between(start, actualCheckoutAt.toLocalDate());
        return (int) Math.max(days, 0);
    }

    private int resolveTotalNights(Booking booking) {
        if (booking.getNights() != null && booking.getNights() > 0) {
            return booking.getNights();
        }
        if (booking.getCheckIn() != null && booking.getCheckOut() != null) {
            long days = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
            return (int) Math.max(days, 0);
        }
        return 0;
    }

    private BigDecimal resolveEffectivePricePerNight(Booking booking, int totalNights) {
        double multiplier = booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0;
        if (booking.getPricePerNight() != null) {
            return BigDecimal.valueOf(booking.getPricePerNight()).multiply(BigDecimal.valueOf(multiplier));
        }
        if (booking.getFinalTotal() != null && totalNights > 0) {
            return BigDecimal.valueOf(booking.getFinalTotal() / totalNights);
        }
        return BigDecimal.ZERO;
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }
}

