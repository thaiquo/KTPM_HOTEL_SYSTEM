package iuh.fit.hotelsystem_room.controller;

import iuh.fit.hotelsystem_room.dto.RoomResponseDto;
import iuh.fit.hotelsystem_room.dto.RoomStatusUpdateRequest;
import iuh.fit.hotelsystem_room.dto.StaffRoomSearchRequest;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomStatusHistory;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import iuh.fit.hotelsystem_room.repository.RoomStatusHistoryRepository;
import iuh.fit.hotelsystem_room.service.RoomDtoMapper;
import iuh.fit.hotelsystem_room.service.RoomService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller dành riêng cho Staff Panel.
 * Không xử lý CRUD phòng (thêm/xóa/sửa thông tin cố định) — chỉ vận hành và theo dõi trạng thái.
 */
@RestController
@RequestMapping("/staff/rooms")
public class StaffRoomController {

    private final RoomRepository roomRepository;
    private final RoomStatusHistoryRepository historyRepository;
    private final RoomService roomService;
    private final RestTemplate restTemplate;
    private final RoomDtoMapper roomDtoMapper;

    @Value("${booking.service.url:http://booking-service:8084}")
    private String bookingServiceUrl;

    public StaffRoomController(RoomRepository roomRepository,
                               RoomStatusHistoryRepository historyRepository,
                               RoomService roomService,
                               RestTemplate restTemplate,
                               RoomDtoMapper roomDtoMapper) {
        this.roomRepository = roomRepository;
        this.historyRepository = historyRepository;
        this.roomService = roomService;
        this.restTemplate = restTemplate;
        this.roomDtoMapper = roomDtoMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /staff/rooms/search — Tìm kiếm phòng với đầy đủ filter cho Staff
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/search")
    public ResponseEntity<List<RoomResponseDto>> searchRooms(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String roomType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String viewType,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkInDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOutDate,
            @RequestParam(required = false, defaultValue = "room_asc") String sortBy
    ) {
        // 1. Lấy toàn bộ phòng có đầy đủ thông tin
        List<Room> rooms = roomRepository.findAllWithDetails();

        // 2. Lọc theo keyword (số phòng, partial match, ignore case)
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            rooms = rooms.stream()
                    .filter(r -> r.getRoomNumber() != null && r.getRoomNumber().toLowerCase().contains(kw))
                    .collect(Collectors.toList());
        }

        // 3. Lọc theo tầng
        if (floor != null) {
            rooms = rooms.stream()
                    .filter(r -> floor.equals(r.getFloorNumber()))
                    .collect(Collectors.toList());
        }

        // 4. Lọc theo loại phòng (tên type: STANDARD, DELUXE...)
        if (roomType != null && !roomType.isBlank()) {
            String rt = roomType.trim().toUpperCase();
            rooms = rooms.stream()
                    .filter(r -> r.getRoomType() != null && rt.equals(r.getRoomType().getType().toUpperCase()))
                    .collect(Collectors.toList());
        }

        // 5. Lọc theo trạng thái phòng
        if (status != null && !status.isBlank()) {
            try {
                RoomStatus rs = RoomStatus.valueOf(status.trim().toUpperCase());
                rooms = rooms.stream()
                        .filter(r -> rs.equals(r.getStatus()))
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException ignored) {
                // enum không hợp lệ → bỏ qua filter này
            }
        }

        // 6. Lọc theo viewType
        if (viewType != null && !viewType.isBlank()) {
            String vt = viewType.trim().toLowerCase();
            rooms = rooms.stream()
                    .filter(r -> r.getViewType() != null && r.getViewType().toLowerCase().contains(vt))
                    .collect(Collectors.toList());
        }

        // 7. Lọc theo sức chứa tối thiểu (actualCapacity của room)
        if (minCapacity != null) {
            rooms = rooms.stream()
                    .filter(r -> r.getActualCapacity() != null && r.getActualCapacity() >= minCapacity)
                    .collect(Collectors.toList());
        }

        // 8. Lọc theo khoảng giá (basePrice của roomType)
        if (minPrice != null) {
            rooms = rooms.stream()
                    .filter(r -> r.getRoomType() != null && r.getRoomType().getBasePrice() >= minPrice)
                    .collect(Collectors.toList());
        }
        if (maxPrice != null) {
            rooms = rooms.stream()
                    .filter(r -> r.getRoomType() != null && r.getRoomType().getBasePrice() <= maxPrice)
                    .collect(Collectors.toList());
        }

        // 9. Lọc theo khoảng ngày trống (check với booking-service)
        if (checkInDate != null && checkOutDate != null && checkInDate.isBefore(checkOutDate)) {
            try {
                Set<Long> bookedRoomIds = fetchBookedRoomIds(checkInDate, checkOutDate);
                rooms = rooms.stream()
                        .filter(r -> r.getId() != null && !bookedRoomIds.contains(r.getId()))
                        .collect(Collectors.toList());
            } catch (Exception ex) {
                // Nếu booking-service không khả dụng → không filter theo ngày, trả kết quả đầy đủ
                // Không throw exception để không làm hỏng toàn bộ search
            }
        }

        // 10. Sắp xếp
        switch (sortBy == null ? "room_asc" : sortBy) {
            case "price_asc":
                rooms.sort(Comparator.comparingDouble(r ->
                        r.getRoomType() != null ? r.getRoomType().getBasePrice() : Double.MAX_VALUE));
                break;
            case "price_desc":
                rooms.sort((a, b) -> {
                    double pa = a.getRoomType() != null ? a.getRoomType().getBasePrice() : 0;
                    double pb = b.getRoomType() != null ? b.getRoomType().getBasePrice() : 0;
                    return Double.compare(pb, pa);
                });
                break;
            case "floor_asc":
                rooms.sort(Comparator.comparingInt(r -> r.getFloorNumber() != null ? r.getFloorNumber() : 0));
                break;
            case "floor_desc":
                rooms.sort((a, b) -> {
                    int fa = a.getFloorNumber() != null ? a.getFloorNumber() : 0;
                    int fb = b.getFloorNumber() != null ? b.getFloorNumber() : 0;
                    return Integer.compare(fb, fa);
                });
                break;
            case "room_asc":
            default:
                rooms.sort(Comparator.comparing(r -> r.getRoomNumber() != null ? r.getRoomNumber() : ""));
                break;
        }

        return ResponseEntity.ok(roomDtoMapper.toRoomResponses(rooms));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /staff/rooms/{id}/status — Cập nhật trạng thái phòng bởi Staff
    // validate transition hợp lệ + ghi lịch sử
    // ─────────────────────────────────────────────────────────────────────────
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateRoomStatusByStaff(
            @PathVariable Long id,
            @RequestBody RoomStatusUpdateRequest request) {

        // 1. Validate request cơ bản
        if (request == null || request.getStatus() == null || request.getStatus().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái không được để trống"));
        }

        RoomStatus newStatus;
        try {
            newStatus = RoomStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Trạng thái không hợp lệ: " + request.getStatus(),
                    "validStatuses", Arrays.stream(RoomStatus.values()).map(Enum::name).toArray()
            ));
        }

        // 2. Validate: MAINTENANCE / OUT_OF_SERVICE phải có lý do
        if ((newStatus == RoomStatus.MAINTENANCE || newStatus == RoomStatus.OUT_OF_SERVICE)
                && (request.getReason() == null || request.getReason().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Bắt buộc nhập lý do khi chuyển sang " + newStatus.name()
            ));
        }

        // 3. Lấy phòng hiện tại
        Room room = roomRepository.findByIdWithDetails(id).orElse(null);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        RoomStatus currentStatus = room.getStatus();

        // 4. Validate transition hợp lệ theo nghiệp vụ
        String transitionError = validateTransition(currentStatus, newStatus);
        if (transitionError != null) {
            return ResponseEntity.badRequest().body(Map.of("message", transitionError));
        }

        // 5. Nếu chuyển sang MAINTENANCE / OUT_OF_SERVICE, kiểm tra booking active
        if (newStatus == RoomStatus.MAINTENANCE || newStatus == RoomStatus.OUT_OF_SERVICE) {
            boolean hasActiveBooking = checkRoomHasActiveBooking(id);
            if (hasActiveBooking) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Phòng đang có booking active. Vui lòng xử lý booking trước khi chuyển sang " + newStatus.name()
                ));
            }
        }

        // 6. Cập nhật trạng thái
        room.setStatus(newStatus);

        // Cập nhật timestamp tương ứng
        LocalDateTime now = LocalDateTime.now();
        if (newStatus == RoomStatus.AVAILABLE) {
            room.setLastCleanedAt(now);
        }
        if (newStatus == RoomStatus.MAINTENANCE || newStatus == RoomStatus.OUT_OF_SERVICE) {
            room.setLastMaintenanceAt(now);
        }

        roomRepository.save(room);

        // 7. Ghi lịch sử
        RoomStatusHistory history = RoomStatusHistory.builder()
                .room(room)
                .oldStatus(currentStatus)
                .newStatus(newStatus)
                .changedAt(now)
                .reason(request.getReason())
                .note(request.getNote())
                .changedBy(request.getChangedBy())
                .build();
        historyRepository.save(history);

        return ResponseEntity.ok(Map.of(
                "message", "Cập nhật trạng thái thành công",
                "roomId", id,
                "oldStatus", currentStatus != null ? currentStatus.name() : "null",
                "newStatus", newStatus.name()
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /staff/rooms/{id}/history — Lịch sử thay đổi trạng thái 1 phòng
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/history")
    public ResponseEntity<List<RoomStatusHistory>> getRoomStatusHistory(@PathVariable Long id) {
        List<RoomStatusHistory> histories = historyRepository.findByRoomIdOrderByChangedAtDesc(id);
        return ResponseEntity.ok(histories);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate transition hợp lệ theo nghiệp vụ khách sạn.
     * Return null nếu hợp lệ, trả message lỗi nếu không hợp lệ.
     *
     * Luật:
     * - OCCUPIED → không được chuyển trực tiếp AVAILABLE (phải checkout trước)
     * - OCCUPIED → không được chuyển MAINTENANCE/OUT_OF_SERVICE nếu có booking active (xử lý ở bước 5)
     * - RESERVED → không được chuyển AVAILABLE trực tiếp
     * - BLOCKED → chỉ ADMIN/Manager được bỏ block (ở đây staff không được bỏ)
     * - AVAILABLE → có thể chuyển sang CLEANING, MAINTENANCE, OUT_OF_SERVICE, BLOCKED
     * - CLEANING → có thể chuyển sang AVAILABLE, MAINTENANCE
     * - MAINTENANCE → có thể chuyển sang AVAILABLE, OUT_OF_SERVICE
     * - OUT_OF_SERVICE → có thể chuyển sang MAINTENANCE, AVAILABLE
     */
    private String validateTransition(RoomStatus from, RoomStatus to) {
        if (from == null) return null; // room mới chưa có trạng thái

        // Staff không được bỏ BLOCKED — chỉ Admin/Manager
        if (from == RoomStatus.BLOCKED && to == RoomStatus.AVAILABLE) {
            return "Phòng đang bị BLOCKED. Chỉ Admin/Manager mới có thể mở lại.";
        }

        // Phòng đang có khách (OCCUPIED) không được chuyển AVAILABLE hoặc CLEANING trực tiếp
        if (from == RoomStatus.OCCUPIED && to == RoomStatus.AVAILABLE) {
            return "Phòng đang có khách (OCCUPIED). Phải thực hiện checkout trước khi chuyển sang AVAILABLE.";
        }
        if (from == RoomStatus.OCCUPIED && to == RoomStatus.CLEANING) {
            return "Phòng đang có khách (OCCUPIED). Phải thực hiện checkout trước khi chuyển sang CLEANING.";
        }

        // Phòng đang được đặt (RESERVED) không được chuyển AVAILABLE trực tiếp
        if (from == RoomStatus.RESERVED && to == RoomStatus.AVAILABLE) {
            return "Phòng đang được đặt (RESERVED). Không thể chuyển sang AVAILABLE trực tiếp.";
        }

        // Các transition hợp lệ mà staff được phép thực hiện:
        Set<RoomStatus> allowed = allowedTransitions(from);
        if (!allowed.contains(to)) {
            return String.format("Không thể chuyển từ %s sang %s. Các trạng thái hợp lệ: %s",
                    from.name(), to.name(),
                    allowed.stream().map(Enum::name).collect(Collectors.joining(", ")));
        }

        return null;
    }

    private Set<RoomStatus> allowedTransitions(RoomStatus from) {
        return switch (from) {
            case AVAILABLE       -> Set.of(RoomStatus.CLEANING, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE, RoomStatus.BLOCKED);
            case OCCUPIED        -> Set.of(RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE); // checkout flow sẽ set CLEANING tự động
            case RESERVED        -> Set.of(RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE, RoomStatus.BLOCKED);
            case CLEANING        -> Set.of(RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE);
            case MAINTENANCE     -> Set.of(RoomStatus.AVAILABLE, RoomStatus.OUT_OF_SERVICE, RoomStatus.CLEANING);
            case OUT_OF_SERVICE  -> Set.of(RoomStatus.MAINTENANCE, RoomStatus.AVAILABLE, RoomStatus.CLEANING);
            case BLOCKED         -> Set.of(RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE); // staff không được AVAILABLE từ BLOCKED
        };
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
            if (bookedRoomIds == null) return Set.of();
            Set<Long> ids = new LinkedHashSet<>();
            for (Long roomId : bookedRoomIds) {
                if (roomId != null) ids.add(roomId);
            }
            return ids;
        } catch (Exception ex) {
            return Set.of(); // booking-service không khả dụng → cho phép tiếp tục
        }
    }

    /**
     * Kiểm tra phòng có booking đang active (check-in hoặc sắp check-in) không.
     * Dùng endpoint /bookings/booked-rooms với khoảng ngày hôm nay → 30 ngày tới.
     */
    private boolean checkRoomHasActiveBooking(Long roomId) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate future = today.plusDays(30);
            Set<Long> bookedIds = fetchBookedRoomIds(today, future);
            return bookedIds.contains(roomId);
        } catch (Exception ex) {
            return false;
        }
    }
}
