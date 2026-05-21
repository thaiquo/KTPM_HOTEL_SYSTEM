package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

	List<Booking> findByUserId(Long userId);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status IN :statuses
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findByStatusInOrderByCheckInAsc(@Param("statuses") List<BookingStatus> statuses);

    @Query("SELECT b.roomId FROM Booking b WHERE b.status != 'CANCELLED' AND b.checkIn < :checkOut AND b.checkOut > :checkIn")
    List<Long> findBookedRoomIds(@Param("checkIn") LocalDate checkIn, @Param("checkOut") LocalDate checkOut);

    @Query("""
            select count(b) > 0 from Booking b
            where b.roomId = :roomId
              and b.status not in (
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CANCELLED,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.NO_SHOW,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKED_OUT,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.COMPLETED
              )
              and b.checkIn < :checkOut
              and b.checkOut > :checkIn
            """)
    boolean existsActiveOverlapForRoom(@Param("roomId") Long roomId,
                                       @Param("checkIn") LocalDate checkIn,
                                       @Param("checkOut") LocalDate checkOut);

    List<Booking> findByStatusAndHoldExpiresAtBefore(BookingStatus status, LocalDateTime now);

    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.roomId = :roomId
              AND b.status IN (
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.CONFIRMED,
                  iuh.fit.hotelsystem_booking.entity.BookingStatus.DEPOSIT_PAID
              )
              AND b.actualCheckInAt IS NULL
              AND b.checkIn <= :today
              AND b.checkOut >= :today
            """)
    boolean hasActiveUpcomingBookingToday(@Param("roomId") Long roomId, @Param("today") LocalDate today);

    // ─── Check-in/out tracking queries ───────────────────────────
    /**
     * Tìm booking chưa check-in mà đã qua giờ checkout
     * → để auto-cancel
     */
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

    /**
     * Tìm booking xong cleaning (cleaningEndAt <= now)
     * → để auto set AVAILABLE
     */
    List<Booking> findByCleaningEndAtIsNotNullAndCleaningEndAtLessThanEqual(LocalDateTime now);

    List<Booking> findByCleaningStartAtIsNotNullAndCleaningEndAtIsNotNull();

    /**
     * Tìm booking check-in hôm nay (checkIn = date)
     */
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

    /**
     * Tìm booking checkout hôm nay (checkOut = date)
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
            ORDER BY b.checkOut ASC, b.id ASC
            """)
    List<Booking> findByCheckOutAndStatusOrderByCheckOutAsc(@Param("checkOut") LocalDate checkOut,
                                                            @Param("status") BookingStatus status);

    /**
     * Đếm booking check-in hôm nay + đã check-in
     */
    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkIn = :checkIn
              AND b.status = :status
              AND b.actualCheckInAt IS NOT NULL
            """)
    long countByCheckInAndStatusAndActualCheckInAtIsNotNull(@Param("checkIn") LocalDate checkIn,
                                                            @Param("status") BookingStatus status);

    /**
     * Đếm booking check-in hôm nay + chưa check-in
     */
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

    /**
     * Đếm booking checkout hôm nay + đã checkout
     */
    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
              AND b.actualCheckOutAt IS NOT NULL
            """)
    long countByCheckOutAndStatusAndActualCheckOutAtIsNotNull(@Param("checkOut") LocalDate checkOut,
                                                              @Param("status") BookingStatus status);

    /**
     * Đếm booking checkout hôm nay + chưa checkout
     */
    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkOut = :checkOut
              AND b.status = :status
              AND b.actualCheckOutAt IS NULL
            """)
    long countByCheckOutAndStatusAndActualCheckOutAtIsNull(@Param("checkOut") LocalDate checkOut,
                                                           @Param("status") BookingStatus status);

    /**
     * Booking sẵn sàng check-in đến hạn (checkIn &lt;= date), chưa có actualCheckInAt.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkIn <= :date
              AND b.status IN :statuses
              AND b.actualCheckInAt IS NULL
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findPendingCheckInOnOrBefore(@Param("date") LocalDate date,
                                               @Param("statuses") List<BookingStatus> statuses);

    /**
     * Booking đang lưu trú, đến hạn checkout (checkOut &lt;= date), chưa hoàn tất checkout.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.checkOut <= :date
              AND b.status IN :statuses
              AND b.actualCheckOutAt IS NULL
            ORDER BY b.checkOut ASC, b.id ASC
            """)
    List<Booking> findPendingCheckOutOnOrBefore(@Param("date") LocalDate date,
                                                @Param("statuses") List<BookingStatus> statuses);

    /**
     * Booking đã checkout xong trong ngày (theo ngày checkOut hoặc actualCheckOutAt).
     */
    @Query("""
            SELECT b FROM Booking b
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
            SELECT b FROM Booking b
            WHERE b.status IN :statuses
              AND b.actualCheckInAt IS NULL
            ORDER BY b.checkIn ASC, b.id ASC
            """)
    List<Booking> findPendingCheckInAll(@Param("statuses") List<BookingStatus> statuses);

    @Query("""
            SELECT b FROM Booking b
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
            SELECT b FROM Booking b
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
}

