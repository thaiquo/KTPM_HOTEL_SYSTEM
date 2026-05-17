package iuh.fit.hotelsystem_booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO để update room status
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class RoomStatusUpdateDto {

    private Long roomId;
    private String status;  // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE, etc.

    public RoomStatusUpdateDto() {}
}
