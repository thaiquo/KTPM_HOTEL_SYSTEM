package iuh.fit.hotelsystem_booking.dto;

public class StaffTokenInfo {
    private final Long staffId;
    private final String role;

    public StaffTokenInfo(Long staffId, String role) {
        this.staffId = staffId;
        this.role = role;
    }

    public Long getStaffId() { return staffId; }
    public String getRole() { return role; }
}
