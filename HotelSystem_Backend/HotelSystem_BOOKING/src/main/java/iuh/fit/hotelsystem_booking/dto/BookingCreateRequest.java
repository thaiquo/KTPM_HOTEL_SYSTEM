package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class BookingCreateRequest {
    // Supplying multiple rooms for a single booking (Cart)
    private List<RoomBookingRequest> rooms = new ArrayList<>();
    
    private Long userId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private String paymentType;
    private String ratePlan;
    private String source;
    private String notes;
    private Integer guestCount;
    private Integer roomCapacitySnapshot;
    private GuestRequest primaryGuest;
    private List<GuestRequest> guests = new ArrayList<>();

    public List<RoomBookingRequest> getRooms() { return rooms; }
    public void setRooms(List<RoomBookingRequest> rooms) { this.rooms = rooms; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }

    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public String getRatePlan() { return ratePlan; }
    public void setRatePlan(String ratePlan) { this.ratePlan = ratePlan; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }

    public Integer getRoomCapacitySnapshot() { return roomCapacitySnapshot; }
    public void setRoomCapacitySnapshot(Integer roomCapacitySnapshot) { this.roomCapacitySnapshot = roomCapacitySnapshot; }

    public GuestRequest getPrimaryGuest() { return primaryGuest; }
    public void setPrimaryGuest(GuestRequest primaryGuest) { this.primaryGuest = primaryGuest; }

    public List<GuestRequest> getGuests() { return guests; }
    public void setGuests(List<GuestRequest> guests) { this.guests = guests; }

    public static class RoomBookingRequest {
        private Long roomId;
        private Long roomTypeId;
        private Double priceSnapshot;
        private List<GuestRequest> guests = new ArrayList<>();

        public Long getRoomId() { return roomId; }
        public void setRoomId(Long roomId) { this.roomId = roomId; }

        public Long getRoomTypeId() { return roomTypeId; }
        public void setRoomTypeId(Long roomTypeId) { this.roomTypeId = roomTypeId; }

        public Double getPriceSnapshot() { return priceSnapshot; }
        public void setPriceSnapshot(Double priceSnapshot) { this.priceSnapshot = priceSnapshot; }

        public List<GuestRequest> getGuests() { return guests; }
        public void setGuests(List<GuestRequest> guests) { this.guests = guests; }
    }
}
