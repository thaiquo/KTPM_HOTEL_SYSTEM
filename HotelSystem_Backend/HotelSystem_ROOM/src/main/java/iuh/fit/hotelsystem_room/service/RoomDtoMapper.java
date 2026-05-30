package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.dto.RoomImageDto;
import iuh.fit.hotelsystem_room.dto.RoomResponseDto;
import iuh.fit.hotelsystem_room.dto.RoomTypeDto;
import iuh.fit.hotelsystem_room.entity.Amenity;
import iuh.fit.hotelsystem_room.entity.BedType;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomAmenity;
import iuh.fit.hotelsystem_room.entity.RoomBedOverride;
import iuh.fit.hotelsystem_room.entity.RoomType;
import iuh.fit.hotelsystem_room.entity.RoomTypeBedConfig;
import iuh.fit.hotelsystem_room.entity.RoomTypeImage;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class RoomDtoMapper {

    public RoomResponseDto toRoomResponse(Room room) {
        if (room == null) {
            return null;
        }

        return RoomResponseDto.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomType(toRoomTypeDto(room.getRoomType()))
                .status(room.getStatus() != null ? room.getStatus().name() : null)
                .actualCapacity(room.getActualCapacity())
                .areaM2(room.getAreaM2())
                .viewType(room.getViewType())
                .hasBalcony(room.getHasBalcony())
                .hasBathtub(room.getHasBathtub())
                .smokingPolicy(room.getSmokingPolicy() != null ? room.getSmokingPolicy().name() : null)
                .isAccessible(room.getIsAccessible())
                .isConnecting(room.getIsConnecting())
                .connectedRoomId(room.getConnectedRoomId())
                .floorNumber(room.getFloorNumber())
                .floorLevel(room.getFloorLevel())
                .lastCleanedAt(room.getLastCleanedAt())
                .lastMaintenanceAt(room.getLastMaintenanceAt())
                .maintenanceStatus(room.getMaintenanceStatus() != null ? room.getMaintenanceStatus().name() : null)
                .amenities(toAmenityDtos(room.getAmenities()))
                .bedOverrides(toBedOverrideDtos(room.getBedOverrides()))
                .build();
    }

    public List<RoomResponseDto> toRoomResponses(List<Room> rooms) {
        if (rooms == null || rooms.isEmpty()) {
            return new ArrayList<>();
        }
        return rooms.stream()
                .map(this::toRoomResponse)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public RoomTypeDto toRoomTypeDto(RoomType roomType) {
        if (roomType == null) {
            return null;
        }

        return RoomTypeDto.builder()
                .id(roomType.getId())
                .type(roomType.getType())
                .basePrice(roomType.getBasePrice())
                .maxCapacity(roomType.getMaxCapacity())
                .defaultCapacity(roomType.getDefaultCapacity())
                .description(roomType.getDescription())
                .images(toImageDtos(roomType.getImages()))
                .bedConfigs(toBedConfigDtos(roomType.getBedConfigs()))
                .build();
    }

    public List<RoomTypeDto> toRoomTypeDtos(List<RoomType> roomTypes) {
        if (roomTypes == null || roomTypes.isEmpty()) {
            return new ArrayList<>();
        }
        return roomTypes.stream()
                .map(this::toRoomTypeDto)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private List<RoomImageDto> toImageDtos(List<RoomTypeImage> images) {
        if (images == null || images.isEmpty()) {
            return new ArrayList<>();
        }
        return images.stream()
                .sorted(Comparator.comparing(RoomTypeImage::isThumbnail).reversed()
                        .thenComparing(image -> image.getId() != null ? image.getId() : Long.MAX_VALUE))
                .map(image -> RoomImageDto.builder()
                        .id(image.getId())
                        .imageUrl(image.getImageUrl())
                        .isThumbnail(image.isThumbnail())
                        .build())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private List<RoomTypeDto.BedConfigDto> toBedConfigDtos(Iterable<RoomTypeBedConfig> bedConfigs) {
        if (bedConfigs == null) {
            return new ArrayList<>();
        }
        List<RoomTypeDto.BedConfigDto> result = new ArrayList<>();
        for (RoomTypeBedConfig config : bedConfigs) {
            if (config == null) {
                continue;
            }
            result.add(RoomTypeDto.BedConfigDto.builder()
                    .id(config.getId())
                    .bedType(toBedTypeDto(config.getBedType()))
                    .quantity(config.getQuantity())
                    .isPrimary(config.getIsPrimary())
                    .build());
        }
        result.sort(Comparator.comparing((RoomTypeDto.BedConfigDto config) -> Boolean.TRUE.equals(config.getIsPrimary())).reversed()
                .thenComparing(config -> config.getId() != null ? config.getId() : Long.MAX_VALUE));
        return result;
    }

    private List<RoomResponseDto.RoomAmenityDto> toAmenityDtos(Iterable<RoomAmenity> amenities) {
        if (amenities == null) {
            return new ArrayList<>();
        }
        List<RoomResponseDto.RoomAmenityDto> result = new ArrayList<>();
        for (RoomAmenity roomAmenity : amenities) {
            if (roomAmenity == null) {
                continue;
            }
            Amenity amenity = roomAmenity.getAmenity();
            result.add(RoomResponseDto.RoomAmenityDto.builder()
                    .id(roomAmenity.getId())
                    .amenity(amenity == null ? null : RoomResponseDto.AmenityDto.builder()
                            .id(amenity.getId())
                            .code(amenity.getCode())
                            .name(amenity.getName())
                            .category(amenity.getCategory())
                            .isChargeable(amenity.getIsChargeable())
                            .icon(amenity.getIcon())
                            .build())
                    .isActive(roomAmenity.getIsActive())
                    .build());
        }
        result.sort(Comparator.comparing(item -> item.getId() != null ? item.getId() : Long.MAX_VALUE));
        return result;
    }

    private List<RoomResponseDto.RoomBedOverrideDto> toBedOverrideDtos(Iterable<RoomBedOverride> bedOverrides) {
        if (bedOverrides == null) {
            return new ArrayList<>();
        }
        List<RoomResponseDto.RoomBedOverrideDto> result = new ArrayList<>();
        for (RoomBedOverride override : bedOverrides) {
            if (override == null) {
                continue;
            }
            result.add(RoomResponseDto.RoomBedOverrideDto.builder()
                    .id(override.getId())
                    .bedType(toBedTypeDto(override.getBedType()))
                    .quantity(override.getQuantity())
                    .build());
        }
        result.sort(Comparator.comparing(item -> item.getId() != null ? item.getId() : Long.MAX_VALUE));
        return result;
    }

    private RoomTypeDto.BedTypeDto toBedTypeDto(BedType bedType) {
        if (bedType == null) {
            return null;
        }
        return RoomTypeDto.BedTypeDto.builder()
                .id(bedType.getId())
                .code(bedType.getCode())
                .name(bedType.getName())
                .maxOccupantsPerBed(bedType.getMaxOccupantsPerBed())
                .build();
    }
}
