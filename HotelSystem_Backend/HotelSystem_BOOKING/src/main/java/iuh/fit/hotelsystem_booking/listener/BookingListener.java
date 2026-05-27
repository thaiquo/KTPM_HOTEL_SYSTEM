package iuh.fit.hotelsystem_booking.listener;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.ConfirmCheckinPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingLockStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.service.BookingService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BookingListener {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;
    private final BookingService bookingService;

    public BookingListener(BookingRepository bookingRepository,
                           RabbitTemplate rabbitTemplate,
                           @Lazy BookingService bookingService) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingService = bookingService;
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
        // Payment (coc/full) duoc khoi tao tu client qua Payment service (VNPAY/MoMo/thu tai quay),
        // sau do Payment service phat event PAYMENT_RESULT de confirm booking.
    }

    // =========================================
    // 2️⃣ PAYMENT RESULT → CONFIRM / CANCEL
    // =========================================
    @RabbitListener(queues = RabbitConfig.PAYMENT_RESULT_QUEUE)
    @Transactional
    public void handlePaymentResult(PaymentResultMessage result) {

        Booking booking = bookingRepository
                .findById(result.getBookingId())
                .orElseThrow();

        BookingEvent event = new BookingEvent();
        event.setBookingId(booking.getId());
        event.setUserId(booking.getUserId());

        if ("FULL_PAID".equals(result.getStatus())) {

            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setConfirmedAt(java.time.ZonedDateTime.now(iuh.fit.hotelsystem_booking.config.TimeConfig.VIETNAM_ZONE).toLocalDateTime());
            booking.setLockStatus(BookingLockStatus.CONFIRMED);
            booking.setPaidAmount(result.getPaidAmount());
            booking.setPaymentStatus("PAID");
            booking.setPaymentTransactionId(result.getTransactionId());
            event.setStatus(BookingStatus.CONFIRMED.name());

            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                item.setStatus(BookingItemStatus.BOOKED);
                RoomMessage msg = new RoomMessage();
                msg.setBookingId(booking.getId());
                msg.setRoomId(item.getRoomId());
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.confirm", msg);
            }

            rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "booking.confirmed",
                event
            );

            } else if ("DEPOSIT_PAID".equals(result.getStatus())) {

                booking.setStatus(BookingStatus.DEPOSIT_PAID);
                booking.setConfirmedAt(java.time.ZonedDateTime.now(iuh.fit.hotelsystem_booking.config.TimeConfig.VIETNAM_ZONE).toLocalDateTime());
                booking.setLockStatus(BookingLockStatus.CONFIRMED);
                booking.setPaidAmount(result.getPaidAmount());
                booking.setPaymentStatus("DEPOSITED");
                booking.setPaymentTransactionId(result.getTransactionId());
                event.setStatus(BookingStatus.DEPOSIT_PAID.name());

                for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                    item.setStatus(BookingItemStatus.BOOKED);
                    RoomMessage msg = new RoomMessage();
                    msg.setBookingId(booking.getId());
                    msg.setRoomId(item.getRoomId());
                    rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.confirm", msg);
                }

                rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "booking.confirmed",
                    event
                );

            } else if ("REMAINING_PAID".equals(result.getStatus())) {
                RemainingPaymentRequest remainingRequest = new RemainingPaymentRequest();
                remainingRequest.setAmount(result.getPaidAmount() != null ? result.getPaidAmount() : 0.0);
                remainingRequest.setUserId(booking.getUserId());
                remainingRequest.setTransactionId(result.getTransactionId());

                bookingService.collectRemainingPayment(booking.getId(), remainingRequest);
                return;

        } else {

            booking.setStatus(BookingStatus.CANCELLED);
                booking.setLockStatus(BookingLockStatus.EXPIRED);
            event.setStatus(BookingStatus.CANCELLED.name());

            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                item.setStatus(BookingItemStatus.CANCELLED);
                RoomMessage msg = new RoomMessage();
                msg.setBookingId(booking.getId());
                msg.setRoomId(item.getRoomId());
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.release", msg);
            }

            rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "booking.cancelled",
                event
            );
        }

        bookingRepository.save(booking);
    }
}
