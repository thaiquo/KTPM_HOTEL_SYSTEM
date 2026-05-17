package iuh.fit.hotelsystem_booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Room status với highlight info cho hôm nay
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class RoomTodayHighlightDto {

    private Long roomId;
    private String roomNumber;
    private String status;  // AVAILABLE, OCCUPIED, CLEANING, etc.
    
    // ─── Highlight flags ────────────────────────────────────────
    private Boolean hasCheckInToday;     // Có check-in hôm nay
    private Boolean hasCheckOutToday;    // Có checkout hôm nay
    private String highlightColor;       // CSS color để highlight: "checkin" | "checkout" | "both" | "none"
    
    private Long checkInBookingId;
    private Long checkOutBookingId;

    public RoomTodayHighlightDto() {}
}
