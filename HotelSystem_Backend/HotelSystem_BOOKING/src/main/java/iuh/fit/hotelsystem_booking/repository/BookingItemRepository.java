package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    @Query("""
            select count(bi) > 0 from BookingItem bi
            join bi.booking b
            where bi.roomId = :roomId
              and (
                    b.status in (
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.DEPOSIT_PAID,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CONFIRMED,
                        iuh.fit.hotelsystem_booking.entity.BookingStatus.CHECKED_IN,
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
