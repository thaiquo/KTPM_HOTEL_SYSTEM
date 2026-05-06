package iuh.fit.hotelsystem_booking.repository;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

	List<Booking> findByUserId(Long userId);

    List<Booking> findByStatusInOrderByCheckInAsc(List<BookingStatus> statuses);

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
}

