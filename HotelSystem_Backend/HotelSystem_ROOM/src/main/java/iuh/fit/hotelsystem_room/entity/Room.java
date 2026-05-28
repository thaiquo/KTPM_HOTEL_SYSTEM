package iuh.fit.hotelsystem_room.entity;

import iuh.fit.hotelsystem_room.entity.enums.MaintenanceStatus;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.entity.enums.SmokingPolicy;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
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
    private String roomNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    @Column(name = "actual_capacity", nullable = false)
    private Integer actualCapacity;

    @Column(name = "area_m2")
    private Double areaM2;

    @Column(name = "view_type")
    private String viewType;

    @Column(name = "has_balcony")
    private Boolean hasBalcony;

    @Column(name = "has_bathtub")
    private Boolean hasBathtub;

    @Enumerated(EnumType.STRING)
    @Column(name = "smoking_policy")
    private SmokingPolicy smokingPolicy;

    @Column(name = "is_accessible")
    private Boolean isAccessible;

    @Column(name = "is_connecting")
    private Boolean isConnecting;

    @Column(name = "connected_room_id")
    private Long connectedRoomId;

    @Column(name = "floor_number", nullable = false)
    private Integer floorNumber;

    @Column(name = "floor_level")
    private String floorLevel;

    @Column(name = "last_cleaned_at")
    private LocalDateTime lastCleanedAt;

    @Column(name = "last_maintenance_at")
    private LocalDateTime lastMaintenanceAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_status")
    private MaintenanceStatus maintenanceStatus;

    // giường được cấu hình qua bedOverrides (dùng BedType)

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 10)
    private java.util.Set<RoomAmenity> amenities;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 10)
    private java.util.Set<RoomBedOverride> bedOverrides;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 10)
    private java.util.Set<RoomStatusHistory> statusHistories;
}
