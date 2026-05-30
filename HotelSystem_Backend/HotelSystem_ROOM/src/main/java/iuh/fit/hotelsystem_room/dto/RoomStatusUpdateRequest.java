package iuh.fit.hotelsystem_room.dto;

public class RoomStatusUpdateRequest {
    private Long roomId;
    private String status;

    /** Lý do chuyển trạng thái — bắt buộc khi chuyển sang MAINTENANCE / OUT_OF_SERVICE */
    private String reason;

    /** Ghi chú tự do của nhân viên (vd: "đã dọn xong", "đã sửa xong") */
    private String note;

    /** ID nhân viên thực hiện thay đổi */
    private String changedBy;

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
}
