package iuh.fit.hotelsystem_room.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "room_bed_override")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomBedOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bed_type_id", nullable = false)
    private BedType bedType;

    @Column(nullable = false)
    private Integer quantity;
}
