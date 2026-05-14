package iuh.fit.hotelsystem_room.listener;

import iuh.fit.hotelsystem_room.config.RabbitConfig;
import iuh.fit.hotelsystem_room.dto.RoomMessage;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

@Component
public class RoomListener {

    private static final Logger log = LoggerFactory.getLogger(RoomListener.class);

    private final RoomRepository roomRepository;
    private final RabbitTemplate rabbitTemplate;
    private final CacheManager cacheManager;

    public RoomListener(RoomRepository roomRepository,
                        RabbitTemplate rabbitTemplate,
                        CacheManager cacheManager) {
        this.roomRepository = roomRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.cacheManager = cacheManager;
    }

    @RabbitListener(queues = RabbitConfig.ROOM_HOLD_QUEUE)
    public void holdRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();

        if (room.getStatus() == RoomStatus.AVAILABLE) {
            room.setStatus(RoomStatus.HOLD);
            roomRepository.save(room);

            // Evict cache vì trạng thái phòng đã thay đổi
            evictRoomCaches(room.getId());

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.held",
                    msg
            );
            log.info("Room {} held for booking {}", msg.getRoomId(), msg.getBookingId());
        }
    }

    @RabbitListener(queues = RabbitConfig.ROOM_CONFIRM_QUEUE)
    public void confirmRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        room.setStatus(RoomStatus.BOOKED);
        roomRepository.save(room);

        // Evict cache
        evictRoomCaches(room.getId());
        log.info("Room {} confirmed as BOOKED for booking {}", msg.getRoomId(), msg.getBookingId());
    }

    @RabbitListener(queues = RabbitConfig.ROOM_RELEASE_QUEUE)
    public void releaseRoom(RoomMessage msg) {
        Room room = roomRepository.findById(msg.getRoomId()).orElseThrow();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);

        // Evict cache – phòng vừa được giải phóng, cần cập nhật danh sách phòng trống
        evictRoomCaches(room.getId());
        log.info("Room {} released back to AVAILABLE for booking {}", msg.getRoomId(), msg.getBookingId());
    }

    /**
     * Xoá các cache liên quan khi trạng thái phòng thay đổi.
     * rooms:all và rooms:available phải được refresh để UI hiển thị đúng.
     */
    private void evictRoomCaches(Long roomId) {
        try {
            // Xoá cache chi tiết phòng
            var detailCache = cacheManager.getCache("rooms:detail");
            if (detailCache != null) {
                detailCache.evict(roomId);
            }
            // Xoá toàn bộ rooms:all (danh sách thay đổi)
            var allCache = cacheManager.getCache("rooms:all");
            if (allCache != null) {
                allCache.clear();
            }
            // Xoá toàn bộ rooms:available (trạng thái đặt phòng thay đổi)
            var availableCache = cacheManager.getCache("rooms:available");
            if (availableCache != null) {
                availableCache.clear();
            }
            log.debug("Cache evicted for roomId={}", roomId);
        } catch (Exception ex) {
            log.warn("Failed to evict room cache for roomId={}: {}", roomId, ex.getMessage());
        }
    }
}
