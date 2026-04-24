package iuh.fit.hotelsystem_room.entity;

import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String roomNumber; // 101, 202...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    @Column(nullable = false)
    private Integer floor;

    @Column(columnDefinition = "TEXT")
    private String note;

    // 👉 cấu hình giường (QUAN TRỌNG)
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Bed> beds;

    // 👉 capacity thực tế của phòng này (có thể khác type)
    @Column(nullable = false)
    private Integer actualCapacity;
}
