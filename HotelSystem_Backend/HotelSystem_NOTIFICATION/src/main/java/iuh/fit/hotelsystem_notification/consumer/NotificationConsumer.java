package iuh.fit.hotelsystem_notification.consumer;

import iuh.fit.hotelsystem_notification.dto.BookingEvent;
import iuh.fit.hotelsystem_notification.dto.PaymentResultEvent;
import iuh.fit.hotelsystem_notification.dto.RefundNotificationEvent;
import iuh.fit.hotelsystem_notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private final NotificationService notificationService;

    public NotificationConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = "notification.booking.queue")
    public void receiveBookingConfirmed(BookingEvent event) {
        log.info("Received booking event: {}", event);

        if ("CONFIRMED".equals(event.getStatus())) {
            notificationService.saveNotification(
                    event.getBookingId(),
                    event.getUserId(),
                    "BOOKING_SUCCESS",
                    "Đơn đặt phòng #" + event.getBookingId() + " đã được xác nhận thành công."
            );
        } else if ("CANCELLED".equals(event.getStatus())) {
            notificationService.saveNotification(
                    event.getBookingId(),
                    event.getUserId(),
                    "BOOKING_CANCELLED",
                    "Bạn đã hủy đặt phòng #" + event.getBookingId() + ". Nếu đơn đủ điều kiện hoàn tiền, hệ thống sẽ gửi thông báo xử lý hoàn tiền riêng."
            );
        } else if ("EXPIRED".equals(event.getStatus())) {
            notificationService.saveNotification(
                    event.getBookingId(),
                    event.getUserId(),
                    "BOOKING_EXPIRED",
                    "Đơn đặt phòng #" + event.getBookingId() + " đã hết hạn thanh toán và bị hủy tự động."
            );
        } else if ("CHECKED_IN".equals(event.getStatus()) || "BookingCheckedInEvent".equals(event.getStatus())) {
            notificationService.saveNotification(
                    event.getBookingId(),
                    event.getUserId(),
                    "CHECK_IN_SUCCESS",
                    "Check-in cho booking #" + event.getBookingId() + " da thanh cong. Chuc quy khach co ky nghi tot lanh."
            );
        }
    }

    @RabbitListener(queues = "notification.payment.queue")
    public void receivePaymentResult(PaymentResultEvent event) {
        log.info("Received payment result: {}", event);

        if ("SUCCESS".equals(event.getStatus())) {
            notificationService.saveNotification(
                    event.getBookingId(),
                    event.getUserId(),
                    "PAYMENT_SUCCESS",
                    "Thanh toán cho đặt phòng #" + event.getBookingId() + " đã thành công."
            );
        }
    }

    @RabbitListener(queues = "notification.refund.queue")
    public void receiveRefundNotification(RefundNotificationEvent event) {
        log.info("Received refund notification event: refundId={}, type={}", event.getRefundRequestId(), event.getType());
        notificationService.saveNotification(
                event.getBookingId(),
                event.getUserId(),
                event.getType() != null ? event.getType() : "REFUND_UPDATE",
                event.getMessage()
        );
    }
}
