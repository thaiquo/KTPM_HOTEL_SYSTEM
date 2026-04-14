package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.client.RoomClient;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;
    private final RoomClient roomClient;
    private final RetryTemplate roomServiceRetryTemplate;

    private final long bookingHoldTtlSeconds;

    private final int roomRetryMaxAttempts;
    private final long roomRetryBackoffMs;

    public BookingService(BookingRepository bookingRepository,
                          RabbitTemplate rabbitTemplate,
                          RoomClient roomClient,
                          RetryTemplate roomServiceRetryTemplate,
                          @Value("${room.service.retry.max-attempts:3}") int roomRetryMaxAttempts,
                          @Value("${room.service.retry.backoff-ms:1000}") long roomRetryBackoffMs,
                          @Value("${booking.hold.ttl-seconds:360}") long bookingHoldTtlSeconds
    ) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.roomClient = roomClient;
        this.roomServiceRetryTemplate = roomServiceRetryTemplate;
        this.roomRetryMaxAttempts = roomRetryMaxAttempts;
        this.roomRetryBackoffMs = roomRetryBackoffMs;
        this.bookingHoldTtlSeconds = bookingHoldTtlSeconds;
    }

    // ===============================
    // CREATE BOOKING
    // ===============================
    @Transactional
    public Booking createBooking(Booking booking) {

        if (booking.getRoomId() == null) {
            throw new IllegalArgumentException("roomId is required");
        }

        // Serialize booking creation per roomId to prevent two fast requests
        // from creating multiple PENDING rows before the async HOLD is processed.
        Boolean locked = bookingRepository.tryLockRoom(booking.getRoomId());
        if (locked == null || !locked) {
            throw new IllegalStateException("room is currently being held");
        }

        // Prevent duplicate bookings for the same room.
        // - If CONFIRMED exists: room is already booked.
        // - If a recent PENDING exists within hold TTL: room is being held/processed.
        if (bookingRepository.existsByRoomIdAndStatus(booking.getRoomId(), BookingStatus.CONFIRMED)) {
            throw new IllegalStateException("room is already booked");
        }
        if (bookingHoldTtlSeconds > 0) {
            LocalDateTime cutoff = LocalDateTime.now().minusSeconds(bookingHoldTtlSeconds);
            if (bookingRepository.existsByRoomIdAndStatusAndCreatedAtAfter(booking.getRoomId(), BookingStatus.PENDING, cutoff)) {
                throw new IllegalStateException("room is currently being held");
            }
        }

        // Validate room exists/available (demo resiliency: timeout + retry)
        RoomClient.RoomDto room = getRoomByIdWithRetry(booking.getRoomId());
        if (room == null || !room.isAvailable()) {
            throw new IllegalStateException("room is not available");
        }

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

    public RoomClient.RoomDto getRoomByIdWithRetry(Long roomId) {
        return roomServiceRetryTemplate.execute(ctx -> {
            try {
                return roomClient.getRoomById(roomId);
            } catch (WebClientResponseException ex) {
                // Don't retry on 4xx (e.g., room not found); do retry on 5xx.
                if (ex.getStatusCode() != null && ex.getStatusCode().is4xxClientError()) {
                    throw new IllegalArgumentException("room not found");
                }
                throw ex;
            }
        });
    }

    // ===============================
    // GET BOOKING
    // ===============================
    public Booking getBooking(Long id) {
        return bookingRepository.findById(id).orElseThrow();
    }

    // ===============================
    // LIST BOOKINGS BY USER
    // ===============================
    public List<Booking> getBookingsByUserId(Long userId) {
        return bookingRepository.findByUserId(userId);
    }
}