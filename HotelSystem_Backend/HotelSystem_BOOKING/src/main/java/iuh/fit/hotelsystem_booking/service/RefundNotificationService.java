package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.RefundNotificationEvent;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class RefundNotificationService {

    private static final Logger log = LoggerFactory.getLogger(RefundNotificationService.class);
    private static final String ROUTING_KEY = "refund.notification";

    private final RabbitTemplate rabbitTemplate;
    private final BookingRepository bookingRepository;

    public RefundNotificationService(RabbitTemplate rabbitTemplate, BookingRepository bookingRepository) {
        this.rabbitTemplate = rabbitTemplate;
        this.bookingRepository = bookingRepository;
    }

    public void notifyCreated(RefundTransaction refund, Booking booking) {
        boolean isEarlyCheckout = "EARLY_CHECKOUT_REFUND".equals(refund.getReason());
        if (isEarlyCheckout) {
            publish(refund, booking, "EARLY_CHECKOUT_REFUND_REQUESTED",
                    "Đặt phòng #" + refund.getBookingId() + " đã checkout sớm. "
                            + "Số tiền hoàn trả dự kiến: " + money(refund.getRefundAmount())
                            + ". Hoàn tiền sẽ được xử lý trong 1-3 ngày làm việc.");
        } else {
            publish(refund, booking, "REFUND_REQUESTED",
                    "Yêu cầu hoàn tiền của bạn đã được ghi nhận. Mã yêu cầu: " + refund.getId()
                            + ". Số tiền dự kiến hoàn: " + money(refund.getRefundAmount())
                            + ". Thời gian xử lý: 1-3 ngày làm việc.");
        }
    }

    public void notifyApproved(RefundTransaction refund) {
        publish(refund, resolveBooking(refund), "REFUND_APPROVED",
                "Yêu cầu hoàn tiền " + refund.getId() + " đã được duyệt. "
                        + "Hệ thống đang xử lý hoàn tiền về phương thức thanh toán ban đầu.");
    }

    public void notifyRefunded(RefundTransaction refund, String gatewayRefundTransactionId) {
        boolean isEarlyCheckout = "EARLY_CHECKOUT_REFUND".equals(refund.getReason());
        if (isEarlyCheckout) {
            publish(refund, resolveBooking(refund), "EARLY_CHECKOUT_REFUND_SUCCESS",
                    "Hoàn tiền checkout sớm thành công cho đặt phòng #" + refund.getBookingId()
                            + ". Số tiền hoàn: " + money(refund.getRefundAmount())
                            + ". Tiền đã được chuyển về phương thức thanh toán ban đầu.");
        } else {
            publish(refund, resolveBooking(refund), "REFUND_SUCCESS",
                    "Hoàn tiền thành công. Số tiền: " + money(refund.getRefundAmount())
                            + ". Mã giao dịch hoàn tiền: " + gatewayRefundTransactionId + ".");
        }
    }

    public void notifyRejected(RefundTransaction refund, String reason) {
        publish(refund, resolveBooking(refund), "REFUND_REJECTED",
                "Yêu cầu hoàn tiền " + refund.getId() + " đã bị từ chối. Lý do: " + reason + ".");
    }

    public void notifyFailed(RefundTransaction refund, String reason) {
        publish(refund, resolveBooking(refund), "REFUND_FAILED",
                "Yêu cầu hoàn tiền " + refund.getId() + " xử lý thất bại. Lý do: " + reason + ".");
    }

    private void publish(RefundTransaction refund, Booking booking, String type, String message) {
        if (booking == null) {
            log.warn("Skip refund notification because booking is missing. refundId={}", refund.getId());
            return;
        }
        RefundNotificationEvent event = new RefundNotificationEvent(
                refund.getId(),
                refund.getBookingId(),
                booking.getUserId(),
                refund.getRefundAmount(),
                refund.getStatus() != null ? refund.getStatus().name() : null,
                type,
                message);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, ROUTING_KEY, event);
        log.info("Published refund notification. refundId={}, type={}, userId={}", refund.getId(), type, booking.getUserId());
    }

    private Booking resolveBooking(RefundTransaction refund) {
        return bookingRepository.findById(refund.getBookingId()).orElse(null);
    }

    private String money(Double amount) {
        return String.format("%,.0f VND", amount != null ? amount : 0.0);
    }
}
