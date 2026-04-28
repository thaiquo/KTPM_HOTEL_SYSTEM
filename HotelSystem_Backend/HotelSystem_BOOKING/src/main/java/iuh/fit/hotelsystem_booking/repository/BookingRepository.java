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

    @Query("SELECT b.roomId FROM Booking b WHERE b.status != 'CANCELLED' AND b.checkIn < :checkOut AND b.checkOut > :checkIn")
    List<Long> findBookedRoomIds(@Param("checkIn") LocalDate checkIn, @Param("checkOut") LocalDate checkOut);

    List<Booking> findByStatusAndHoldExpiresAtBefore(BookingStatus status, LocalDateTime now);
}

