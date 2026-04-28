package iuh.fit.hotelsystem_booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingEvent {
    private Long bookingId;
    private Long userId;
    private String status;
}
