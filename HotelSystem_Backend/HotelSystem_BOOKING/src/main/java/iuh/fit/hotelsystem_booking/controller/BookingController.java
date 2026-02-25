package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/bookings")
//@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }
    // Tạo booking (gửi sang Payment qua Rabbit)
    @PostMapping
    public Booking createBooking(@RequestBody Booking booking) {
        return bookingService.createBooking(booking);
    }

    // Xem booking theo id
    @GetMapping("/{id}")
    public Booking getBooking(@PathVariable Long id) {
        return bookingService.getBooking(id);
    }
}
