package iuh.fit.hotelsystem_room.dto;

public class RoomStatusUpdateRequest {
    private Long roomId;
    private String status;

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
