package iuh.fit.hotelsystem_booking.listener;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_booking.dto.PaymentMessage;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingListener {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    public BookingListener(BookingRepository bookingRepository,
                           RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    // =========================================
    // 1️⃣ ROOM HELD → BOOKING GIỮ TRẠNG THÁI PENDING
    // =========================================
    @RabbitListener(queues = RabbitConfig.ROOM_HELD_QUEUE)
    public void handleRoomHeld(RoomMessage msg) {

        Booking booking = bookingRepository
                .findById(msg.getBookingId())
                .orElseThrow();

        // Ở đây có thể log hoặc verify room hold thành công
        System.out.println("Room held for booking: " + booking.getId());

        // Gửi yêu cầu thanh toán sang Payment Service
        PaymentMessage paymentMsg = new PaymentMessage();
        paymentMsg.setBookingId(booking.getId());
        paymentMsg.setUserId(booking.getUserId());
        paymentMsg.setAmount(booking.getFinalTotal() != null ? booking.getFinalTotal().doubleValue() : 0.0);
        paymentMsg.setIdempotencyKey("BOOKING_PAYMENT_" + booking.getId());

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "payment.request",
                paymentMsg
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

        RoomMessage msg = new RoomMessage();
        msg.setBookingId(booking.getId());
        msg.setRoomId(booking.getRoomId());

        BookingEvent event = new BookingEvent();
        event.setBookingId(booking.getId());
        event.setUserId(booking.getUserId());

        if ("FULL_PAID".equals(result.getStatus())) {

            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setPaidAmount(result.getPaidAmount());
            booking.setPaymentStatus("PAID");
            booking.setPaymentTransactionId(result.getTransactionId());
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

            } else if ("DEPOSIT_PAID".equals(result.getStatus())) {

                booking.setStatus(BookingStatus.DEPOSIT_PAID);
                booking.setPaidAmount(result.getPaidAmount());
                booking.setPaymentStatus("DEPOSITED");
                booking.setPaymentTransactionId(result.getTransactionId());
                event.setStatus(BookingStatus.DEPOSIT_PAID.name());

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

            } else if ("REMAINING_PAID".equals(result.getStatus())) {

                booking.setStatus(BookingStatus.CHECKED_IN);
                double alreadyPaid = booking.getPaidAmount() != null ? booking.getPaidAmount() : 0.0;
                double additionalPaid = result.getPaidAmount() != null ? result.getPaidAmount() : 0.0;
                booking.setPaidAmount(alreadyPaid + additionalPaid);
                booking.setPaymentStatus("PAID");
                booking.setPaymentTransactionId(result.getTransactionId());
                event.setStatus(BookingStatus.CHECKED_IN.name());

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
