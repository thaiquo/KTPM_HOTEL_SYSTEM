package iuh.fit.hotelsystem_booking.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class BookingHistoryDTO {
    private Long id;
    private String bookingCode;
    private Long userId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private String status;
    private String paymentStatus;
    private Double finalTotal;
    private Double paidAmount;
    private LocalDateTime createdAt;
    
    // Aggregated info
    private Integer totalRooms;
    private Integer guestCount;
    private List<RoomSummary> rooms;
    
    @Data
    public static class RoomSummary {
        private Long bookingRoomId;
        private Long roomId;
        private String roomName;
        private String roomImage; // thumbnail
        private String roomTypeName;
    }
}
