package iuh.fit.hotelsystem_auth.repository;

import iuh.fit.hotelsystem_auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUserId(Long userId);
    List<RefreshToken> findAllByUserIdOrderByExpiryDateDescIdDesc(Long userId);
    void deleteByUserId(Long userId);
}
