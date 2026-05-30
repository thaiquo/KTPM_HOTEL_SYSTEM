package iuh.fit.hotelsystem_room.service;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomBedOverride;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import iuh.fit.hotelsystem_room.repository.RoomTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

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

    /**
     * Returns all rooms. Result is cached in Redis under "rooms:all".
     * Cache is evicted by RoomListener when room status/data changes via RabbitMQ events.
     */
    @Cacheable(value = "rooms:all", unless = "#result == null || #result.isEmpty()")
    public List<Room> getAllRooms() {
        log.debug("[CACHE MISS] rooms:all — loading from database");
        return roomRepository.findAllWithDetails();
    }

    /**
     * Returns a single room by ID. Cached under "rooms:detail" with the room ID as key.
     * Cache is evicted by RoomListener on room update events.
     */
    @Cacheable(value = "rooms:detail", key = "#id", unless = "#result == null")
    public Room getRoomById(Long id) {
        log.debug("[CACHE MISS] rooms:detail:{} — loading from database", id);
        return roomRepository.findByIdWithDetails(id).orElse(null);
    }

    public List<Room> getAvailableRoomsByStatus(RoomStatus status) {
        return roomRepository.findByStatusWithDetails(status);
    }

    public List<Room> getRoomsByRoomType(Long roomTypeId) {
        if (roomTypeId == null) {
            return roomRepository.findByStatusWithDetails(RoomStatus.AVAILABLE);
        }
        return roomRepository.findByRoomTypeIdAndStatusWithDetails(roomTypeId, RoomStatus.AVAILABLE);
    }

    /**
     * Returns available rooms for a date range and optional room type.
     * Cached under "rooms:available" with a composite key (roomTypeId + checkIn + checkOut).
     * TTL is 10 minutes — shorter than full list because availability changes frequently.
     */
    @Cacheable(
        value = "rooms:available",
        key = "'type:' + (#roomTypeId != null ? #roomTypeId : 'all') + ':' + #checkIn + ':' + #checkOut",
        unless = "#result == null"
    )
    public List<Room> getAvailableRooms(Long roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null || !checkIn.isBefore(checkOut)) {
            throw new IllegalArgumentException("checkIn/checkOut invalid");
        }

        log.debug("[CACHE MISS] rooms:available type={} {}~{} — computing from DB + booking-service",
                roomTypeId, checkIn, checkOut);

        List<Room> inventory = roomRepository.findAllWithDetails().stream()
                .filter(room -> roomTypeId == null
                        || (room.getRoomType() != null && roomTypeId.equals(room.getRoomType().getId())))
                .filter(room -> isBookableInventoryStatus(room.getStatus()))
                .toList();

        Set<Long> bookedRoomIds = fetchBookedRoomIds(checkIn, checkOut);
        List<Room> availableRooms = new ArrayList<>();
        for (Room room : inventory) {
            if (room.getId() != null && !bookedRoomIds.contains(room.getId())) {
                availableRooms.add(room);
            }
        }
        return availableRooms;
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "rooms:all", allEntries = true),
        @CacheEvict(value = "rooms:available", allEntries = true)
    })
    public Room createRoom(Room room) {
        if (room.getBedOverrides() != null) {
            for (RoomBedOverride bed : room.getBedOverrides()) {
                bed.setRoom(room);
            }
        }
        return roomRepository.save(room);
    }

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
            room.setActualCapacity(roomDetails.getActualCapacity());
            room.setFloorNumber(roomDetails.getFloorNumber());
            room.setAreaM2(roomDetails.getAreaM2());
            room.setViewType(roomDetails.getViewType());
            room.setHasBalcony(roomDetails.getHasBalcony());
            room.setHasBathtub(roomDetails.getHasBathtub());
            room.setSmokingPolicy(roomDetails.getSmokingPolicy());
            room.setIsAccessible(roomDetails.getIsAccessible());
            room.setIsConnecting(roomDetails.getIsConnecting());
            room.setConnectedRoomId(roomDetails.getConnectedRoomId());
            room.setFloorLevel(roomDetails.getFloorLevel());
            room.setMaintenanceStatus(roomDetails.getMaintenanceStatus());

            if (roomDetails.getBedOverrides() != null) {
                room.getBedOverrides().clear();
                for (RoomBedOverride bed : roomDetails.getBedOverrides()) {
                    bed.setRoom(room);
                    room.getBedOverrides().add(bed);
                }
            }

            return roomRepository.save(room);
        }).orElse(null);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "rooms:all", allEntries = true),
        @CacheEvict(value = "rooms:detail", key = "#id"),
        @CacheEvict(value = "rooms:available", allEntries = true)
    })
    public Room updateRoomStatus(Long id, RoomStatus status) {
        return roomRepository.findById(id).map(room -> {
            room.setStatus(status);
            return roomRepository.save(room);
        }).orElse(null);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "rooms:all", allEntries = true),
        @CacheEvict(value = "rooms:detail", key = "#id"),
        @CacheEvict(value = "rooms:available", allEntries = true)
    })
    public void deleteRoom(Long id) {
        roomRepository.deleteById(id);
    }

    private Set<Long> fetchBookedRoomIds(LocalDate checkIn, LocalDate checkOut) {
        String url = UriComponentsBuilder
                .fromHttpUrl(bookingServiceUrl)
                .path("/bookings/booked-rooms")
                .queryParam("checkIn", checkIn)
                .queryParam("checkOut", checkOut)
                .toUriString();
        try {
            Long[] bookedRoomIds = restTemplate.getForObject(url, Long[].class);
            if (bookedRoomIds == null) {
                return Set.of();
            }
            Set<Long> ids = new LinkedHashSet<>();
            for (Long roomId : bookedRoomIds) {
                if (roomId != null) {
                    ids.add(roomId);
                }
            }
            return ids;
        } catch (Exception ex) {
            throw new IllegalStateException("Could not verify room availability from booking-service", ex);
        }
    }

    private boolean isBookableInventoryStatus(RoomStatus status) {
        if (status == null) {
            return false;
        }
        return status != RoomStatus.MAINTENANCE
                && status != RoomStatus.OUT_OF_SERVICE
                && status != RoomStatus.BLOCKED;
    }
}
