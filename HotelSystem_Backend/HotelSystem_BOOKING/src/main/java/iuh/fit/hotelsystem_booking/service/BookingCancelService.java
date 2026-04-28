package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class BookingCancelService {

    private static final Logger log = LoggerFactory.getLogger(BookingCancelService.class);

    private final BookingRepository bookingRepository;
    private final CancellationPolicyService policyService;
    private final RefundService refundService;
    private final RabbitTemplate rabbitTemplate;

    public BookingCancelService(BookingRepository bookingRepository,
                                CancellationPolicyService policyService,
                                RefundService refundService,
                                RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.policyService = policyService;
        this.refundService = refundService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public CancellationPolicyResult cancelBooking(Long bookingId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        CancellationPolicyResult policyResult = policyService.calculateCancellationPolicy(booking, LocalDateTime.now());
        if (!policyResult.isCanCancel()) {
            log.info("Cancel rejected. bookingId={}, reason={}", bookingId, policyResult.getReason());
            return policyResult;
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason(reason != null && !reason.isBlank() ? reason : policyResult.getReason());
        booking.setPaymentStatus(resolvePaymentStatusAfterCancel(booking, policyResult));
        bookingRepository.save(booking);

        if (policyResult.getRefundAmount() > 0) {
            refundService.createRefundTransaction(booking, policyResult);
        }

        RoomMessage roomMsg = new RoomMessage();
        roomMsg.setBookingId(booking.getId());
        roomMsg.setRoomId(booking.getRoomId());
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.release", roomMsg);

        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), "CANCELLED");
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.cancelled", event);

        log.info("Booking cancelled. bookingId={}, refundAmount={}, cancellationFee={}",
                booking.getId(), policyResult.getRefundAmount(), policyResult.getCancellationFee());
        return policyResult;
    }

    private String resolvePaymentStatusAfterCancel(Booking booking, CancellationPolicyResult policyResult) {
        if (policyResult.getRefundAmount() > 0) {
            return BookingConstants.PAYMENT_STATUS_REFUND_PENDING;
        }
        if (BookingConstants.PAYMENT_TYPE_HOTEL.equals(booking.getPaymentType())) {
            return BookingConstants.PAYMENT_STATUS_UNPAID;
        }
        return BookingConstants.PAYMENT_STATUS_NO_REFUND;
    }
}
