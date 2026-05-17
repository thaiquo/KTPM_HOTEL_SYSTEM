package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Fallback for RoomServiceClient
 */
@Component
public class RoomServiceFallback implements RoomServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RoomServiceFallback.class);

    @Override
    public void updateRoomStatus(Long id, RoomStatusUpdateDto dto) {
        log.warn("RoomServiceClient.updateRoomStatus fallback - Room Service unavailable. RoomId: {}", dto.getRoomId());
    }

    @Override
    public Object getRoomById(Long id) {
        log.warn("RoomServiceClient.getRoomById fallback - Room Service unavailable. RoomId: {}", id);
        return null;
    }
}
