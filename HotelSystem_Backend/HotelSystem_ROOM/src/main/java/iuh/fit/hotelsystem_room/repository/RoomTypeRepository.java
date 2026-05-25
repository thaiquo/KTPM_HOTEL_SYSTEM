package iuh.fit.hotelsystem_room.repository;

import iuh.fit.hotelsystem_room.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    Optional<RoomType> findByType(String type);

    /**
     * FETCH JOIN để load images + bedConfigs + bedType trong 1 query duy nhất.
     * Dùng 2 query riêng biệt (images & bedConfigs) để tránh Cartesian product.
     */
    @Query("""
        SELECT DISTINCT rt FROM RoomType rt
        LEFT JOIN FETCH rt.images
        LEFT JOIN FETCH rt.bedConfigs bc
        LEFT JOIN FETCH bc.bedType
        """)
    List<RoomType> findAllWithDetails();

    @Query("""
        SELECT rt FROM RoomType rt
        LEFT JOIN FETCH rt.images
        LEFT JOIN FETCH rt.bedConfigs bc
        LEFT JOIN FETCH bc.bedType
        WHERE rt.id = :id
        """)
    Optional<RoomType> findByIdWithDetails(Long id);
}
