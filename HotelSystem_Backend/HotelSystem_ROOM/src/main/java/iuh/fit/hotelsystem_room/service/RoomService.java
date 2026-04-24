package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.entity.Bed;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import iuh.fit.hotelsystem_room.repository.RoomTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.ArrayList;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RestTemplate restTemplate;

    @Value("${booking.service.url:http://booking-service:8084}")
    private String bookingServiceUrl;

    public RoomService(RoomRepository roomRepository, RoomTypeRepository roomTypeRepository, RestTemplate restTemplate) {
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.restTemplate = restTemplate;
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Long id) {
        return roomRepository.findById(id).orElse(null);
    }

    public List<Room> getAvailableRooms(Long roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        // 1. Lấy danh sách ID phòng đã được đặt trong khoảng thời gian này từ booking-service
        String url = bookingServiceUrl + "/bookings/booked-rooms?checkIn=" + checkIn + "&checkOut=" + checkOut;
        List<Long> bookedRoomIds = new ArrayList<>();
        try {
            Long[] ids = restTemplate.getForObject(url, Long[].class);
            if (ids != null) {
                bookedRoomIds = Arrays.asList(ids);
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Nếu lỗi gọi booking-service, có thể ném exception hoặc coi như không có phòng nào đặt
        }

        // 2. Lấy tất cả các phòng thuộc roomTypeId có status = AVAILABLE
        List<Room> allRoomsOfType = roomRepository.findByRoomTypeIdAndStatus(roomTypeId, RoomStatus.AVAILABLE);

        // 3. Lọc ra các phòng không nằm trong danh sách bookedRoomIds
        List<Long> finalBookedRoomIds = bookedRoomIds;
        return allRoomsOfType.stream()
                .filter(room -> !finalBookedRoomIds.contains(room.getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public Room createRoom(Room room) {
        // Gán ngược reference từ Bed về Room để JPA lưu đúng
        if (room.getBeds() != null) {
            for (Bed bed : room.getBeds()) {
                bed.setRoom(room);
            }
        }
        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(Long id, Room roomDetails) {
        return roomRepository.findById(id).map(room -> {
            room.setRoomNumber(roomDetails.getRoomNumber());
            room.setRoomType(roomDetails.getRoomType());
            room.setStatus(roomDetails.getStatus());
            room.setFloor(roomDetails.getFloor());
            room.setNote(roomDetails.getNote());
            room.setActualCapacity(roomDetails.getActualCapacity());
            
            // Xử lý danh sách giường mới
            if (roomDetails.getBeds() != null) {
                // Xóa giường cũ (JPA orphanRemoval sẽ lo nếu được cấu hình, 
                // nhưng ở đây ta làm thủ công cho chắc chắn)
                room.getBeds().clear();
                for (Bed bed : roomDetails.getBeds()) {
                    bed.setRoom(room);
                    room.getBeds().add(bed);
                }
            }
            
            return roomRepository.save(room);
        }).orElse(null);
    }

    @Transactional
    public void deleteRoom(Long id) {
        roomRepository.deleteById(id);
    }
}