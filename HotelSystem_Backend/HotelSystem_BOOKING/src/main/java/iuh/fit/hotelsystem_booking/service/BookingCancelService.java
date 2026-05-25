package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;

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

        LocalDateTime now = ZonedDateTime.now(iuh.fit.hotelsystem_booking.config.TimeConfig.VIETNAM_ZONE).toLocalDateTime();
        CancellationPolicyResult policyResult = policyService.calculateCancellationPolicy(booking, now);
        if (!policyResult.isCanCancel()) {
            log.info("Cancel rejected. bookingId={}, reason={}", bookingId, policyResult.getReason());
            return policyResult;
        }

        // Mark booking as cancellation-requested before delegating to refund service.
        // This keeps repeated cancellation calls idempotent even when RefundService is mocked.
        booking.setStatus(BookingStatus.CANCEL_REQUESTED);
        booking.setCancellationReason(reason != null && !reason.isBlank() ? reason : policyResult.getReason());
        booking.setPaymentStatus(policyResult.getRefundAmount() > 0
            ? iuh.fit.hotelsystem_booking.constants.BookingConstants.PAYMENT_STATUS_REFUND_PENDING
            : iuh.fit.hotelsystem_booking.constants.BookingConstants.PAYMENT_STATUS_NO_REFUND);
        bookingRepository.save(booking);

        refundService.createCancellationRequest(booking, policyResult,
                reason != null && !reason.isBlank() ? reason : policyResult.getReason());

        log.info("Booking cancellation requested. bookingId={}, refundAmount={}, cancellationFee={}",
                booking.getId(), policyResult.getRefundAmount(), policyResult.getCancellationFee());
        return policyResult;
    }
}
