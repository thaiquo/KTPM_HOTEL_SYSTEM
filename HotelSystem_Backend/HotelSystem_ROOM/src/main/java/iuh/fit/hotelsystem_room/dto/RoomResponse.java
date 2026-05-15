package iuh.fit.hotelsystem_room.dto;

import iuh.fit.hotelsystem_room.entity.Bed;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomType;
import iuh.fit.hotelsystem_room.entity.RoomTypeImage;

import java.io.Serializable;
import java.util.List;

public record RoomResponse(
        Long id,
        String roomNumber,
        RoomTypeResponse roomType,
        String status,
        Integer floor,
        String note,
        List<BedResponse> beds,
        Integer actualCapacity
) implements Serializable {

    public static RoomResponse from(Room room) {
        if (room == null) {
            return null;
        }

        return new RoomResponse(
                room.getId(),
                room.getRoomNumber(),
                toRoomTypeResponse(room.getRoomType()),
                room.getStatus() != null ? room.getStatus().name() : null,
                room.getFloor(),
                room.getNote(),
                room.getBeds() == null ? List.of() : room.getBeds().stream()
                        .map(RoomResponse::toBedResponse)
                        .toList(),
                room.getActualCapacity()
        );
    }

    private static RoomTypeResponse toRoomTypeResponse(RoomType roomType) {
        if (roomType == null) {
            return null;
        }

        return new RoomTypeResponse(
                roomType.getId(),
                roomType.getType(),
                roomType.getBasePrice(),
                roomType.getMaxCapacity(),
                roomType.getDefaultCapacity(),
                roomType.getDescription(),
                roomType.getImages() == null ? List.of() : roomType.getImages().stream()
                        .map(RoomResponse::toRoomTypeImageResponse)
                        .toList()
        );
    }

    private static RoomTypeImageResponse toRoomTypeImageResponse(RoomTypeImage image) {
        return new RoomTypeImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.isThumbnail()
        );
    }

    private static BedResponse toBedResponse(Bed bed) {
        return new BedResponse(
                bed.getId(),
                bed.getType() != null ? bed.getType().name() : null,
                bed.getQuantity()
        );
    }
}
