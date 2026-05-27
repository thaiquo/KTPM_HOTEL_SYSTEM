package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.id = :id
            """)
    Optional<BookingItem> findByIdWithBooking(@Param("id") Long id);

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE b.id = :bookingId
            ORDER BY bi.id ASC
            """)
    List<BookingItem> findByBookingIdWithBooking(@Param("bookingId") Long bookingId);

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.checkIn <= :date
              AND bi.status IN :statuses
            ORDER BY bi.checkIn ASC, bi.id ASC
            """)
    List<BookingItem> findCheckInRoomsOnOrBefore(@Param("date") LocalDate date,
                                                 @Param("statuses") List<BookingItemStatus> statuses);

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.status = iuh.fit.hotelsystem_booking.entity.BookingItemStatus.CHECKED_IN
            ORDER BY bi.checkOut ASC, bi.id ASC
            """)
    List<BookingItem> findInHouseRooms();

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.checkOut <= :date
              AND bi.status = iuh.fit.hotelsystem_booking.entity.BookingItemStatus.CHECKED_IN
            ORDER BY bi.checkOut ASC, bi.id ASC
            """)
    List<BookingItem> findCheckOutRoomsOnOrBefore(@Param("date") LocalDate date);

    @Query("""
            select count(bi) > 0 from BookingItem bi
            join bi.booking b
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
}
