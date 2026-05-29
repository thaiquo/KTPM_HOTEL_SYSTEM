package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign Client gọi Room Service
 */
@FeignClient(name = "room-service", fallback = RoomServiceFallback.class)
public interface RoomServiceClient {

    /**
     * Cập nhật status của room
     */
    @Retry(name = "roomServiceApi")
    @PutMapping("/rooms/internal/{id}/status")
    void updateRoomStatus(@PathVariable("id") Long id, @RequestBody RoomStatusUpdateDto dto);

    /**
     * Lấy thông tin room
     */
    @Retry(name = "roomServiceApi")
    @GetMapping("/rooms/{id}")
    iuh.fit.hotelsystem_booking.dto.Room getRoomById(@PathVariable("id") Long id);
}
