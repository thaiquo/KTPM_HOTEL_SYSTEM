package iuh.fit.hotelsystem_auth.repository;

import iuh.fit.hotelsystem_auth.entity.Role;
import iuh.fit.hotelsystem_auth.entity.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
