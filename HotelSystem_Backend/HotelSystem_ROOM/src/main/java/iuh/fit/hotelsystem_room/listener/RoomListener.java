package iuh.fit.hotelsystem_room.listener;

import iuh.fit.hotelsystem_room.config.RabbitConfig;
import iuh.fit.hotelsystem_room.dto.RoomMessage;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatus;
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

        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.HOLD);
            roomRepository.save(room);

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.held",
                    msg
            );
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_CONFIRM_QUEUE)
    public void confirmRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        room.setStatus(RoomStatus.BOOKED);
        roomRepository.save(room);
    }

    @RabbitListener(queues = RabbitConfig.ROOM_RELEASE_QUEUE)
    public void releaseRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
    }
}
