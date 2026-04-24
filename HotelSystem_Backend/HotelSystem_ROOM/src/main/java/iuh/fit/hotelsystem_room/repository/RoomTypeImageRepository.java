package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage, Long> {
}
