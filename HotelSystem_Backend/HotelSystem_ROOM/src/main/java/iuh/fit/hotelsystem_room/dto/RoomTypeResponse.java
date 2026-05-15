package iuh.fit.hotelsystem_room.dto;

import java.io.Serializable;
import java.util.List;

public record RoomTypeResponse(
        Long id,
        String type,
        Double basePrice,
        Integer maxCapacity,
        Integer defaultCapacity,
        String description,
        List<RoomTypeImageResponse> images
) implements Serializable {
}
