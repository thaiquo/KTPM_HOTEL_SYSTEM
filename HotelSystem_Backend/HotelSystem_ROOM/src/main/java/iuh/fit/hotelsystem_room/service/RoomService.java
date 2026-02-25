package iuh.fit.hotelsystem_room.service;



import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
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
        return roomRepository.save(room);
    }

    public Room updateStatus(Long id, RoomStatus status) {
        Room room = roomRepository.findById(id).orElseThrow();
        room.setStatus(status);
        return roomRepository.save(room);
    }
}