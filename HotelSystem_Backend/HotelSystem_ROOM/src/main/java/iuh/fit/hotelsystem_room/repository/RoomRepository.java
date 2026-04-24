package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomType;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByStatus(RoomStatus status);
    long countByRoomTypeId(Long roomTypeId);
    List<Room> findByRoomTypeIdAndStatus(Long roomTypeId, RoomStatus status);
}