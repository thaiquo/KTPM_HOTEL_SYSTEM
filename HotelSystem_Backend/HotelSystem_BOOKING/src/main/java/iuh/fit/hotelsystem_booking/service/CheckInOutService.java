package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Service
public class CheckInOutService {

    /**
     * Tính toán phí phụ thu check-in sớm.
     */
    public double calculateEarlyCheckInFee(Booking booking, LocalDateTime checkInTime) {
        LocalTime time = checkInTime.toLocalTime();
        double oneNightPrice = booking.getPricePerNight() * (booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0);

        if (time.isBefore(LocalTime.of(7, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_BEFORE_7_FEE_PERCENT / 100.0);
        } else if (time.isBefore(LocalTime.of(12, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_7_TO_12_FEE_PERCENT / 100.0);
        } else if (time.isBefore(LocalTime.of(14, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_12_TO_14_FEE_PERCENT / 100.0);
        }
        
        return 0.0;
    }

    /**
     * Tính toán phí phụ thu check-out trễ.
     */
    public double calculateLateCheckOutFee(Booking booking, LocalDateTime checkOutTime) {
        int lateMinutes = calculateLateCheckoutMinutes(booking, checkOutTime);
        return calculateLateCheckoutFee(booking, lateMinutes).doubleValue();
    }

    public int calculateLateCheckoutMinutes(Booking booking, LocalDateTime actualCheckOutAt) {
        if (booking.getCheckOut() == null) {
            long minutes = ChronoUnit.MINUTES.between(LocalTime.of(BookingConstants.CHECK_OUT_HOUR, 0), actualCheckOutAt.toLocalTime());
            return (int) Math.max(minutes, 0);
        }
        LocalDateTime officialCheckOutAt = booking.getCheckOut().atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        long minutes = ChronoUnit.MINUTES.between(officialCheckOutAt, actualCheckOutAt);
        return (int) Math.max(minutes, 0);
    }

    public BigDecimal calculateLateCheckoutFee(Booking booking, int lateMinutes) {
        if (lateMinutes < 30) {
            return BigDecimal.ZERO;
        }

        BigDecimal oneNightPrice = BigDecimal.valueOf(booking.getPricePerNight() != null ? booking.getPricePerNight() : 0.0)
                .multiply(BigDecimal.valueOf(booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0));
        BigDecimal percent;
        if (lateMinutes < 120) {
            percent = BigDecimal.valueOf(BookingConstants.LATE_12_TO_14_FEE_PERCENT);
        } else if (lateMinutes <= 360) {
            percent = BigDecimal.valueOf(BookingConstants.LATE_14_TO_18_FEE_PERCENT);
        } else {
            percent = BigDecimal.valueOf(BookingConstants.LATE_AFTER_18_FEE_PERCENT);
        }
        return oneNightPrice.multiply(percent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
