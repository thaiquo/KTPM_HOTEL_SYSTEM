package iuh.fit.hotelsystem_auth.repository;

import iuh.fit.hotelsystem_auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser_Id(Long userId);
    void deleteByUser_Id(Long userId);
}
