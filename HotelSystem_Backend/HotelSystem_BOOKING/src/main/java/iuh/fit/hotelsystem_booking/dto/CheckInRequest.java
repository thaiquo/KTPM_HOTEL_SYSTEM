package iuh.fit.hotelsystem_booking.dto;

public class CheckInRequest {
    private Long staffId;
    private String representativeCccd;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }
}
