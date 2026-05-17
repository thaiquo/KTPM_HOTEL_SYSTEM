package iuh.fit.hotelsystem_booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Thống kê check-in/checkout hôm nay
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class CheckInCheckOutStatsDto {

    // ─── Check-in stats ─────────────────────────────────────────
    private Long totalCheckInToday;
    private Long alreadyCheckedIn;
    private Long notYetCheckedIn;

    // ─── Checkout stats ─────────────────────────────────────────
    private Long totalCheckOutToday;
    private Long alreadyCheckedOut;
    private Long notYetCheckedOut;

    // ─── Cleaning stats ─────────────────────────────────────────
    private Long inCleaningNow;

    // ─── Messages ───────────────────────────────────────────────
    private String message;

    public CheckInCheckOutStatsDto() {}
}
