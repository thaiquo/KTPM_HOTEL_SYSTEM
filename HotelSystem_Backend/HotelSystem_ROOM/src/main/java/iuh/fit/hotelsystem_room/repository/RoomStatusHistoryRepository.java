package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.RoomStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomStatusHistoryRepository extends JpaRepository<RoomStatusHistory, Long> {

    /** Lấy lịch sử thay đổi trạng thái của 1 phòng, mới nhất trước */
    List<RoomStatusHistory> findByRoomIdOrderByChangedAtDesc(Long roomId);
}
