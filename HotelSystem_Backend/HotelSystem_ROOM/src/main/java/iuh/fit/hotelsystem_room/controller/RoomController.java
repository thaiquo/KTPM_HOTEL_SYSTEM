package iuh.fit.hotelsystem_room.controller;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.service.RoomService;
import iuh.fit.hotelsystem_room.service.PriceCalculatorService;
import iuh.fit.hotelsystem_room.dto.RoomPriceResponse;
import iuh.fit.hotelsystem_room.dto.RoomStatusUpdateRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;
    private final PriceCalculatorService priceCalculatorService;

    public RoomController(RoomService roomService, PriceCalculatorService priceCalculatorService) {
        this.roomService = roomService;
        this.priceCalculatorService = priceCalculatorService;
    }

    // =========================
    // GET ALL ROOMS
    // =========================
    @GetMapping
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    // =========================
    // GET ROOM BY ID
    // =========================
    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        Room room = roomService.getRoomById(id);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(room);
    }

    // =========================
    // AVAILABLE ROOMS (SAFE VERSION)
    // =========================
    @GetMapping("/available")
    public ResponseEntity<List<Room>> getAvailableRooms(
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        // CASE 1: chưa truyền ngày -> chỉ filter theo status/type
        if (checkIn == null || checkOut == null) {

            // có roomTypeId
            if (roomTypeId != null) {
                return ResponseEntity.ok(
                        roomService.getRoomsByRoomType(roomTypeId));
            }

            // không có gì -> trả tất cả available
            return ResponseEntity.ok(
                    roomService.getAvailableRoomsByStatus(RoomStatus.AVAILABLE));
        }

        // CASE 2: có full filter
        return ResponseEntity.ok(
                roomService.getAvailableRooms(roomTypeId, checkIn, checkOut));
    }

    // =========================
    // CREATE ROOM
    // =========================
    @PostMapping
    public Room createRoom(@RequestBody Room room) {
        return roomService.createRoom(room);
    }

    // =========================
    // UPDATE ROOM
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Long id,
            @RequestBody Room roomDetails) {
        Room updated = roomService.updateRoom(id, roomDetails);

        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Room> updateRoomStatus(
            @PathVariable Long id,
            @RequestBody RoomStatusUpdateRequest request) {
        if (request == null || request.getStatus() == null || request.getStatus().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Room updated = roomService.updateRoomStatus(id, RoomStatus.valueOf(request.getStatus().trim().toUpperCase()));
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
    }

    @PutMapping("/internal/{id}/status")
    public ResponseEntity<Void> updateRoomStatusInternal(
            @PathVariable Long id,
            @RequestBody RoomStatusUpdateRequest request) {
        if (request == null || request.getStatus() == null || request.getStatus().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Room updated = roomService.updateRoomStatus(id, RoomStatus.valueOf(request.getStatus().trim().toUpperCase()));
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.noContent().build();
    }

    // =========================
    // DELETE ROOM
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    // =========================
    // PRICE CALCULATION
    // /rooms/{id}/price?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
    // =========================
    @GetMapping("/{id}/price")
    public ResponseEntity<RoomPriceResponse> getRoomPrice(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        Room room = roomService.getRoomById(id);
        if (room == null) return ResponseEntity.notFound().build();

        RoomPriceResponse resp = priceCalculatorService.calculate(room, checkIn, checkOut);
        return ResponseEntity.ok(resp);
    }
}
