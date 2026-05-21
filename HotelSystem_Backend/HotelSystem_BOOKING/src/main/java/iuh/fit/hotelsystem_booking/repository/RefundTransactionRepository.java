package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {

    List<RefundTransaction> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    default List<RefundTransaction> findByBookingId(Long bookingId) {
        return findByBookingIdOrderByCreatedAtDesc(bookingId);
    }

    @Query("""
            select r from RefundTransaction r
            where r.bookingId in (
                select b.id from Booking b where b.userId = :userId
            )
            order by r.createdAt desc
            """)
    List<RefundTransaction> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    Optional<RefundTransaction> findFirstByBookingId(Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RefundTransaction r where r.id = :id")
    Optional<RefundTransaction> findByIdForUpdate(Long id);

    Optional<RefundTransaction> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<RefundTransaction> findFirstByBookingIdAndReasonOrderByCreatedAtDesc(Long bookingId, String reason);

    long countByAssignedToAndStatusIn(Long assignedTo, List<RefundStatus> statuses);

    long countByAssignedToAndStatus(Long assignedTo, RefundStatus status);

    List<RefundTransaction> findByAssignedToAndStatusInOrderByDueAtAsc(Long assignedTo, List<RefundStatus> statuses);

    List<RefundTransaction> findByStatusOrderByCreatedAtAsc(RefundStatus status);

    List<RefundTransaction> findByStatusInOrderByCreatedAtAsc(List<RefundStatus> statuses);

    List<RefundTransaction> findByStatusInAndDueAtBefore(List<RefundStatus> statuses, LocalDateTime dueAt);
}
