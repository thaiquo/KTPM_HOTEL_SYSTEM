package iuh.fit.hotelsystem_room.entity;

import iuh.fit.hotelsystem_room.entity.enums.BedType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "beds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BedType type; // 👉 dùng enum

    @Column(nullable = false)
    private Integer quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Room room;
}
