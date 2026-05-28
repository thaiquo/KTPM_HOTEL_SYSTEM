package iuh.fit.hotelsystem_user.dto.response;

import iuh.fit.hotelsystem_user.entity.ShiftCheckin;

public class ShiftCheckinResponse {
    private Long id;
    private Long scheduleId;
    private Long employeeId;
    private String employeeName;
    private String shiftName;
    private String workDate;
    private String checkinTime;
    private String checkoutTime;
    private String checkinStatus;
    private Long totalMinutes;
    private String createdAt;

    public ShiftCheckinResponse() {
    }

    public ShiftCheckinResponse(ShiftCheckin checkin) {
        this.id = checkin.getId();
        this.scheduleId = checkin.getSchedule().getId();
        this.employeeId = checkin.getEmployee().getId();
        this.employeeName = checkin.getEmployee().getName();
        this.shiftName = checkin.getSchedule().getShift() != null
                ? checkin.getSchedule().getShift().getName()
                : "OFF";
        this.workDate = checkin.getSchedule().getWorkDate().toString();
        this.checkinTime = checkin.getCheckinTime() != null ? checkin.getCheckinTime().toString() : null;
        this.checkoutTime = checkin.getCheckoutTime() != null ? checkin.getCheckoutTime().toString() : null;
        this.checkinStatus = checkin.getCheckinStatus().toString();
        this.totalMinutes = calculateTotalMinutes(checkin);
        this.createdAt = checkin.getCreatedAt().toString();
    }

    private Long calculateTotalMinutes(ShiftCheckin checkin) {
        if (checkin.getCheckinTime() != null && checkin.getCheckoutTime() != null) {
            long minutes = java.time.temporal.ChronoUnit.MINUTES.between(
                    checkin.getCheckinTime(),
                    checkin.getCheckoutTime());
            return minutes;
        }
        return null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getScheduleId() {
        return scheduleId;
    }

    public void setScheduleId(Long scheduleId) {
        this.scheduleId = scheduleId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getShiftName() {
        return shiftName;
    }

    public void setShiftName(String shiftName) {
        this.shiftName = shiftName;
    }

    public String getWorkDate() {
        return workDate;
    }

    public void setWorkDate(String workDate) {
        this.workDate = workDate;
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

    public String getCheckinStatus() {
        return checkinStatus;
    }

    public void setCheckinStatus(String checkinStatus) {
        this.checkinStatus = checkinStatus;
    }

    public Long getTotalMinutes() {
        return totalMinutes;
    }

    public void setTotalMinutes(Long totalMinutes) {
        this.totalMinutes = totalMinutes;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
