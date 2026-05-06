package iuh.fit.hotelsystem_booking.dto;

public class StaffCheckInRequest {
    private Long representativeGuestId;
    private String representativePhone;
    private String representativeCccd;

    public Long getRepresentativeGuestId() { return representativeGuestId; }
    public void setRepresentativeGuestId(Long representativeGuestId) { this.representativeGuestId = representativeGuestId; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }
}
