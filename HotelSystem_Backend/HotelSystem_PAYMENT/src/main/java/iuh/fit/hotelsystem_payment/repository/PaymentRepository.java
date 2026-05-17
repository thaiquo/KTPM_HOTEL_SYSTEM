package iuh.fit.hotelsystem_payment.repository;

import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionId(String transactionId);

    Optional<Payment> findByPaymentCode(String paymentCode);

    List<Payment> findByBookingId(Long bookingId);

    List<Payment> findAllByOrderByCreatedAtDesc();

    Optional<Payment> findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(Long bookingId, PaymentType paymentType);

    Optional<Payment> findTopByBookingIdAndPaymentTypeAndStatusOrderByCreatedAtDesc(
            Long bookingId,
            PaymentType paymentType,
            PaymentStatus status
    );

    boolean existsByBookingIdAndPaymentTypeAndStatus(Long bookingId, PaymentType paymentType, PaymentStatus status);

    boolean existsByBookingIdAndStatus(Long bookingId, PaymentStatus status);

    Optional<Payment> findTopByBookingIdAndStatusOrderByCreatedAtDesc(Long bookingId, PaymentStatus status);

    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
}
