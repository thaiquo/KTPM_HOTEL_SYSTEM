package iuh.fit.hotelsystem_user.dto.response;

import java.util.List;

public class ShiftDashboardResponse {
    private Long onShift;
    private Long notCheckedIn;
    private Long absent;
    private Long emptyShift;
    private String date;
    private List<ShiftDayDetailResponse> shifts;

    public ShiftDashboardResponse() {
    }

    public ShiftDashboardResponse(Long onShift, Long notCheckedIn, Long absent, Long emptyShift, String date) {
        this.onShift = onShift;
        this.notCheckedIn = notCheckedIn;
        this.absent = absent;
        this.emptyShift = emptyShift;
        this.date = date;
    }

    public Long getOnShift() {
        return onShift;
    }

    public void setOnShift(Long onShift) {
        this.onShift = onShift;
    }

    public Long getNotCheckedIn() {
        return notCheckedIn;
    }

    public void setNotCheckedIn(Long notCheckedIn) {
        this.notCheckedIn = notCheckedIn;
    }

    public Long getAbsent() {
        return absent;
    }

    public void setAbsent(Long absent) {
        this.absent = absent;
    }

    public Long getEmptyShift() {
        return emptyShift;
    }

    public void setEmptyShift(Long emptyShift) {
        this.emptyShift = emptyShift;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public List<ShiftDayDetailResponse> getShifts() {
        return shifts;
    }

    public void setShifts(List<ShiftDayDetailResponse> shifts) {
        this.shifts = shifts;
    }

    public static class ShiftDayDetailResponse {
        private Long shiftId;
        private String shiftName;
        private String startTime;
        private String endTime;
        private List<EmployeeStatusResponse> employees;

        public ShiftDayDetailResponse() {
        }

        public ShiftDayDetailResponse(Long shiftId, String shiftName, String startTime, String endTime) {
            this.shiftId = shiftId;
            this.shiftName = shiftName;
            this.startTime = startTime;
            this.endTime = endTime;
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

        public String getStartTime() {
            return startTime;
        }

        public void setStartTime(String startTime) {
            this.startTime = startTime;
        }

        public String getEndTime() {
            return endTime;
        }

        public void setEndTime(String endTime) {
            this.endTime = endTime;
        }

        public List<EmployeeStatusResponse> getEmployees() {
            return employees;
        }

        public void setEmployees(List<EmployeeStatusResponse> employees) {
            this.employees = employees;
        }
    }

    public static class EmployeeStatusResponse {
        private Long employeeId;
        private String employeeName;
        private String status;
        private String checkinTime;

        public EmployeeStatusResponse() {
        }

        public EmployeeStatusResponse(Long employeeId, String employeeName, String status, String checkinTime) {
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.status = status;
            this.checkinTime = checkinTime;
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

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getCheckinTime() {
            return checkinTime;
        }

        public void setCheckinTime(String checkinTime) {
            this.checkinTime = checkinTime;
        }
    }
}
