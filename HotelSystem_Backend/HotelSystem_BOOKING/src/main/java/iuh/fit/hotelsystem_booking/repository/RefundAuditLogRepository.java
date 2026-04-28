package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.RefundAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundAuditLogRepository extends JpaRepository<RefundAuditLog, Long> {

    List<RefundAuditLog> findByRefundRequestIdOrderByCreatedAtAsc(Long refundRequestId);

    boolean existsByRefundRequestIdAndAction(Long refundRequestId, String action);
}
