package iuh.fit.hotelsystem_room.controller;

import iuh.fit.hotelsystem_room.dto.RoomPriceResponse;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.service.PriceCalculatorService;
import iuh.fit.hotelsystem_room.service.RoomService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/public")
public class PublicRoomController {

    private final RoomService roomService;
    private final PriceCalculatorService priceCalculatorService;

    public PublicRoomController(RoomService roomService, PriceCalculatorService priceCalculatorService) {
        this.roomService = roomService;
        this.priceCalculatorService = priceCalculatorService;
    }

    @GetMapping("/rooms")
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/inventory")
    public List<Room> getInventory() {
        System.out.println(">>> Public inventory endpoint reached");
        return roomService.getAllRooms();
    }

    @GetMapping("/rooms/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        Room room = roomService.getRoomById(id);
        return room == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(room);
    }

    @GetMapping("/inventory/{id}")
    public ResponseEntity<Room> getInventoryById(@PathVariable Long id) {
        Room room = roomService.getRoomById(id);
        return room == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(room);
    }

    @GetMapping("/rooms/available")
    public ResponseEntity<List<Room>> getAvailableRooms(
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        if (checkIn == null || checkOut == null) {
            if (roomTypeId != null) {
                return ResponseEntity.ok(roomService.getRoomsByRoomType(roomTypeId));
            }
            return ResponseEntity.ok(roomService.getAvailableRoomsByStatus(RoomStatus.AVAILABLE));
        }

        return ResponseEntity.ok(roomService.getAvailableRooms(roomTypeId, checkIn, checkOut));
    }

    @GetMapping("/inventory/available")
    public ResponseEntity<List<Room>> getInventoryAvailable(
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        if (checkIn == null || checkOut == null) {
            if (roomTypeId != null) {
                return ResponseEntity.ok(roomService.getRoomsByRoomType(roomTypeId));
            }
            return ResponseEntity.ok(roomService.getAvailableRoomsByStatus(RoomStatus.AVAILABLE));
        }

        return ResponseEntity.ok(roomService.getAvailableRooms(roomTypeId, checkIn, checkOut));
    }

    @GetMapping("/rooms/{id}/price")
    public ResponseEntity<RoomPriceResponse> getRoomPrice(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        Room room = roomService.getRoomById(id);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(priceCalculatorService.calculate(room, checkIn, checkOut));
    }

    @GetMapping("/inventory/{id}/price")
    public ResponseEntity<RoomPriceResponse> getInventoryPrice(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        Room room = roomService.getRoomById(id);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(priceCalculatorService.calculate(room, checkIn, checkOut));
    }
}
