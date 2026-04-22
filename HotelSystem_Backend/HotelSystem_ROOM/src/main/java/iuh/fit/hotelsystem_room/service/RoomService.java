package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Optional<Room> getRoomById(Long id) {
        return roomRepository.findById(id);
    }

    public Room saveRoom(Room room) {
        return roomRepository.save(room);
    }

    public void deleteRoom(Long id) {
        roomRepository.deleteById(id);
    }

    public Room updateRoom(Long id, Room roomDetails) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found with id: " + id));

        room.setName(roomDetails.getName());
        room.setType(roomDetails.getType());
        room.setPrice(roomDetails.getPrice());
        room.setCapacity(roomDetails.getCapacity());
        room.setDescription(roomDetails.getDescription());
        room.setImages(roomDetails.getImages());
        room.setStatus(roomDetails.getStatus());
        room.setArea(roomDetails.getArea());
        room.setBedType(roomDetails.getBedType());
        room.setAmenities(roomDetails.getAmenities());

        return roomRepository.save(room);
    }
}