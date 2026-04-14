package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

	List<Booking> findByUserId(Long userId);

	boolean existsByRoomIdAndStatus(Long roomId, BookingStatus status);

	boolean existsByRoomIdAndStatusAndCreatedAtAfter(Long roomId, BookingStatus status, LocalDateTime after);

	/**
	 * Best-effort per-room concurrency guard.
	 * Ensures only one booking creation flow for a given roomId proceeds at a time.
	 *
	 * Returns true if the lock was acquired for the current transaction.
	 */
	@Query(value = "select pg_try_advisory_xact_lock(:lockKey)", nativeQuery = true)
	Boolean tryLockRoom(@Param("lockKey") Long lockKey);
}

