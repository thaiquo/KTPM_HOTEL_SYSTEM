package iuh.fit.hotelsystem_room.dto;

import java.io.Serializable;

public record BedResponse(
        Long id,
        String type,
        Integer quantity
) implements Serializable {
}
