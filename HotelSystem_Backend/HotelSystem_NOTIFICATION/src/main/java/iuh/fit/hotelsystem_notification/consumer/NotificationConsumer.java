package iuh.fit.hotelsystem_notification.consumer;

import iuh.fit.hotelsystem_notification.dto.BookingEvent;
import iuh.fit.hotelsystem_notification.dto.PaymentResultEvent;
import iuh.fit.hotelsystem_notification.service.NotificationService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
                    "Your booking has been confirmed!"
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
                    "Your payment was successful!"
            );
        }
    }
}