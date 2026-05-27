package iuh.fit.hotelsystem_booking.dto;

public class RoomChangeRequest {
    private Long fromRoomId;
    private Long toRoomId;
    private String oldRoomNextStatus;
    private String reason;

    public Long getFromRoomId() { return fromRoomId; }
    public void setFromRoomId(Long fromRoomId) { this.fromRoomId = fromRoomId; }

    public Long getToRoomId() { return toRoomId; }
    public void setToRoomId(Long toRoomId) { this.toRoomId = toRoomId; }

    public String getOldRoomNextStatus() { return oldRoomNextStatus; }
    public void setOldRoomNextStatus(String oldRoomNextStatus) { this.oldRoomNextStatus = oldRoomNextStatus; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
