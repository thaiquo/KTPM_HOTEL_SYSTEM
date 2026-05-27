package iuh.fit.hotelsystem_user.repository;

import iuh.fit.hotelsystem_user.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByName(String name);
}
