package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.PaymentResult;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
//@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;


    public PaymentService(PaymentRepository paymentRepository, RabbitTemplate rabbitTemplate) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public void processPayment(Long bookingId) {

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setAmount(500.0); // giả lập
        payment.setMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());

        payment = paymentRepository.save(payment);

        // =========================
        // Giả lập thanh toán thành công
        // =========================
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(UUID.randomUUID().toString());

        paymentRepository.save(payment);

        // Gửi kết quả về Booking
        PaymentResult result = new PaymentResult();
        result.setBookingId(bookingId);
        result.setStatus(payment.getStatus().name());

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                result
        );
    }
}
