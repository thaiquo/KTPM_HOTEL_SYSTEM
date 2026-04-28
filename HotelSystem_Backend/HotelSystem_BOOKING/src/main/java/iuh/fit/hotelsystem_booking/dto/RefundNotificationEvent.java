package iuh.fit.hotelsystem_booking.dto;

public class RefundNotificationEvent {

    private Long refundRequestId;
    private Long bookingId;
    private Long userId;
    private Double refundAmount;
    private String status;
    private String type;
    private String message;

    public RefundNotificationEvent() {
    }

    public RefundNotificationEvent(Long refundRequestId, Long bookingId, Long userId,
                                   Double refundAmount, String status, String type, String message) {
        this.refundRequestId = refundRequestId;
        this.bookingId = bookingId;
        this.userId = userId;
        this.refundAmount = refundAmount;
        this.status = status;
        this.type = type;
        this.message = message;
    }

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
