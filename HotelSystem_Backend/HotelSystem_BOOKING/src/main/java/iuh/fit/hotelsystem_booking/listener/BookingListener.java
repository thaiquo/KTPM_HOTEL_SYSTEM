package iuh.fit.hotelsystem_booking.listener;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.PaymentMessage;
import iuh.fit.hotelsystem_booking.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class BookingListener {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;
    private final long holdTtlSeconds;

    public BookingListener(BookingRepository bookingRepository,
                           RabbitTemplate rabbitTemplate,
                           @Value("${booking.hold.ttl-seconds:360}") long holdTtlSeconds) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.holdTtlSeconds = holdTtlSeconds;
    }

    // =========================================
    // 1️⃣ ROOM HELD → GỬI PAYMENT REQUEST
    // =========================================
    @RabbitListener(queues = RabbitConfig.ROOM_HELD_QUEUE)
    public void handleRoomHeld(RoomMessage msg) {

        Booking booking = bookingRepository
                .findById(msg.getBookingId())
                .orElseThrow();

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return;
        }

        // Booking vẫn ở trạng thái PENDING cho đến khi nhận payment.result
        if (booking.getStatus() == null) {
            booking.setStatus(BookingStatus.PENDING);
            bookingRepository.save(booking);
        }

        PaymentMessage payment = new PaymentMessage();
        payment.setBookingId(booking.getId());
        payment.setUserId(booking.getUserId());
        payment.setAmount(100.0);

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "payment.request",
                payment
        );
    }

    // =========================================
    // 1b️⃣ ROOM HOLD FAILED → CANCEL BOOKING
    // =========================================
    @RabbitListener(queues = RabbitConfig.ROOM_HOLD_FAILED_QUEUE)
    public void handleRoomHoldFailed(RoomMessage msg) {
        Booking booking = bookingRepository
                .findById(msg.getBookingId())
                .orElseThrow();

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.CANCELLED) {
            return;
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Optional: publish cancelled event for notification consumers.
        BookingEvent event = new BookingEvent();
        event.setBookingId(booking.getId());
        event.setUserId(booking.getUserId());
        event.setStatus(BookingStatus.CANCELLED.name());
        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "booking.cancelled",
            event
        );
    }

    // =========================================
    // 2️⃣ PAYMENT RESULT → CONFIRM / CANCEL
    // =========================================
    @RabbitListener(queues = RabbitConfig.PAYMENT_RESULT_QUEUE)
    public void handlePaymentResult(PaymentResultMessage result) {

        Booking booking = bookingRepository
                .findById(result.getBookingId())
                .orElseThrow();

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return;
        }

        if (booking.getCreatedAt() != null && holdTtlSeconds > 0) {
            long ageSeconds = Duration.between(booking.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (ageSeconds > holdTtlSeconds) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);

                // Best-effort release in case ROOM is still HOLD.
                RoomMessage msg = new RoomMessage();
                msg.setBookingId(booking.getId());
                msg.setRoomId(booking.getRoomId());
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.release", msg);

                BookingEvent event = new BookingEvent();
                event.setBookingId(booking.getId());
                event.setUserId(booking.getUserId());
                event.setStatus(BookingStatus.CANCELLED.name());
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.cancelled", event);
                return;
            }
        }

        RoomMessage msg = new RoomMessage();
        msg.setBookingId(booking.getId());
        msg.setRoomId(booking.getRoomId());

        BookingEvent event = new BookingEvent();
        event.setBookingId(booking.getId());
        event.setUserId(booking.getUserId());

        if ("SUCCESS".equals(result.getStatus())) {

            booking.setStatus(BookingStatus.CONFIRMED);
            event.setStatus(BookingStatus.CONFIRMED.name());

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.confirm",
                    msg
            );

            rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "booking.confirmed",
                event
            );

        } else {

            booking.setStatus(BookingStatus.CANCELLED);
            event.setStatus(BookingStatus.CANCELLED.name());

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.release",
                    msg
            );

            rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "booking.cancelled",
                event
            );
        }

        bookingRepository.save(booking);
    }
}