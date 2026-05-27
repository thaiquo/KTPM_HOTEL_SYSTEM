package iuh.fit.hotelsystem_user.dto.request;

public class ScheduleItemRequest {
    private Long employeeId;
    private String workDate;
    private Long shiftId;
    private String note;

    public ScheduleItemRequest() {
    }

    public ScheduleItemRequest(Long employeeId, String workDate, Long shiftId, String note) {
        this.employeeId = employeeId;
        this.workDate = workDate;
        this.shiftId = shiftId;
        this.note = note;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public String getWorkDate() {
        return workDate;
    }

    public void setWorkDate(String workDate) {
        this.workDate = workDate;
    }

    public Long getShiftId() {
        return shiftId;
    }

    public void setShiftId(Long shiftId) {
        this.shiftId = shiftId;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
