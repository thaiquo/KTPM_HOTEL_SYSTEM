package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    public BookingService(BookingRepository bookingRepository,
                          RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    // ===============================
    // CREATE BOOKING
    // ===============================
    public Booking createBooking(Booking booking) {

        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(booking);

        // Gửi HOLD ROOM
        RoomMessage msg = new RoomMessage();
        msg.setBookingId(saved.getId());
        msg.setRoomId(saved.getRoomId());

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "room.hold",
                msg
        );

        return saved;
    }

    // ===============================
    // GET BOOKING
    // ===============================
    public Booking getBooking(Long id) {
        return bookingRepository.findById(id).orElseThrow();
    }
}