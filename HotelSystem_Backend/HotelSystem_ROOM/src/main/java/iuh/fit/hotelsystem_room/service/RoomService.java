package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.client.BookingServiceClient;
import iuh.fit.hotelsystem_room.entity.Bed;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import iuh.fit.hotelsystem_room.repository.RoomTypeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import java.util.stream.Collectors;
import java.util.Arrays;
import java.util.ArrayList;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingServiceClient bookingServiceClient;

    public RoomService(RoomRepository roomRepository, RoomTypeRepository roomTypeRepository,
                       BookingServiceClient bookingServiceClient) {
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.bookingServiceClient = bookingServiceClient;
    }

    /**
     * Cache danh sách tất cả phòng (TTL: 5 phút).
     * Key mặc định = tên method.
     */
    @Cacheable(value = "rooms:all")
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /**
     * Cache chi tiết phòng theo ID (TTL: 10 phút).
     */
    @Cacheable(value = "rooms:detail", key = "#id")
    public Room getRoomById(Long id) {
        return roomRepository.findById(id).orElse(null);
    }

    /**
     * Cache danh sách phòng trống theo roomTypeId + checkIn + checkOut (TTL: 2 phút).
     * Key bao gồm tất cả tham số để tránh cache nhầm.
     */
    @Cacheable(value = "rooms:available", key = "#roomTypeId + '_' + #checkIn + '_' + #checkOut")
    public List<Room> getAvailableRooms(Long roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        // 1. Lấy danh sách ID phòng đã được đặt trong khoảng thời gian này từ booking-service
        List<Long> bookedRoomIds = new ArrayList<>();
        try {
            Long[] ids = bookingServiceClient.getBookedRoomIds(checkIn.toString(), checkOut.toString());
            if (ids != null) {
                bookedRoomIds = Arrays.asList(ids);
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Nếu lỗi gọi booking-service, coi như không có phòng nào đặt
        }

        // 2. Lấy tất cả các phòng thuộc roomTypeId có status = AVAILABLE
        List<Room> allRoomsOfType = roomRepository.findByRoomTypeIdAndStatus(roomTypeId, RoomStatus.AVAILABLE);

        // 3. Lọc ra các phòng không nằm trong danh sách bookedRoomIds
        List<Long> finalBookedRoomIds = bookedRoomIds;
        return allRoomsOfType.stream()
                .filter(room -> !finalBookedRoomIds.contains(room.getId()))
                .collect(Collectors.toList());
    }

    /**
     * Tạo phòng mới và xoá cache rooms:all (vì danh sách đã thay đổi).
     */
    @Transactional
    @CacheEvict(value = "rooms:all", allEntries = true)
    public Room createRoom(Room room) {
        if (room.getBeds() != null) {
            for (Bed bed : room.getBeds()) {
                bed.setRoom(room);
            }
        }
        return roomRepository.save(room);
    }

    /**
     * Cập nhật phòng: xoá cache chi tiết phòng đó + toàn bộ rooms:all.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "rooms:all", allEntries = true),
            @CacheEvict(value = "rooms:detail", key = "#id"),
            @CacheEvict(value = "rooms:available", allEntries = true)
    })
    public Room updateRoom(Long id, Room roomDetails) {
        return roomRepository.findById(id).map(room -> {
            room.setRoomNumber(roomDetails.getRoomNumber());
            room.setRoomType(roomDetails.getRoomType());
            room.setStatus(roomDetails.getStatus());
            room.setFloor(roomDetails.getFloor());
            room.setNote(roomDetails.getNote());
            room.setActualCapacity(roomDetails.getActualCapacity());

            if (roomDetails.getBeds() != null) {
                room.getBeds().clear();
                for (Bed bed : roomDetails.getBeds()) {
                    bed.setRoom(room);
                    room.getBeds().add(bed);
                }
            }

            return roomRepository.save(room);
        }).orElse(null);
    }

    /**
     * Xoá phòng: xoá tất cả cache liên quan.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "rooms:all", allEntries = true),
            @CacheEvict(value = "rooms:detail", key = "#id"),
            @CacheEvict(value = "rooms:available", allEntries = true)
    })
    public void deleteRoom(Long id) {
        roomRepository.deleteById(id);
    }
}