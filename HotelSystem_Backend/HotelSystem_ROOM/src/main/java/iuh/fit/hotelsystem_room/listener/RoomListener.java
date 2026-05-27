package iuh.fit.hotelsystem_room.listener;

import iuh.fit.hotelsystem_room.config.RabbitConfig;
import iuh.fit.hotelsystem_room.dto.RoomMessage;
import iuh.fit.hotelsystem_room.dto.RoomStatusUpdateRequest;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class RoomListener {

    private final RoomRepository roomRepository;
    private final RabbitTemplate rabbitTemplate;

    public RoomListener(RoomRepository roomRepository,
                        RabbitTemplate rabbitTemplate) {
        this.roomRepository = roomRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = RabbitConfig.ROOM_HOLD_QUEUE)
    public void holdRoom(RoomMessage msg) {

        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        if (isHardUnavailable(room.getStatus())) {
            throw new IllegalStateException("Room " + room.getId() + " is not bookable with current status " + room.getStatus());
        }

        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.RESERVED);
            roomRepository.save(room);
        }

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "room.held",
                msg
        );
    }

    @RabbitListener(queues = RabbitConfig.ROOM_CONFIRM_QUEUE)
    public void confirmRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.RESERVED);
            roomRepository.save(room);
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_RELEASE_QUEUE)
    public void releaseRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        if (room.getStatus() == RoomStatus.RESERVED) {
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_STATUS_QUEUE)
    public void updateRoomStatus(RoomStatusUpdateRequest msg) {
        if (msg == null || msg.getRoomId() == null || msg.getStatus() == null || msg.getStatus().isBlank()) {
            return;
        }
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        room.setStatus(RoomStatus.valueOf(msg.getStatus().trim().toUpperCase()));
        roomRepository.save(room);
    }

    private boolean isHardUnavailable(RoomStatus status) {
        return status == RoomStatus.MAINTENANCE
                || status == RoomStatus.OUT_OF_SERVICE
                || status == RoomStatus.BLOCKED;
    }
}
