package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.dto.RoomPriceResponse;
import iuh.fit.hotelsystem_room.entity.Room;

import java.time.LocalDate;
import java.math.BigDecimal;

public interface PriceCalculatorService {
    RoomPriceResponse calculate(Room room, LocalDate checkIn, LocalDate checkOut);

    BigDecimal calculateBaseRoomPrice(Room room);

    BigDecimal getDateMultiplier(LocalDate date);

    BigDecimal calculateNightPrice(Room room, LocalDate date);

    BigDecimal calculateBookingTotal(Room room, LocalDate checkIn, LocalDate checkOut);
}
