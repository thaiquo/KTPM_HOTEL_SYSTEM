package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.PreCheckinInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreCheckinInfoRepository extends JpaRepository<PreCheckinInfo, Long> {
    List<PreCheckinInfo> findByBookingId(Long bookingId);
    Optional<PreCheckinInfo> findByBookingIdAndGuestId(Long bookingId, Long guestId);
}
