package iuh.fit.hotelsystem_user.dto.request;

public class ReplaceShiftRequest {
    private Long replacementEmployeeId;
    private String reason;

    public ReplaceShiftRequest() {
    }

    public ReplaceShiftRequest(Long replacementEmployeeId, String reason) {
        this.replacementEmployeeId = replacementEmployeeId;
        this.reason = reason;
    }

    public Long getReplacementEmployeeId() {
        return replacementEmployeeId;
    }

    public void setReplacementEmployeeId(Long replacementEmployeeId) {
        this.replacementEmployeeId = replacementEmployeeId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
