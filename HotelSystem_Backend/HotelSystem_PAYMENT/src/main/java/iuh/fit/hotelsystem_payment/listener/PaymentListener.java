package iuh.fit.hotelsystem_payment.listener;


import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.dto.PaymentMessage;
import iuh.fit.hotelsystem_payment.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class PaymentListener {

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;

    public PaymentListener(PaymentRepository paymentRepository,
                           RabbitTemplate rabbitTemplate) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = RabbitConfig.PAYMENT_REQUEST_QUEUE)
    public void processPayment(PaymentMessage msg) {

        Payment payment = new Payment();
        payment.setBookingId(msg.getBookingId());
        payment.setAmount(msg.getAmount());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());

        // Demo rule to exercise both paths:
        // - even bookingId => SUCCESS
        // - odd/null bookingId => FAILED
        PaymentStatus finalStatus = (msg.getBookingId() != null && (msg.getBookingId() % 2 == 0))
                ? PaymentStatus.SUCCESS
                : PaymentStatus.FAILED;

        payment.setStatus(finalStatus);
        if (finalStatus == PaymentStatus.SUCCESS) {
            payment.setTransactionId(UUID.randomUUID().toString());
        }

        paymentRepository.save(payment);

        PaymentResultMessage result = new PaymentResultMessage();
        result.setBookingId(msg.getBookingId());
        result.setUserId(msg.getUserId());
        result.setStatus(finalStatus.name());

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                result
        );
    }
}
