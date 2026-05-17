package iuh.fit.hotelsystem_payment.repository;

import iuh.fit.hotelsystem_payment.entity.RefundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {
    List<RefundTransaction> findByBookingId(Long bookingId);
    List<RefundTransaction> findByOriginalPaymentIdIn(List<Long> originalPaymentIds);
}
