package iuh.fit.hotelsystem_payment.dto;

/**
 * Booking Service sends total refund for early checkout; Payment Service splits by original payments.
 */
public class EarlyCheckoutRefundRequest {
    private Long bookingId;
    /** @deprecated kept for backward compatibility; receivers come from payment transactions */
    private Long userId;
    private Double amount;
    /** e.g. EARLY_CHECKOUT */
    private String reason;
    private Long processedByStaffId;
    private boolean forceImmediate;

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

    public boolean isForceImmediate() { return forceImmediate; }
    public void setForceImmediate(boolean forceImmediate) { this.forceImmediate = forceImmediate; }
}

