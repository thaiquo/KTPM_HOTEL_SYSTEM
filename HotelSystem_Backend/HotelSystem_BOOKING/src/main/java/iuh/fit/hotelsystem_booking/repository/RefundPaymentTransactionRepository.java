package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundPaymentTransactionRepository extends JpaRepository<RefundPaymentTransaction, Long> {

    Optional<RefundPaymentTransaction> findByRefundRequestId(Long refundRequestId);

    List<RefundPaymentTransaction> findByRefundRequestIdOrderByCreatedAtAsc(Long refundRequestId);
}
