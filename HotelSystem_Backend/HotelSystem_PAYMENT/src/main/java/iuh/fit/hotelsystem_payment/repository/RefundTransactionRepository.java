package iuh.fit.hotelsystem_payment.repository;

import iuh.fit.hotelsystem_payment.entity.RefundTransaction;
import iuh.fit.hotelsystem_payment.entity.RefundTransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {

    List<RefundTransaction> findByBookingIdOrderByCreatedAtAsc(Long bookingId);

    /** One round-trip for all headroom calculations during early-checkout allocation. */
    @Query("select r.originalPaymentId, coalesce(sum(r.amount), 0) from RefundTransaction r "
            + "where r.originalPaymentId in :ids and r.status <> :failed group by r.originalPaymentId")
    List<Object[]> sumAllocatedGroupedByOriginalPaymentIds(@Param("ids") List<Long> ids,
                                                           @Param("failed") RefundTransactionStatus failed);
}
