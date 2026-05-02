package iuh.fit.hotelsystem_booking.dto;

public class PaymentRefundRequest {
    private Long bookingId;
    /** @deprecated receivers are derived from payment transactions in Payment Service */
    private Long userId;
    private Double amount;
    private String reason;
    private Long processedByStaffId;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    /** @deprecated */
    public Long getUserId() { return userId; }
    /** @deprecated */
    public void setUserId(Long userId) { this.userId = userId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}

