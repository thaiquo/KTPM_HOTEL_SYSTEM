package iuh.fit.hotelsystem_user.repository;

import iuh.fit.hotelsystem_user.entity.Role;
import iuh.fit.hotelsystem_user.entity.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
