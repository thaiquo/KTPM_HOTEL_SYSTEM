package iuh.fit.hotelsystem_payment.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "outbox_event")
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "aggregate_type", length = 100, nullable = false)
    private String aggregateType;

    @Column(name = "aggregate_id", length = 100, nullable = false)
    private String aggregateId;

    @Column(name = "type", length = 200, nullable = false)
    private String type;

    @Column(name = "payload", columnDefinition = "TEXT", nullable = false)
    private String payload;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "headers", columnDefinition = "jsonb")
    private Map<String, Object> headers;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    @Column(name = "processed", nullable = false)
    private boolean processed = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAggregateType() { return aggregateType; }
    public void setAggregateType(String aggregateType) { this.aggregateType = aggregateType; }
    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String aggregateId) { this.aggregateId = aggregateId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public Map<String, Object> getHeaders() { return headers; }
    public void setHeaders(Map<String, Object> headers) { this.headers = headers; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public boolean isProcessed() { return processed; }
    public void setProcessed(boolean processed) { this.processed = processed; }
    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }
}
