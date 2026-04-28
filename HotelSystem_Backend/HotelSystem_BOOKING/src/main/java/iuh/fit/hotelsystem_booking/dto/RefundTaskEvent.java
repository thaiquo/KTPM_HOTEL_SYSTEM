package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDateTime;

public class RefundTaskEvent {

    private Long refundRequestId;
    private Long bookingId;
    private Double refundAmount;
    private String priority;
    private LocalDateTime createdAt;
    private LocalDateTime dueAt;
    private Long assignedTo;

    public RefundTaskEvent() {
    }

    public RefundTaskEvent(Long refundRequestId, Long bookingId, Double refundAmount,
                           String priority, LocalDateTime createdAt, LocalDateTime dueAt) {
        this.refundRequestId = refundRequestId;
        this.bookingId = bookingId;
        this.refundAmount = refundAmount;
        this.priority = priority;
        this.createdAt = createdAt;
        this.dueAt = dueAt;
    }

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public Long getAssignedTo() { return assignedTo; }
    public void setAssignedTo(Long assignedTo) { this.assignedTo = assignedTo; }
}
