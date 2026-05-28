package iuh.fit.hotelsystem_user.repository;

import iuh.fit.hotelsystem_user.entity.ShiftCheckin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShiftCheckinRepository extends JpaRepository<ShiftCheckin, Long> {
    Optional<ShiftCheckin> findByScheduleId(Long scheduleId);
    List<ShiftCheckin> findByCheckinTimeBetween(LocalDateTime from, LocalDateTime to);

    @Query("""
        select c from ShiftCheckin c
        where (:employeeId is null or c.employee.id = :employeeId)
          and (:shiftId is null or c.schedule.shift.id = :shiftId)
          and (:from is null or c.checkinTime >= :from)
          and (:to is null or c.checkinTime <= :to)
          and (:keyword is null or :keyword = ''
               or lower(c.employee.name) like lower(concat('%', :keyword, '%')))
        order by c.checkinTime desc
        """)
    Page<ShiftCheckin> searchHistory(
            @Param("employeeId") Long employeeId,
            @Param("shiftId") Long shiftId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("keyword") String keyword,
            Pageable pageable);
}
