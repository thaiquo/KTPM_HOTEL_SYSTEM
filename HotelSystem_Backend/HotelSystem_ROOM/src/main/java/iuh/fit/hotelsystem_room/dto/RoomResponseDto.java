package iuh.fit.hotelsystem_room.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResponseDto implements Serializable {
    private Long id;
    private String roomNumber;
    private RoomTypeDto roomType;
    private String status;
    private Integer actualCapacity;
    private Double areaM2;
    private String viewType;
    private Boolean hasBalcony;
    private Boolean hasBathtub;
    private String smokingPolicy;

    @JsonProperty("isAccessible")
    private Boolean isAccessible;

    @JsonProperty("isConnecting")
    private Boolean isConnecting;

    private Long connectedRoomId;
    private Integer floorNumber;
    private String floorLevel;
    private LocalDateTime lastCleanedAt;
    private LocalDateTime lastMaintenanceAt;
    private String maintenanceStatus;

    @Builder.Default
    private List<RoomAmenityDto> amenities = new ArrayList<>();

    @Builder.Default
    private List<RoomBedOverrideDto> bedOverrides = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomAmenityDto implements Serializable {
        private Long id;
        private AmenityDto amenity;

        @JsonProperty("isActive")
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AmenityDto implements Serializable {
        private Long id;
        private String code;
        private String name;
        private String category;

        @JsonProperty("isChargeable")
        private Boolean isChargeable;

        private String icon;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomBedOverrideDto implements Serializable {
        private Long id;
        private RoomTypeDto.BedTypeDto bedType;
        private Integer quantity;
    }
}
