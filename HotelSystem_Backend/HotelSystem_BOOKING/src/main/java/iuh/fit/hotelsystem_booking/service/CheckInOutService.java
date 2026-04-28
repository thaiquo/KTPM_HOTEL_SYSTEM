package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class CheckInOutService {

    /**
     * Tính toán phí phụ thu check-in sớm.
     */
    public double calculateEarlyCheckInFee(Booking booking, LocalDateTime checkInTime) {
        LocalTime time = checkInTime.toLocalTime();
        double oneNightPrice = booking.getPricePerNight() * (booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0);

        if (time.isBefore(LocalTime.of(6, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_BEFORE_6_FEE_PERCENT / 100.0);
        } else if (time.isBefore(LocalTime.of(10, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_6_TO_10_FEE_PERCENT / 100.0);
        } else if (time.isBefore(LocalTime.of(14, 0))) {
            return oneNightPrice * (BookingConstants.EARLY_10_TO_14_FEE_PERCENT / 100.0);
        }
        
        return 0.0;
    }

    /**
     * Tính toán phí phụ thu check-out trễ.
     */
    public double calculateLateCheckOutFee(Booking booking, LocalDateTime checkOutTime) {
        LocalTime time = checkOutTime.toLocalTime();
        double oneNightPrice = booking.getPricePerNight() * (booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0);

        if (time.isAfter(LocalTime.of(18, 0))) {
            return oneNightPrice * (BookingConstants.LATE_AFTER_18_FEE_PERCENT / 100.0);
        } else if (!time.isBefore(LocalTime.of(14, 0))) {
            return oneNightPrice * (BookingConstants.LATE_14_TO_18_FEE_PERCENT / 100.0);
        } else if (time.isAfter(LocalTime.of(12, 0))) {
            return oneNightPrice * (BookingConstants.LATE_12_TO_14_FEE_PERCENT / 100.0);
        }

        return 0.0;
    }
}
