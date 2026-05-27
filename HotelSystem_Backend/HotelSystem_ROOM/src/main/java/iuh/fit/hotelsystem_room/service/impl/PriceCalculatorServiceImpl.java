package iuh.fit.hotelsystem_room.service.impl;

import iuh.fit.hotelsystem_room.dto.RoomPriceResponse;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.service.PriceCalculatorService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PriceCalculatorServiceImpl implements PriceCalculatorService {

    private static final BigDecimal RIVER_POOL_VIEW_BONUS = BigDecimal.valueOf(150_000);
    private static final BigDecimal GARDEN_VIEW_BONUS = BigDecimal.valueOf(50_000);
    private static final BigDecimal BALCONY_BONUS = BigDecimal.valueOf(80_000);
    private static final BigDecimal BATHTUB_BONUS = BigDecimal.valueOf(50_000);
    private static final BigDecimal HIGH_FLOOR_BONUS = BigDecimal.valueOf(120_000);
    private static final BigDecimal TOP_FLOOR_BONUS = BigDecimal.valueOf(300_000);

    @Override
    public RoomPriceResponse calculate(Room room, LocalDate checkIn, LocalDate checkOut) {
        BigDecimal base = calculateBaseRoomPrice(room);
        List<RoomPriceResponse.NightPrice> nights = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        LocalDate cursor = checkIn;
        while (cursor.isBefore(checkOut)) {
            BigDecimal multiplier = getDateMultiplier(cursor);
            BigDecimal nightPrice = base.multiply(multiplier).setScale(0, BigDecimal.ROUND_HALF_UP);
            nights.add(RoomPriceResponse.NightPrice.builder()
                    .date(cursor)
                    .multiplier(multiplier)
                    .price(nightPrice)
                    .build());
            total = total.add(nightPrice);
            cursor = cursor.plusDays(1);
        }

        return RoomPriceResponse.builder()
                .roomId(room.getId())
                .baseRoomPrice(base)
                .nights(nights)
                .totalPrice(total)
                .build();
    }

    @Override
    public BigDecimal calculateBaseRoomPrice(Room room) {
        BigDecimal base = BigDecimal.valueOf(room.getRoomType().getBasePrice());

        // view bonus
        String view = room.getViewType();
        if (view != null) {
            String v = view.toLowerCase();
            if (v.contains("river") || v.contains("pool")) {
                base = base.add(RIVER_POOL_VIEW_BONUS);
            } else if (v.contains("garden")) {
                base = base.add(GARDEN_VIEW_BONUS);
            }
        }

        // balcony
        if (Boolean.TRUE.equals(room.getHasBalcony())) {
            base = base.add(BALCONY_BONUS);
        }

        // bathtub
        if (Boolean.TRUE.equals(room.getHasBathtub())) {
            base = base.add(BATHTUB_BONUS);
        }

        // floor level
        String level = room.getFloorLevel();
        if (level != null) {
            String l = level.toLowerCase();
            if (l.contains("top")) {
                base = base.add(TOP_FLOOR_BONUS);
            } else if (l.contains("high") || l.contains("upper")) {
                base = base.add(HIGH_FLOOR_BONUS);
            }
        } else {
            // fallback: use floorNumber if provided
            Integer floor = room.getFloorNumber();
            if (floor != null) {
                if (floor >= 20) {
                    base = base.add(TOP_FLOOR_BONUS);
                } else if (floor >= 10) {
                    base = base.add(HIGH_FLOOR_BONUS);
                }
            }
        }

        return base.setScale(0, BigDecimal.ROUND_HALF_UP);
    }

    @Override
    public BigDecimal getDateMultiplier(LocalDate date) {
        DayOfWeek d = date.getDayOfWeek();
        if (d == DayOfWeek.SATURDAY) return BigDecimal.valueOf(1.2);
        if (d == DayOfWeek.SUNDAY) return BigDecimal.valueOf(1.15);
        return BigDecimal.valueOf(1.0);
    }

    @Override
    public BigDecimal calculateNightPrice(Room room, LocalDate date) {
        BigDecimal base = calculateBaseRoomPrice(room);
        return base.multiply(getDateMultiplier(date)).setScale(0, BigDecimal.ROUND_HALF_UP);
    }

    @Override
    public BigDecimal calculateBookingTotal(Room room, LocalDate checkIn, LocalDate checkOut) {
        BigDecimal total = BigDecimal.ZERO;
        LocalDate cursor = checkIn;
        while (cursor.isBefore(checkOut)) {
            total = total.add(calculateNightPrice(room, cursor));
            cursor = cursor.plusDays(1);
        }
        return total;
    }
}
