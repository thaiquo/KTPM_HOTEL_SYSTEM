package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Component
public class BookingValidator {

    public void validate(Booking request) {
        if (request.getRoomId() == null) {
            throw new IllegalArgumentException("Room ID is required");
        }
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required");
        }
        if (request.getCheckIn() == null || request.getCheckOut() == null) {
            throw new IllegalArgumentException("Check-in and check-out dates are required");
        }

        LocalDate today = LocalDate.now();
        LocalDate checkIn = request.getCheckIn();
        LocalDate checkOut = request.getCheckOut();

        // 1. Không cho đặt quá khứ
        if (checkIn.isBefore(today)) {
            throw new IllegalArgumentException("Check-in date cannot be in the past");
        }

        // 2. Phải trước giờ check-in ít nhất 1 giờ
        // Giờ check-in tiêu chuẩn là 14:00
        LocalDateTime standardCheckInTime = LocalDateTime.of(checkIn, LocalTime.of(BookingConstants.CHECK_IN_HOUR, 0));
        if (LocalDateTime.now().isAfter(standardCheckInTime.minusHours(BookingConstants.MIN_ADVANCE_BOOKING_HOURS))) {
            throw new IllegalArgumentException("Booking must be made at least " + BookingConstants.MIN_ADVANCE_BOOKING_HOURS + " hour before standard check-in time");
        }

        // 3. Không vượt quá 90 ngày
        if (checkIn.isAfter(today.plusDays(BookingConstants.MAX_ADVANCE_BOOKING_DAYS))) {
            throw new IllegalArgumentException("Booking cannot be more than " + BookingConstants.MAX_ADVANCE_BOOKING_DAYS + " days in advance");
        }

        // 4. nights từ 1 -> 14
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights < 1) {
            throw new IllegalArgumentException("Minimum stay is 1 night");
        }
        if (nights > BookingConstants.MAX_STAY_NIGHTS) {
            throw new IllegalArgumentException("Maximum stay is " + BookingConstants.MAX_STAY_NIGHTS + " nights");
        }

        if (request.getPricePerNight() == null || request.getPricePerNight() <= 0) {
            throw new IllegalArgumentException("Valid price per night is required");
        }
    }
}
