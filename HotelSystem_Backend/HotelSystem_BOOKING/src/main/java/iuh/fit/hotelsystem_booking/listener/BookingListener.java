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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ObjectMapper objectMapper;

    @Autowired
    public BookingListener(BookingRepository bookingRepository,
                           RabbitTemplate rabbitTemplate,
                           @Lazy BookingService bookingService,
                           iuh.fit.hotelsystem_booking.saga.BookingSagaOrchestrator sagaOrchestrator,
                           ObjectMapper objectMapper) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingService = bookingService;
        this.sagaOrchestrator = sagaOrchestrator;
        this.objectMapper = objectMapper;
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
    public void handlePaymentResult(org.springframework.amqp.core.Message amqpMsg) {
        try {
            System.out.println("BookingListener.received.amqp.body.length=" + (amqpMsg.getBody()==null?0:amqpMsg.getBody().length));
            String text = new String(amqpMsg.getBody(), java.nio.charset.StandardCharsets.UTF_8);
            PaymentResultMessage result = objectMapper.readValue(text, PaymentResultMessage.class);
            sagaOrchestrator.processPaymentResult(result);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse or process payment result", ex);
        }
    }

    private <T> T convert(Object rawMessage, Class<T> targetType) {
        try {
            System.out.println("BookingListener.convert.rawMessageClass=" + (rawMessage==null?"null":rawMessage.getClass().getName()));
            if (rawMessage instanceof java.util.Map m) {
                System.out.println("BookingListener.convert.map.keys=" + m.keySet());
                m.forEach((k,v) -> {
                    System.out.println("  key='" + k + "' -> " + (v==null?"null":v.getClass().getName()));
                });
            }
            if (targetType.isInstance(rawMessage)) {
                return targetType.cast(rawMessage);
            }
            // Handle org.springframework.amqp.core.Message (AMQP native)
            if (rawMessage instanceof org.springframework.amqp.core.Message amqpMsg) {
                String text = new String(amqpMsg.getBody(), java.nio.charset.StandardCharsets.UTF_8);
                return objectMapper.readValue(text, targetType);
            }
            // Handle Spring Messaging Message wrapper
            if (rawMessage instanceof org.springframework.messaging.Message<?> msg) {
                Object payload = msg.getPayload();
                if (payload instanceof org.springframework.amqp.core.Message amqp) {
                    String text = new String(amqp.getBody(), java.nio.charset.StandardCharsets.UTF_8);
                    return objectMapper.readValue(text, targetType);
                }
                if (payload instanceof byte[] bytes) {
                    String text = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                    return objectMapper.readValue(text, targetType);
                }
                if (payload instanceof String s) {
                    return objectMapper.readValue(s, targetType);
                }
                if (payload instanceof java.util.Map) {
                    return objectMapper.convertValue(payload, targetType);
                }
            }
            // Handle plain byte[] or String
            if (rawMessage instanceof byte[] bytes) {
                String text = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                return objectMapper.readValue(text, targetType);
            }
            if (rawMessage instanceof String s) {
                return objectMapper.readValue(s, targetType);
            }
            if (rawMessage instanceof java.util.Map) {
                return objectMapper.convertValue(rawMessage, targetType);
            }
            throw new IllegalArgumentException("Unsupported Rabbit message type: " + (rawMessage==null?"null":rawMessage.getClass().getName()));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to parse Rabbit message into " + targetType.getSimpleName(), ex);
        }
    }
}
