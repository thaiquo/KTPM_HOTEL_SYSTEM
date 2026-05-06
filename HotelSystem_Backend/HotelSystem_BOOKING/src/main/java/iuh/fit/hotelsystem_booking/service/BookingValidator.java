package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

        if (checkIn.isBefore(today)) {
            throw new IllegalArgumentException("Check-in date cannot be in the past");
        }

        if (checkIn.isAfter(today.plusDays(BookingConstants.MAX_ADVANCE_BOOKING_DAYS))) {
            throw new IllegalArgumentException("Booking cannot be more than "
                    + BookingConstants.MAX_ADVANCE_BOOKING_DAYS + " days in advance");
        }

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights < BookingConstants.MIN_STAY_NIGHTS) {
            throw new IllegalArgumentException("Minimum stay is " + BookingConstants.MIN_STAY_NIGHTS + " night");
        }
        if (nights > BookingConstants.MAX_STAY_NIGHTS) {
            throw new IllegalArgumentException("Maximum stay is " + BookingConstants.MAX_STAY_NIGHTS + " nights");
        }

        LocalDateTime standardCheckoutDateTime = checkOut.atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        if (!LocalDateTime.now().isBefore(standardCheckoutDateTime)) {
            throw new IllegalArgumentException("Booking cannot be created after the standard check-out time");
        }

        if (request.getPricePerNight() == null || request.getPricePerNight() <= 0) {
            throw new IllegalArgumentException("Valid price per night is required");
        }
    }
}
