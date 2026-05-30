package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Service
public class CheckInOutService {

    /**
     * Tính toán phí phụ thu check-in sớm cho TỪNG PHÒNG.
     */
    public double calculateEarlyCheckInFee(BookingItem item) {
        if (item.getActualCheckInAt() == null || item.getCheckIn() == null) {
            return 0.0;
        }
        
        LocalTime time = item.getActualCheckInAt().toLocalTime();
        // 3. Check-in từ 14:00 trở đi: miễn phí.
        if (!time.isBefore(LocalTime.of(14, 0))) {
            return 0.0;
        }

        BigDecimal oneNightPrice = getFirstNightPrice(item);

        // If check-in at or after 12:00 but before 14:00 -> free
        if (!time.isBefore(LocalTime.of(12, 0))) {
            return 0.0;
        }

        // 07:00 – 12:00 -> 50%
        if (!time.isBefore(LocalTime.of(7, 0))) {
            return oneNightPrice.multiply(BigDecimal.valueOf(BookingConstants.EARLY_7_TO_12_FEE_PERCENT))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        // Before 07:00 -> 100%
        return oneNightPrice.multiply(BigDecimal.valueOf(BookingConstants.EARLY_BEFORE_7_FEE_PERCENT))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private BigDecimal getFirstNightPrice(iuh.fit.hotelsystem_booking.entity.BookingItem item) {
        if (item.getRoomNightLinesJson() != null && !item.getRoomNightLinesJson().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(item.getRoomNightLinesJson());
                if (root.isArray() && root.size() > 0) {
                    return BigDecimal.valueOf(root.get(0).get("price").asDouble());
                }
            } catch (Exception e) {}
        }
        // Fallback
        BigDecimal basePrice = BigDecimal.valueOf(item.getPriceSnapshot() != null ? item.getPriceSnapshot() : 0.0);
        java.time.DayOfWeek day = item.getCheckIn().getDayOfWeek();
        if (day == java.time.DayOfWeek.SATURDAY || day == java.time.DayOfWeek.SUNDAY) {
            basePrice = basePrice.multiply(BigDecimal.valueOf(BookingConstants.WEEKEND_PRICE_MULTIPLIER));
        }
        return basePrice;
    }

    /**
     * Tương thích ngược: tính phí check-in sớm cho toàn booking
     */
    public double calculateEarlyCheckInFee(Booking booking, LocalDateTime checkInTime) {
        double total = 0.0;
        if (booking.getItems() != null && !booking.getItems().isEmpty()) {
            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                LocalDateTime oldActual = item.getActualCheckInAt();
                item.setActualCheckInAt(checkInTime);
                total += calculateEarlyCheckInFee(item);
                item.setActualCheckInAt(oldActual);
            }
            return total;
        }
        // No item-level data: compute based on booking-level pricePerNight (no weekend multiplier)
        if (booking.getPricePerNight() == null) return 0.0;
        BigDecimal oneNightPrice = BigDecimal.valueOf(booking.getPricePerNight());
        LocalTime time = checkInTime.toLocalTime();
        if (!time.isBefore(LocalTime.of(14, 0))) {
            return 0.0;
        }
        if (!time.isBefore(LocalTime.of(12, 0))) {
            return 0.0;
        }
        if (!time.isBefore(LocalTime.of(7, 0))) {
            return oneNightPrice.multiply(BigDecimal.valueOf(BookingConstants.EARLY_7_TO_12_FEE_PERCENT))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }
        return oneNightPrice.multiply(BigDecimal.valueOf(BookingConstants.EARLY_BEFORE_7_FEE_PERCENT))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /**
     * Tính toán phí phụ thu check-out trễ cho TỪNG PHÒNG.
     */
    public double calculateLateCheckOutFee(iuh.fit.hotelsystem_booking.entity.BookingItem item) {
        if (item.getActualCheckOutAt() == null) {
            return 0.0;
        }
        int lateMinutes = calculateLateCheckoutMinutes(item.getCheckOut(), item.getActualCheckOutAt());
        if (lateMinutes <= 0) {
            return 0.0;
        }
        
        // lateCheckoutBaseAmount = roomOriginalAmount + earlyCheckinFee
        double roomOriginalAmount = item.getFinalAmount() != null ? item.getFinalAmount().doubleValue() : (item.getFinalPrice() != null ? item.getFinalPrice() : 0.0);
        double earlyCheckinFee = calculateEarlyCheckInFee(item);
        double baseAmount = roomOriginalAmount + earlyCheckinFee;

        BigDecimal percent;
        if (lateMinutes < 120) {
            // Checkout từ sau 12:00 đến trước 14:00 (dưới 120 phút) -> 20%
            percent = BigDecimal.valueOf(20);
        } else if (lateMinutes < 360) {
            // Checkout từ 14:00 đến trước 18:00 (dưới 360 phút) -> 50%
            percent = BigDecimal.valueOf(50);
        } else {
            // Checkout từ 18:00 đến trước 12:00 hôm sau -> 100%
            percent = BigDecimal.valueOf(100);
            int nextDay18hMinutes = 30 * 60;
            if (lateMinutes >= nextDay18hMinutes) {
                int extraDays = ((lateMinutes - nextDay18hMinutes) / (24 * 60)) + 1;
                percent = percent.add(BigDecimal.valueOf(100L * extraDays));
            }
        }
        
        return BigDecimal.valueOf(baseAmount).multiply(percent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).doubleValue();
    }

    public int calculateLateCheckoutMinutes(java.time.LocalDate checkOutDate, LocalDateTime actualCheckOutAt) {
        if (checkOutDate == null) {
            long minutes = ChronoUnit.MINUTES.between(LocalTime.of(BookingConstants.CHECK_OUT_HOUR, 0), actualCheckOutAt.toLocalTime());
            return actualCheckOutAt.toLocalTime().isBefore(LocalTime.of(BookingConstants.CHECK_OUT_HOUR, 0))
                    ? 0
                    : (int) Math.max(minutes, 1);
        }
        LocalDateTime officialCheckOutAt = checkOutDate.atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        long minutes = ChronoUnit.MINUTES.between(officialCheckOutAt, actualCheckOutAt);
        return actualCheckOutAt.isBefore(officialCheckOutAt) ? 0 : (int) Math.max(minutes, 1);
    }
    
    // Tương thích ngược
    public int calculateLateCheckoutMinutes(Booking booking, LocalDateTime actualCheckOutAt) {
        return calculateLateCheckoutMinutes(booking.getCheckOut(), actualCheckOutAt);
    }

    /**
     * Tương thích ngược: tính phí check-out trễ cho toàn booking
     */
    public double calculateLateCheckOutFee(Booking booking, LocalDateTime checkOutTime) {
        double total = 0.0;
        if (booking.getItems() != null && !booking.getItems().isEmpty()) {
            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                LocalDateTime oldActual = item.getActualCheckOutAt();
                item.setActualCheckOutAt(checkOutTime);
                total += calculateLateCheckOutFee(item);
                item.setActualCheckOutAt(oldActual);
            }
            return total;
        }
        // No item-level data: compute based on booking-level pricePerNight (no weekend shifting)
        iuh.fit.hotelsystem_booking.entity.BookingItem synthetic = new iuh.fit.hotelsystem_booking.entity.BookingItem();
        synthetic.setFinalAmount(BigDecimal.valueOf(booking.getPricePerNight() != null ? booking.getPricePerNight() : 0.0));
        synthetic.setCheckOut(checkOutTime.toLocalDate());
        synthetic.setActualCheckOutAt(checkOutTime);
        return calculateLateCheckOutFee(synthetic);
    }

    /**
     * Legacy method for backward compatibility
     */
    public BigDecimal calculateLateCheckoutFee(Booking booking, int lateMinutes) {
        if (lateMinutes <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal oneNightPrice = calculateOneNightPrice(booking);
        BigDecimal percent;
        if (lateMinutes < 120) {
            percent = BigDecimal.valueOf(20);
        } else if (lateMinutes < 360) {
            percent = BigDecimal.valueOf(50);
        } else {
            percent = BigDecimal.valueOf(100);
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
