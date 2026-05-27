package iuh.fit.hotelsystem_user.dto.request;

public class CheckinRequest {
    private Long scheduleId;
    private String checkinTime;
    private String checkoutTime;

    public CheckinRequest() {
    }

    public CheckinRequest(Long scheduleId, String checkinTime, String checkoutTime) {
        this.scheduleId = scheduleId;
        this.checkinTime = checkinTime;
        this.checkoutTime = checkoutTime;
    }

    public Long getScheduleId() {
        return scheduleId;
    }

    public void setScheduleId(Long scheduleId) {
        this.scheduleId = scheduleId;
    }

    public String getCheckinTime() {
        return checkinTime;
    }

    public void setCheckinTime(String checkinTime) {
        this.checkinTime = checkinTime;
    }

    public String getCheckoutTime() {
        return checkoutTime;
    }

    public void setCheckoutTime(String checkoutTime) {
        this.checkoutTime = checkoutTime;
    }
}
