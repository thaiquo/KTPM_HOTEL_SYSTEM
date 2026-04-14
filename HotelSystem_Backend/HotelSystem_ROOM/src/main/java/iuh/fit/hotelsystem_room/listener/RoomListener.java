package iuh.fit.hotelsystem_room.listener;

import iuh.fit.hotelsystem_room.config.RabbitConfig;
import iuh.fit.hotelsystem_room.dto.RoomMessage;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class RoomListener {

    private final RoomRepository roomRepository;
    private final RabbitTemplate rabbitTemplate;
    private final long holdTtlSeconds;

    public RoomListener(RoomRepository roomRepository,
                        RabbitTemplate rabbitTemplate,
                        @Value("${room.hold.ttl-seconds:360}") long holdTtlSeconds) {
        this.roomRepository = roomRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.holdTtlSeconds = holdTtlSeconds;
    }

    @RabbitListener(queues = RabbitConfig.ROOM_HOLD_QUEUE)
    public void holdRoom(RoomMessage msg) {

        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        // If an old HOLD expired, treat it as AVAILABLE again.
        if (room.getStatus() == RoomStatus.HOLD
                && room.getHoldUntil() != null
                && room.getHoldUntil().isBefore(LocalDateTime.now())) {
            room.setStatus(RoomStatus.AVAILABLE);
            room.setHoldBookingId(null);
            room.setHoldUntil(null);
        }

        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.HOLD);
            room.setHoldBookingId(msg.getBookingId());
            room.setHoldUntil(LocalDateTime.now().plusSeconds(Math.max(0, holdTtlSeconds)));
            roomRepository.save(room);

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.held",
                    msg
            );
        } else {
            // Inform BOOKING that this room couldn't be held to avoid leaving bookings stuck in PENDING.
            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.hold.failed",
                    msg
            );
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_CONFIRM_QUEUE)
    public void confirmRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        // Confirm only if the same booking currently holds the room and the hold is not expired.
        boolean holdMatches = room.getStatus() == RoomStatus.HOLD
                && room.getHoldBookingId() != null
                && room.getHoldBookingId().equals(msg.getBookingId());
        boolean notExpired = room.getHoldUntil() == null || room.getHoldUntil().isAfter(LocalDateTime.now());

        if (holdMatches && notExpired) {
            room.setStatus(RoomStatus.BOOKED);
            room.setHoldBookingId(null);
            room.setHoldUntil(null);
            roomRepository.save(room);
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_RELEASE_QUEUE)
    public void releaseRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        // Release only if this booking holds it (or there is no holder recorded).
        boolean canRelease = room.getHoldBookingId() == null || room.getHoldBookingId().equals(msg.getBookingId());
        if (room.getStatus() == RoomStatus.HOLD && canRelease) {
            room.setStatus(RoomStatus.AVAILABLE);
            room.setHoldBookingId(null);
            room.setHoldUntil(null);
            roomRepository.save(room);
        }
    }
}
