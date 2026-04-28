package iuh.fit.hotelsystem_booking.config;

import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    public BookingScheduler(BookingRepository bookingRepository, RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Chạy mỗi phút để quét các booking hết hạn hold mà chưa thanh toán.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void cancelExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> expired = bookingRepository.findByStatusAndHoldExpiresAtBefore(BookingStatus.PENDING_PAYMENT, now);
        
        expired.forEach(this::expireBooking);
    }

    private void expireBooking(Booking booking) {
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason("Payment hold expired (11 minutes)");
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // 1. Giải phóng phòng
        RoomMessage roomMsg = new RoomMessage();
        roomMsg.setBookingId(booking.getId());
        roomMsg.setRoomId(booking.getRoomId());
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.release", roomMsg);
        
        // 2. Gửi thông báo hết hạn
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), "EXPIRED");
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.expired", event);

        System.out.println("Auto-expired booking: " + booking.getId());
    }
}
