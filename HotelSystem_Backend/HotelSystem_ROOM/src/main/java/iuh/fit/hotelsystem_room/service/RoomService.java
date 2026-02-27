package iuh.fit.hotelsystem_room.service;



import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Long id) {
        return roomRepository.findById(id).orElseThrow();
    }

    public List<Room> getAvailableRooms() {
        return roomRepository.findByStatus(RoomStatus.AVAILABLE);
    }

    public Room createRoom(Room room) {
        if (room.getRoomNumber() == null || room.getRoomNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("roomNumber is required");
        }

        String normalizedRoomNumber = room.getRoomNumber().trim();
        if (roomRepository.existsByRoomNumber(normalizedRoomNumber)) {
            throw new IllegalArgumentException("roomNumber already exists");
        }

        room.setRoomNumber(normalizedRoomNumber);
        room.setType(normalize(room.getType()));

        if (room.getType() == null || room.getType().isEmpty()) {
            throw new IllegalArgumentException("type is required");
        }

        if (room.getPrice() == null || room.getPrice() < 0) {
            throw new IllegalArgumentException("price must be >= 0");
        }

        if (room.getMaxGuests() != null && room.getMaxGuests() <= 0) {
            throw new IllegalArgumentException("maxGuests must be > 0");
        }

        if (room.getBedCount() != null && room.getBedCount() <= 0) {
            throw new IllegalArgumentException("bedCount must be > 0");
        }

        room.setDescription(normalize(room.getDescription()));
        room.setImageUrl(normalize(room.getImageUrl()));

        if (room.getStatus() == null) {
            room.setStatus(RoomStatus.AVAILABLE);
        }

        return roomRepository.save(room);
    }

    public Room updateStatus(Long id, RoomStatus status) {
        Room room = roomRepository.findById(id).orElseThrow();
        room.setStatus(status);
        return roomRepository.save(room);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}