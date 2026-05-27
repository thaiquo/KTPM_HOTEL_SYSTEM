package iuh.fit.hotelsystem_payment.listener;


import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.dto.PaymentMessage;
import iuh.fit.hotelsystem_payment.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
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
        if (msg.getIdempotencyKey() != null) {
            java.util.Optional<Payment> existing = paymentRepository.findByIdempotencyKey(msg.getIdempotencyKey());
            if (existing.isPresent()) {
                sendResult(existing.get());
                return;
            }
        }

        Payment payment = new Payment();
        payment.setBookingId(msg.getBookingId());
        payment.setUserId(msg.getUserId());
        payment.setTotalAmount(msg.getAmount());
        payment.setPaidAmount(msg.getAmount());
        payment.setAmount(msg.getAmount());
        payment.setPaymentType(PaymentType.FULL);
        payment.setMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        payment.setIdempotencyKey(msg.getIdempotencyKey());

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
        sendResult(payment);
    }

    private void sendResult(Payment payment) {
        PaymentResultMessage result = new PaymentResultMessage();
        result.setBookingId(payment.getBookingId());
        result.setUserId(payment.getUserId());
        result.setStatus(payment.getStatus() == PaymentStatus.SUCCESS ? "FULL_PAID" : "FAILED");

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                result
        );
    }
}
