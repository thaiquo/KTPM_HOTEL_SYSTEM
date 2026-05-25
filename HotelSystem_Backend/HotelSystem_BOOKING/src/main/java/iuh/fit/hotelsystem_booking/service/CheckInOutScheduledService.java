package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Scheduled tasks cho check-in/check-out/cleaning automation
 */
@Service
public class CheckInOutScheduledService {

    private static final Logger log = LoggerFactory.getLogger(CheckInOutScheduledService.class);

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    public CheckInOutScheduledService(BookingRepository bookingRepository,
                                     RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Chạy mỗi giờ: Auto-cancel booking quá giờ checkout
     * - Nếu booking có checkOut = hôm nay và hiện tại > checkout time (12h) → CANCELLED
     */
    @Scheduled(fixedDelay = 3600000) // Chạy mỗi 1 giờ
    public void autoExpireCheckInPastCheckoutTime() {
        /* 
        // Vô hiệu hóa tự động hủy theo yêu cầu: Để nhân viên tự xử lý trong danh sách Quá hạn check-in
        try {
            LocalDate today = LocalDate.now();
            LocalDateTime checkoutDeadline = today.atTime(BookingConstants.CHECK_OUT_HOUR, 0);
            LocalDateTime now = LocalDateTime.now();

            // Nếu hiện tại đã qua checkout time
            if (now.isAfter(checkoutDeadline)) {
                // Tìm các booking BOOKED chưa check-in mà checkOut = hôm nay
                List<Booking> expiredBookings = new java.util.ArrayList<>();
                expiredBookings.addAll(bookingRepository.findByCheckOutAndStatusAndActualCheckInAtIsNull(
                    today,
                    BookingStatus.CONFIRMED
                ));
                expiredBookings.addAll(bookingRepository.findByCheckOutAndStatusAndActualCheckInAtIsNull(
                    today,
                    BookingStatus.DEPOSIT_PAID
                ));

                for (Booking booking : expiredBookings) {
                    // Chuyển sang CANCELLED
                    booking.setStatus(BookingStatus.CANCELLED);
                    booking.setCancelledAt(now);
                    booking.setCancellationReason("Auto-cancelled: Quá giờ checkout mà chưa check-in");
                    bookingRepository.save(booking);
                    
                    for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                        RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
                        dto.setRoomId(item.getRoomId());
                        dto.setStatus("AVAILABLE");
                        publishRoomStatus(dto);

                        log.info("Auto-expired check-in: Booking #{} room #{} - quá giờ checkout {}",
                            booking.getId(), item.getRoomId(), checkoutDeadline);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error in autoExpireCheckInPastCheckoutTime", e);
        }
        */
        log.info("autoExpireCheckInPastCheckoutTime is currently DISABLED to allow manual handling of overdue check-ins.");
    }

    /**
     * Chạy mỗi 5 phút: Auto-set Room.status = AVAILABLE khi cleaning xong (20 phút)
     */
    @Scheduled(fixedDelay = 300000) // Chạy mỗi 5 phút
    @Transactional
    public void autoCompleteCleaningAndSetAvailable() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDate today = LocalDate.now();

            // Tìm các booking có cleaningEndAt <= now
            List<Booking> completedCleanings = bookingRepository.findByCleaningEndAtIsNotNullAndCleaningEndAtLessThanEqual(now);

            for (Booking booking : completedCleanings) {
                for (iuh.fit.hotelsystem_booking.entity.BookingItem item : booking.getItems()) {
                    Long roomId = item.getRoomId();
                    
                    // Kiểm tra xem phòng này có khách đặt trước đó chưa check-in trong ngày hôm nay hay không
                    boolean hasUpcoming = bookingRepository.hasActiveUpcomingBookingToday(roomId, today);
                    String newStatus = hasUpcoming ? "RESERVED" : "AVAILABLE";

                    RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
                    dto.setRoomId(roomId);
                    dto.setStatus(newStatus);

                    publishRoomStatus(dto);

                    log.info("Auto-completed cleaning: Booking #{} room #{} → {}",
                        booking.getId(), roomId, newStatus);
                }

                // Xóa cleaningEndAt để tránh chạy lại
                booking.setCleaningEndAt(null);
                booking.setCleaningStartAt(null);
                bookingRepository.save(booking);
            }
        } catch (Exception e) {
            log.error("Error in autoCompleteCleaningAndSetAvailable", e);
        }
    }

    /**
     * Chạy khi checkout: Set cleaningStartAt + cleaningEndAt (20 phút)
     */
    public void initCleaningTimer(Booking booking) {
        LocalDateTime now = LocalDateTime.now();
        booking.setCleaningStartAt(now);
        booking.setCleaningEndAt(now.plusMinutes(20));
    }

    private void publishRoomStatus(RoomStatusUpdateDto dto) {
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.status", dto);
    }
}
