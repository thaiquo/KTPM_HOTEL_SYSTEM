package iuh.fit.hotelsystem_auth.repository;

import iuh.fit.hotelsystem_auth.entity.RegistrationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RegistrationSessionRepository extends JpaRepository<RegistrationSession, Long> {
    Optional<RegistrationSession> findByRegistrationToken(String registrationToken);
    Optional<RegistrationSession> findByEmail(String email);
    void deleteByRegistrationToken(String registrationToken);
}
