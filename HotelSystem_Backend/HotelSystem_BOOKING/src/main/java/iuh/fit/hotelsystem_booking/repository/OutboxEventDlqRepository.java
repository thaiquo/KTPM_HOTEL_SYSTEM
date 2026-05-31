package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.OutboxEventDlq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OutboxEventDlqRepository extends JpaRepository<OutboxEventDlq, Long> {
}
