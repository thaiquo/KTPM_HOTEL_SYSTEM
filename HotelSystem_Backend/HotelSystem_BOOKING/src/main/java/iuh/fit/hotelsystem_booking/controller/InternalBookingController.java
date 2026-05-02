package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.dto.ConfirmCheckinPaymentRequest;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class InternalBookingController {
    private final BookingService bookingService;

    public InternalBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/{bookingId}/confirm-checkin-payment")
    public ResponseEntity<Booking> confirmCheckinPayment(
            @PathVariable Long bookingId,
            @RequestBody ConfirmCheckinPaymentRequest request) {
        return ResponseEntity.ok(bookingService.confirmCheckinPayment(bookingId, request));
    }
}
