package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Fallback for RoomServiceClient
 */
@Component
public class RoomServiceFallback implements RoomServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RoomServiceFallback.class);

    @Override
    public void updateRoomStatus(Long id, RoomStatusUpdateDto dto) {
        log.warn("RoomServiceClient.updateRoomStatus fallback - Room Service unavailable. RoomId: {}", dto.getRoomId());
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Room service is temporarily unavailable.");
    }

    @Override
    public iuh.fit.hotelsystem_booking.dto.Room getRoomById(Long id) {
        log.warn("RoomServiceClient.getRoomById fallback - Room Service unavailable. RoomId: {}", id);
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Room service is temporarily unavailable.");
    }
}
