package iuh.fit.hotelsystem_user.dto.response;

import iuh.fit.hotelsystem_user.entity.ShiftSchedule;

public class ShiftScheduleResponse {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long shiftId;
    private String shiftName;
    private String workDate;
    private String weekStart;
    private String status;
    private Long assignedById;
    private String assignedByName;
    private String note;
    private String createdAt;
    private String updatedAt;

    public ShiftScheduleResponse() {
    }

    public ShiftScheduleResponse(ShiftSchedule schedule) {
        this.id = schedule.getId();
        this.employeeId = schedule.getEmployee().getId();
        this.employeeName = schedule.getEmployee().getName();
        this.shiftId = schedule.getShift() != null ? schedule.getShift().getId() : null;
        this.shiftName = schedule.getShift() != null ? schedule.getShift().getName() : "OFF";
        this.workDate = schedule.getWorkDate().toString();
        this.weekStart = schedule.getWeekStart().toString();
        this.status = schedule.getStatus().toString();
        this.assignedById = schedule.getAssignedBy() != null ? schedule.getAssignedBy().getId() : null;
        this.assignedByName = schedule.getAssignedBy() != null ? schedule.getAssignedBy().getName() : null;
        this.note = schedule.getNote();
        this.createdAt = schedule.getCreatedAt().toString();
        this.updatedAt = schedule.getUpdatedAt().toString();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getShiftId() {
        return shiftId;
    }

    public void setShiftId(Long shiftId) {
        this.shiftId = shiftId;
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

    public String getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(String weekStart) {
        this.weekStart = weekStart;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getAssignedById() {
        return assignedById;
    }

    public void setAssignedById(Long assignedById) {
        this.assignedById = assignedById;
    }

    public String getAssignedByName() {
        return assignedByName;
    }

    public void setAssignedByName(String assignedByName) {
        this.assignedByName = assignedByName;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
