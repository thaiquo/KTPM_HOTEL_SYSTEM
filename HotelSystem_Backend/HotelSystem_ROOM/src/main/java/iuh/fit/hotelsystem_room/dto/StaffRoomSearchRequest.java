package iuh.fit.hotelsystem_room.dto;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * DTO cho Staff Room Search — tất cả filter đều optional.
 * Backend xử lý kết hợp lọc tĩnh (floor, type, status…) và lọc động (khoảng ngày trống).
 */
public class StaffRoomSearchRequest {

    /** Tìm theo số phòng (partial match, ignore case) */
    private String keyword;

    /** Lọc theo tầng */
    private Integer floor;

    /** Lọc theo loại phòng (tên type: STANDARD, DELUXE...) */
    private String roomType;

    /** Lọc theo trạng thái phòng (RoomStatus enum string) */
    private String status;

    /** Lọc theo viewType (City View, River View…) */
    private String viewType;

    /** Lọc theo sức chứa tối thiểu */
    private Integer minCapacity;

    /** Lọc theo giá tối thiểu (basePrice của roomType) */
    private Double minPrice;

    /** Lọc theo giá tối đa */
    private Double maxPrice;

    /** Tìm phòng trống trong khoảng ngày này */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkInDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkOutDate;

    /** Sắp xếp: price_asc, price_desc, floor_asc, floor_desc, room_asc */
    private String sortBy;

    // ─── Getters / Setters ────────────────────────────────────────────────

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getViewType() { return viewType; }
    public void setViewType(String viewType) { this.viewType = viewType; }

    public Integer getMinCapacity() { return minCapacity; }
    public void setMinCapacity(Integer minCapacity) { this.minCapacity = minCapacity; }

    public Double getMinPrice() { return minPrice; }
    public void setMinPrice(Double minPrice) { this.minPrice = minPrice; }

    public Double getMaxPrice() { return maxPrice; }
    public void setMaxPrice(Double maxPrice) { this.maxPrice = maxPrice; }

    public LocalDate getCheckInDate() { return checkInDate; }
    public void setCheckInDate(LocalDate checkInDate) { this.checkInDate = checkInDate; }

    public LocalDate getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }

    public String getSortBy() { return sortBy; }
    public void setSortBy(String sortBy) { this.sortBy = sortBy; }
}
