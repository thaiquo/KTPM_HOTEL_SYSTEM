package iuh.fit.hotelsystem_room.jobs;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class HoldExpiryJob {

    private final RoomRepository roomRepository;
    private final long sweepMs;

    public HoldExpiryJob(RoomRepository roomRepository,
                         @Value("${room.hold.sweep-ms:30000}") long sweepMs) {
        this.roomRepository = roomRepository;
        this.sweepMs = sweepMs;
    }

    @Scheduled(fixedDelayString = "${room.hold.sweep-ms:30000}")
    public void releaseExpiredHolds() {
        if (sweepMs <= 0) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<Room> expired = roomRepository.findByStatusAndHoldUntilBefore(RoomStatus.HOLD, now);

        for (Room room : expired) {
            room.setStatus(RoomStatus.AVAILABLE);
            room.setHoldBookingId(null);
            room.setHoldUntil(null);
        }

        if (!expired.isEmpty()) {
            roomRepository.saveAll(expired);
        }
    }
}
