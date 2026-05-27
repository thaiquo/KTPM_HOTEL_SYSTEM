package iuh.fit.hotelsystem_booking.dto;

public class BookingRoomCheckInRequest {
    private Long bookingRoomId;
    private Long representativeGuestId;
    private String representativePhone;
    private String representativeCccd;

    public Long getBookingRoomId() { return bookingRoomId; }
    public void setBookingRoomId(Long bookingRoomId) { this.bookingRoomId = bookingRoomId; }

    public Long getRepresentativeGuestId() { return representativeGuestId; }
    public void setRepresentativeGuestId(Long representativeGuestId) { this.representativeGuestId = representativeGuestId; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }
}
