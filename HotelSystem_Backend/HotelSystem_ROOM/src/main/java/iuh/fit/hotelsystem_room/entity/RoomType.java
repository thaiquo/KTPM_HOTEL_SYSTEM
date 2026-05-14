package iuh.fit.hotelsystem_room.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.List;

@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String type; // STANDARD, DELUXE...

    @Column(nullable = false)
    private Double basePrice; // giá cơ bản

    @Column(nullable = false)
    private Integer maxCapacity; // sức chứa tối đa (vd: 2, 3, 4, 6)

    @Column(nullable = false)
    private Integer defaultCapacity; // sức chứa tiêu chuẩn (vd: 2)

    @Column(columnDefinition = "TEXT")
    private String description;

    // 👉 ảnh theo loại phòng (UI dùng cái này)
    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<RoomTypeImage> images;
}
