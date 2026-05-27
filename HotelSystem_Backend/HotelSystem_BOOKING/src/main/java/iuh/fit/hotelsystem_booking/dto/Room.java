package iuh.fit.hotelsystem_booking.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {
    private Long id;
    private String roomNumber;
    private String status;
    private String viewType;
    private Boolean hasBathtub;
    private RoomTypeInfo roomType;

    public RoomTypeInfo getRoomType() {
        return roomType;
    }

    public void setRoomType(RoomTypeInfo roomType) {
        this.roomType = roomType;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomTypeInfo {
        private Long id;
        private String type;
        private Double basePrice;
    }
}
