package iuh.fit.hotelsystem_user.dto.request;

public class CopyWeekRequest {
    private String fromWeekStart;
    private String toWeekStart;

    public CopyWeekRequest() {
    }

    public CopyWeekRequest(String fromWeekStart, String toWeekStart) {
        this.fromWeekStart = fromWeekStart;
        this.toWeekStart = toWeekStart;
    }

    public String getFromWeekStart() {
        return fromWeekStart;
    }

    public void setFromWeekStart(String fromWeekStart) {
        this.fromWeekStart = fromWeekStart;
    }

    public String getToWeekStart() {
        return toWeekStart;
    }

    public void setToWeekStart(String toWeekStart) {
        this.toWeekStart = toWeekStart;
    }
}
