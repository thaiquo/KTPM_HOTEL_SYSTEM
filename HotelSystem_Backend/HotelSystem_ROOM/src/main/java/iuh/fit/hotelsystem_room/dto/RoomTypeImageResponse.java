package iuh.fit.hotelsystem_room.dto;

import java.io.Serializable;

public record RoomTypeImageResponse(
        Long id,
        String imageUrl,
        boolean isThumbnail
) implements Serializable {
}
