package iuh.fit.hotelsystem_room.entity;

import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status")
    private RoomStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private RoomStatus newStatus;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    /** Lý do chuyển trạng thái — bắt buộc khi chuyển sang MAINTENANCE / OUT_OF_SERVICE */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /** Ghi chú tự do của nhân viên (vd: "đã dọn xong", "đã sửa xong") */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** ID nhân viên thực hiện thay đổi */
    @Column(name = "changed_by")
    private String changedBy;
}
