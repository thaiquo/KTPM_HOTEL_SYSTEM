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
    private final iuh.fit.hotelsystem_booking.saga.BookingSagaOrchestrator sagaOrchestrator;

    public BookingListener(BookingRepository bookingRepository,
                           RabbitTemplate rabbitTemplate,
                           @Lazy BookingService bookingService,
                           iuh.fit.hotelsystem_booking.saga.BookingSagaOrchestrator sagaOrchestrator) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingService = bookingService;
        this.sagaOrchestrator = sagaOrchestrator;
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
        // Delegate to saga orchestrator which writes outbox events and updates booking transactionally
        sagaOrchestrator.processPaymentResult(result);
    }
}
