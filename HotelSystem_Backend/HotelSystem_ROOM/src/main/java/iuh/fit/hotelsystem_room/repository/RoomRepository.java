package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.entity.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByStatus(RoomStatus status);
    List<Room> findByType(RoomType type);
    List<Room> findByPriceLessThanEqual(Double price);
    List<Room> findByCapacityGreaterThanEqual(Integer capacity);
}