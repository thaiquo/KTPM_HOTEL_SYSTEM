package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refund_audit_logs")
public class RefundAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long refundRequestId;
    private String action;
    private String oldStatus;
    private String newStatus;
    private String actorId;
    private String actorRole;
    private String message;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getOldStatus() { return oldStatus; }
    public void setOldStatus(String oldStatus) { this.oldStatus = oldStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static RefundAuditLog create(Long refundRequestId, String action, String oldStatus, String newStatus,
                                        String actorId, String actorRole, String message) {
        RefundAuditLog log = new RefundAuditLog();
        log.refundRequestId = refundRequestId;
        log.action = action;
        log.oldStatus = oldStatus;
        log.newStatus = newStatus;
        log.actorId = actorId;
        log.actorRole = actorRole;
        log.message = message;
        log.createdAt = LocalDateTime.now();
        return log;
    }
}
