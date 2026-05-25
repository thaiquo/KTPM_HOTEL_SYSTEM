package iuh.fit.hotelsystem_room.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomPriceResponse {
    private Long roomId;
    private BigDecimal baseRoomPrice;
    private List<NightPrice> nights;
    private BigDecimal totalPrice;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NightPrice {
        private LocalDate date;
        private BigDecimal multiplier;
        private BigDecimal price;
    }
}
