package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

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

    // Xem booking theo user
    @GetMapping("/user/{userId}")
    public List<Booking> getBookingsByUser(@PathVariable Long userId) {
        return bookingService.getBookingsByUserId(userId);
    }

    // Lấy danh sách ID phòng đã được đặt trong khoảng thời gian
    @GetMapping("/booked-rooms")
    public List<Long> getBookedRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        return bookingService.getBookedRoomIds(checkIn, checkOut);
    }
}
