package iuh.fit.hotelsystem_booking.config;

import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingLockStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final OutboxEventRepository outboxEventRepository;

    public BookingScheduler(BookingRepository bookingRepository, OutboxEventRepository outboxEventRepository) {
        this.bookingRepository = bookingRepository;
        this.outboxEventRepository = outboxEventRepository;
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
        booking.setLockStatus(BookingLockStatus.EXPIRED);
        booking.setCancellationReason("Payment hold expired (" + BookingConstants.HOLD_MINUTES + " minutes)");
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // 1. Giải phóng tất cả các phòng trong đơn đặt
        for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
            item.setStatus(BookingItemStatus.CANCELLED);
            RoomMessage roomMsg = new RoomMessage();
            roomMsg.setBookingId(booking.getId());
            roomMsg.setRoomId(item.getRoomId());
            enqueueOutbox("Booking", String.valueOf(booking.getId()), "room.release", roomMsg);
        }
        
        // 2. Gửi thông báo hết hạn
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), "EXPIRED");
        enqueueOutbox("Booking", String.valueOf(booking.getId()), "booking.expired", event);

        System.out.println("Auto-expired booking: " + booking.getId());
    }

    private void enqueueOutbox(String aggregateType, String aggregateId, String type, Object payload) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setType(type);
        try {
            event.setPayload(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload));
        } catch (Exception ex) {
            event.setPayload("{}");
        }
        outboxEventRepository.save(event);
    }
}
