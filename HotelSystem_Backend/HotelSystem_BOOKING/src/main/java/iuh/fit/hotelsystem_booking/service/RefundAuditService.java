package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.RefundAuditLog;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.repository.RefundAuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class RefundAuditService {

    private final RefundAuditLogRepository auditLogRepository;

    public RefundAuditService(RefundAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(Long refundRequestId, String action, RefundStatus oldStatus, RefundStatus newStatus,
                    String actorId, String actorRole, String message) {
        if (isTerminalNotification(action) && auditLogRepository.existsByRefundRequestIdAndAction(refundRequestId, action)) {
            return;
        }
        auditLogRepository.save(RefundAuditLog.create(
                refundRequestId,
                action,
                oldStatus != null ? oldStatus.name() : null,
                newStatus != null ? newStatus.name() : null,
                actorId,
                actorRole,
                message));
    }

    private boolean isTerminalNotification(String action) {
        return "CREATED".equals(action) || "REFUNDED".equals(action) || "REJECTED".equals(action);
    }
}
