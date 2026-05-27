package iuh.fit.hotelsystem_user.dto.request;

import java.util.List;

public class SaveScheduleRequest {
    private String weekStart;
    private List<ScheduleItemRequest> schedules;

    public SaveScheduleRequest() {
    }

    public SaveScheduleRequest(String weekStart, List<ScheduleItemRequest> schedules) {
        this.weekStart = weekStart;
        this.schedules = schedules;
    }

    public String getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(String weekStart) {
        this.weekStart = weekStart;
    }

    public List<ScheduleItemRequest> getSchedules() {
        return schedules;
    }

    public void setSchedules(List<ScheduleItemRequest> schedules) {
        this.schedules = schedules;
    }
}
