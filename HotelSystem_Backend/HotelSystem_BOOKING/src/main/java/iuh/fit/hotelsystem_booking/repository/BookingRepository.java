package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.userId = :userId
            ORDER BY b.createdAt DESC, b.id DESC
            """)
    List<Booking> findByUserIdWithItems(@Param("userId") Long userId);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.id = :id
            """)
    java.util.Optional<Booking> findByIdWithItems(@Param("id") Long id);

    @Query("""
            SELECT COUNT(bi) FROM Booking b
            JOIN b.items bi
            WHERE b.userId = :userId
              AND b.status IN :statuses
            """)
    long countBookedRoomsByUserAndStatuses(@Param("userId") Long userId,
                                           @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.status IN :statuses
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findByStatusInOrderByCheckInAsc(@Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT bi.roomId FROM BookingItem bi
            JOIN bi.booking b
            WHERE (
                    b.status IN (
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.DEPOSIT_PAID,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CONFIRMED,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.BOOKED,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_IN,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKED_IN,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_OUT,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKOUT_PENDING_PAYMENT
                    )
                    OR (
                        b.status IN (
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.PENDING_PAYMENT,
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.PENDING,
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.CREATED
                        )
                        AND b.holdExpiresAt IS NOT NULL
                        AND b.holdExpiresAt > CURRENT_TIMESTAMP
                    )
                  )
              AND bi.checkIn < :checkOut
              AND bi.checkOut > :checkIn
            """)
    List<Long> findBookedRoomIds(@Param("checkIn") LocalDate checkIn, @Param("checkOut") LocalDate checkOut);

    @Query("""
            select count(b) > 0 from Booking b
            join b.items bi
            where bi.roomId = :roomId
              and (
                    b.status in (
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.DEPOSIT_PAID,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CONFIRMED,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.BOOKED,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_IN,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKED_IN,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_OUT,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKOUT_PENDING_PAYMENT
                    )
                    or (
                        b.status in (
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.PENDING_PAYMENT,
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.PENDING,
                            iuh.fit.hotelsystem_booking.entity.BookingStatus.CREATED
                        )
                        and b.holdExpiresAt is not null
                        and b.holdExpiresAt > CURRENT_TIMESTAMP
                    )
                  )
              and bi.checkIn < :checkOut
              and bi.checkOut > :checkIn
            """)
    boolean existsActiveOverlapForRoom(@Param("roomId") Long roomId,
                                       @Param("checkIn") LocalDate checkIn,
                                       @Param("checkOut") LocalDate checkOut);

    @Query("""
            select count(b) > 0 from Booking b
            join b.items bi
            where b.id <> :bookingId
              and bi.roomId = :roomId
              and b.status in (
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKED_IN,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_IN,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.PARTIALLY_CHECKED_OUT,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKOUT_PENDING_PAYMENT
              )
              and bi.checkIn < :checkOut
              and bi.checkOut > :checkIn
            """)
    boolean existsOtherCheckedInOverlapForRoom(@Param("bookingId") Long bookingId,
                                               @Param("roomId") Long roomId,
                                               @Param("checkIn") LocalDate checkIn,
                                               @Param("checkOut") LocalDate checkOut);

    List<Booking> findByStatusAndHoldExpiresAtBefore(BookingStatus status, LocalDateTime now);

    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            join b.items bi
            WHERE bi.roomId = :roomId
              AND b.status IN (
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CONFIRMED,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.DEPOSIT_PAID,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.BOOKED
              )
              AND b.actualCheckInAt IS NULL
              AND bi.checkIn <= :today
              AND bi.checkOut >= :today
            """)
    boolean hasActiveUpcomingBookingToday(@Param("roomId") Long roomId, @Param("today") LocalDate today);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
              AND b.actualCheckInAt IS NULL
            """)
    List<Booking> findByCheckOutAndStatusAndActualCheckInAtIsNull(
            @Param("checkOut") LocalDate checkOut,
            @Param("status") BookingStatus status
    );

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.cleaningEndAt IS NOT NULL
              AND b.cleaningEndAt <= :now
            """)
    List<Booking> findByCleaningEndAtIsNotNullAndCleaningEndAtLessThanEqual(@Param("now") LocalDateTime now);

    List<Booking> findByCleaningStartAtIsNotNullAndCleaningEndAtIsNotNull();

        // Add quick search by booking code
        List<Booking> findByBookingCodeContainingIgnoreCase(String code);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkIn = :checkIn
              AND b.status = :status
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findByCheckInAndStatusOrderByCheckInAsc(@Param("checkIn") LocalDate checkIn,
                                                          @Param("status") BookingStatus status);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status IN :statuses
              AND b.actualCheckInAt >= :startOfDay
              AND b.actualCheckInAt < :endOfDay
            ORDER BY b.actualCheckInAt ASC, b.id ASC
            """)
    List<Booking> findActuallyCheckedInOnDate(@Param("startOfDay") LocalDateTime startOfDay,
                                             @Param("endOfDay") LocalDateTime endOfDay,
                                             @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
            ORDER BY b.checkOut ASC, b.id ASC
            """)
    List<Booking> findByCheckOutAndStatusOrderByCheckOutAsc(@Param("checkOut") LocalDate checkOut,
                                                            @Param("status") BookingStatus status);

    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkIn = :checkIn
              AND b.status = :status
              AND b.actualCheckInAt IS NOT NULL
            """)
    long countByCheckInAndStatusAndActualCheckInAtIsNotNull(@Param("checkIn") LocalDate checkIn,
                                                            @Param("status") BookingStatus status);

    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkIn = :checkIn
              AND b.status = :status
              AND b.actualCheckInAt IS NULL
            """)
    long countByCheckInAndStatusAndActualCheckInAtIsNull(@Param("checkIn") LocalDate checkIn,
                                                         @Param("status") BookingStatus status);

    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.status IN :statuses
              AND b.actualCheckInAt >= :startOfDay
              AND b.actualCheckInAt < :endOfDay
            """)
    long countActuallyCheckedInOnDate(@Param("startOfDay") LocalDateTime startOfDay,
                                     @Param("endOfDay") LocalDateTime endOfDay,
                                     @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
              AND b.actualCheckOutAt IS NOT NULL
            """)
    long countByCheckOutAndStatusAndActualCheckOutAtIsNotNull(@Param("checkOut") LocalDate checkOut,
                                                              @Param("status") BookingStatus status);

    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
              AND b.actualCheckOutAt IS NULL
            """)
    long countByCheckOutAndStatusAndActualCheckOutAtIsNull(@Param("checkOut") LocalDate checkOut,
                                                           @Param("status") BookingStatus status);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.checkIn <= :date
              AND b.status IN :statuses
              AND b.actualCheckInAt IS NULL
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findPendingCheckInOnOrBefore(@Param("date") LocalDate date,
                                               @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.checkOut <= :date
              AND b.status IN :statuses
              AND b.actualCheckOutAt IS NULL
            ORDER BY b.checkOut ASC, b.id ASC
            """)
    List<Booking> findPendingCheckOutOnOrBefore(@Param("date") LocalDate date,
                                                @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.status IN :statuses
              AND (
                    b.checkOut = :date
                    OR (b.actualCheckOutAt IS NOT NULL
                        AND b.actualCheckOutAt >= :startOfDay
                        AND b.actualCheckOutAt < :endOfDay)
                  )
            ORDER BY b.checkOut DESC, b.id DESC
            """)
    List<Booking> findCompletedCheckOutOnDate(@Param("date") LocalDate date,
                                             @Param("startOfDay") LocalDateTime startOfDay,
                                             @Param("endOfDay") LocalDateTime endOfDay,
                                             @Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.status IN :statuses
              AND b.actualCheckInAt IS NULL
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findPendingCheckInAll(@Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.status IN :statuses
              AND b.actualCheckOutAt IS NULL
            ORDER BY b.checkOut ASC, b.id ASC
            """)
    List<Booking> findPendingCheckOutAll(@Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = :status
            ORDER BY b.checkIn DESC, b.id DESC
            """)
    List<Booking> findByStatusOrderByCheckInDesc(@Param("status") BookingStatus status);

    @Query("""
            SELECT DISTINCT b FROM Booking b
            LEFT JOIN FETCH b.items
            WHERE b.status IN :statuses
            ORDER BY b.checkOut DESC, b.id DESC
            """)
    List<Booking> findCompletedCheckOutAll(@Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = iuh.fit.hotelsystem_booking.entity.BookingStatus.CANCELLED
              AND b.cancellationReason = 'EARLY_CHECKOUT_REFUND'
              AND (
                    b.checkOut = :date
                    OR (b.actualCheckOutAt IS NOT NULL
                        AND b.actualCheckOutAt >= :startOfDay
                        AND b.actualCheckOutAt < :endOfDay)
                  )
            ORDER BY b.checkOut DESC, b.id DESC
            """)
    List<Booking> findLegacyEarlyCheckoutOnDate(@Param("date") LocalDate date,
                                               @Param("startOfDay") LocalDateTime startOfDay,
                                               @Param("endOfDay") LocalDateTime endOfDay);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = iuh.fit.hotelsystem_booking.entity.BookingStatus.CANCELLED
              AND b.cancellationReason = 'EARLY_CHECKOUT_REFUND'
            ORDER BY b.checkOut DESC, b.id DESC
            """)
    List<Booking> findLegacyEarlyCheckoutAll();

    @Query("SELECT DISTINCT b FROM Booking b LEFT JOIN FETCH b.items ORDER BY b.createdAt DESC, b.id DESC")
    List<Booking> findAllByOrderByCreatedAtDesc();
}
