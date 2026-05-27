package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long>, JpaSpecificationExecutor<Room> {

    // 👉 Để tránh MultipleBagFetchException (lỗi 500 do tích Descartes), 
    // chúng ta chỉ FETCH các quan hệ 1-1 hoặc N-1. 
    // Các quan hệ List/Set sẽ để Hibernate tự nạp Lazy hoặc dùng @BatchSize.
    
    @Query("""
            SELECT DISTINCT r FROM Room r
            LEFT JOIN FETCH r.roomType rt
            """)
    List<Room> findAllWithDetails();

    @Query("""
            SELECT r FROM Room r
            LEFT JOIN FETCH r.roomType rt
            WHERE r.id = :id
            """)
    Optional<Room> findByIdWithDetails(Long id);

    @Query("""
            SELECT DISTINCT r FROM Room r
            LEFT JOIN FETCH r.roomType rt
            WHERE r.status = :status
            """)
    List<Room> findByStatusWithDetails(RoomStatus status);

    List<Room> findByStatus(RoomStatus status);

    long countByRoomTypeId(Long roomTypeId);

    @Query("""
            SELECT DISTINCT r FROM Room r
            LEFT JOIN FETCH r.roomType rt
            WHERE (:roomTypeId IS NULL OR rt.id = :roomTypeId) AND r.status = :status
            """)
    List<Room> findByRoomTypeIdAndStatusWithDetails(Long roomTypeId, RoomStatus status);
}