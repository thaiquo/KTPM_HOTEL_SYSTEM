package iuh.fit.hotelsystem_room.listener;

import iuh.fit.hotelsystem_room.config.RabbitConfig;
import iuh.fit.hotelsystem_room.dto.RoomMessage;
import iuh.fit.hotelsystem_room.dto.RoomStatusUpdateRequest;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class RoomListener {

    private static final Logger log = LoggerFactory.getLogger(RoomListener.class);

    private final RoomRepository roomRepository;
    private final RabbitTemplate rabbitTemplate;
    private final CacheManager cacheManager;
    private final ObjectMapper objectMapper;

    @Autowired
    public RoomListener(RoomRepository roomRepository,
                        RabbitTemplate rabbitTemplate,
                        CacheManager cacheManager,
                        ObjectMapper objectMapper) {
        this.roomRepository = roomRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.cacheManager = cacheManager;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitConfig.ROOM_HOLD_QUEUE)
    public void holdRoom(Object rawMessage) {
        RoomMessage msg = convert(rawMessage, RoomMessage.class);

        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        if (isHardUnavailable(room.getStatus())) {
            throw new IllegalStateException("Room " + room.getId() + " is not bookable with current status " + room.getStatus());
        }

        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.RESERVED);
            roomRepository.save(room);
            evictRoomCaches(room.getId());
        }

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                "room.held",
                msg
        );
    }

    @RabbitListener(queues = RabbitConfig.ROOM_CONFIRM_QUEUE)
    public void confirmRoom(Object rawMessage) {
        RoomMessage msg = convert(rawMessage, RoomMessage.class);
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.RESERVED);
            roomRepository.save(room);
            evictRoomCaches(room.getId());
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_RELEASE_QUEUE)
    public void releaseRoom(Object rawMessage) {
        RoomMessage msg = convert(rawMessage, RoomMessage.class);
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        if (room.getStatus() == RoomStatus.RESERVED) {
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
            evictRoomCaches(room.getId());
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
        evictRoomCaches(room.getId());
    }

    private void evictRoomCaches(Long roomId) {
        try {
            var detail = cacheManager.getCache("rooms:detail");
            if (detail != null) {
                detail.evict(roomId);
            }
            var detailV2 = cacheManager.getCache("rooms:detail:v2");
            if (detailV2 != null) {
                detailV2.evict(roomId);
            }
            var all = cacheManager.getCache("rooms:all");
            if (all != null) {
                all.clear();
            }
            var allV2 = cacheManager.getCache("rooms:all:v2");
            if (allV2 != null) {
                allV2.clear();
            }
            var available = cacheManager.getCache("rooms:available");
            if (available != null) {
                available.clear();
            }
            var availableV2 = cacheManager.getCache("rooms:available:v2");
            if (availableV2 != null) {
                availableV2.clear();
            }
        } catch (Exception ex) {
            log.warn("Failed to evict room cache for roomId={}: {}", roomId, ex.getMessage());
        }
    }

    private boolean isHardUnavailable(RoomStatus status) {
        return status == RoomStatus.MAINTENANCE
                || status == RoomStatus.OUT_OF_SERVICE
                || status == RoomStatus.BLOCKED;
    }

    private <T> T convert(Object rawMessage, Class<T> targetType) {
        try {
            if (targetType.isInstance(rawMessage)) {
                return targetType.cast(rawMessage);
            }
            if (rawMessage instanceof String text) {
                return objectMapper.readValue(text, targetType);
            }
            return objectMapper.convertValue(rawMessage, targetType);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to parse Rabbit message into " + targetType.getSimpleName(), ex);
        }
    }
}
