package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.RefundStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundStaffRepository extends JpaRepository<RefundStaff, Long> {

    List<RefundStaff> findByActiveTrueAndOnlineTrueAndRole(String role);
}
