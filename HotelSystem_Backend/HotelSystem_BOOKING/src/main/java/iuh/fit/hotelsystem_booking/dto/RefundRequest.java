package iuh.fit.hotelsystem_booking.dto;

public class RefundRequest {
    private Long userId;
    private String citizenId;
    private String reason;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCitizenId() { return citizenId; }
    public void setCitizenId(String citizenId) { this.citizenId = citizenId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
