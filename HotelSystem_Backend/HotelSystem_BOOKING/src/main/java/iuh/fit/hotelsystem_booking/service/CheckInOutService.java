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
        BigDecimal oneNightPrice = calculateOneNightPrice(booking);
        if (time.isBefore(LocalTime.of(12, 0))) {
            return oneNightPrice.multiply(BigDecimal.valueOf(BookingConstants.EARLY_7_TO_12_FEE_PERCENT))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    .doubleValue();
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
            return actualCheckOutAt.toLocalTime().isBefore(LocalTime.of(BookingConstants.CHECK_OUT_HOUR, 0))
                    ? 0
                    : (int) Math.max(minutes, 1);
        }
        LocalDateTime officialCheckOutAt = booking.getCheckOut().atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        long minutes = ChronoUnit.MINUTES.between(officialCheckOutAt, actualCheckOutAt);
        return actualCheckOutAt.isBefore(officialCheckOutAt) ? 0 : (int) Math.max(minutes, 1);
    }

    public BigDecimal calculateLateCheckoutFee(Booking booking, int lateMinutes) {
        if (lateMinutes <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal oneNightPrice = calculateOneNightPrice(booking);
        BigDecimal percent;
        if (lateMinutes < 120) {
            percent = BigDecimal.valueOf(BookingConstants.LATE_12_TO_14_FEE_PERCENT);
        } else if (lateMinutes < 360) {
            percent = BigDecimal.valueOf(BookingConstants.LATE_14_TO_18_FEE_PERCENT);
        } else {
            percent = BigDecimal.valueOf(BookingConstants.LATE_AFTER_18_FEE_PERCENT);
            int nextDay18hMinutes = 30 * 60;
            if (lateMinutes >= nextDay18hMinutes) {
                int extraDays = ((lateMinutes - nextDay18hMinutes) / (24 * 60)) + 1;
                percent = percent.add(BigDecimal.valueOf(100L * extraDays));
            }
        }
        return oneNightPrice.multiply(percent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateOneNightPrice(Booking booking) {
        BigDecimal multiplier = BigDecimal.valueOf(booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0);
        if (booking.getItems() != null && !booking.getItems().isEmpty()) {
            BigDecimal total = BigDecimal.ZERO;
            for (var item : booking.getItems()) {
                total = total.add(BigDecimal.valueOf(item.getPriceSnapshot() != null ? item.getPriceSnapshot() : 0.0));
            }
            return total.multiply(multiplier);
        }
        return BigDecimal.valueOf(booking.getPricePerNight() != null ? booking.getPricePerNight() : 0.0).multiply(multiplier);
    }
}
