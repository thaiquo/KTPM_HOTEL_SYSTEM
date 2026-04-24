package iuh.fit.hotelsystem_room.controller;

import iuh.fit.hotelsystem_room.entity.RoomType;
import iuh.fit.hotelsystem_room.repository.RoomTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/room-types")
public class RoomTypeController {

    private final RoomTypeRepository roomTypeRepository;

    public RoomTypeController(RoomTypeRepository roomTypeRepository) {
        this.roomTypeRepository = roomTypeRepository;
    }

    @GetMapping
    public List<RoomType> getAllRoomTypes() {
        return roomTypeRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomType> getRoomTypeById(@PathVariable Long id) {
        return roomTypeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public RoomType createRoomType(@RequestBody RoomType roomType) {
        return roomTypeRepository.save(roomType);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomType> updateRoomType(@PathVariable Long id, @RequestBody RoomType details) {
        return roomTypeRepository.findById(id)
                .map(type -> {
                    type.setType(details.getType());
                    type.setBasePrice(details.getBasePrice());
                    type.setMaxCapacity(details.getMaxCapacity());
                    type.setDefaultCapacity(details.getDefaultCapacity());
                    type.setDescription(details.getDescription());
                    return ResponseEntity.ok(roomTypeRepository.save(type));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoomType(@PathVariable Long id) {
        roomTypeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
