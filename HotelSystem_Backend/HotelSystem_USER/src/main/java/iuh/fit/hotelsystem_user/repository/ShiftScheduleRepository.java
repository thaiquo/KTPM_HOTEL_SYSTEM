package iuh.fit.hotelsystem_user.repository;

import iuh.fit.hotelsystem_user.entity.ShiftSchedule;
import iuh.fit.hotelsystem_user.entity.enums.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftScheduleRepository extends JpaRepository<ShiftSchedule, Long> {
    List<ShiftSchedule> findByWeekStart(LocalDate weekStart);
    Optional<ShiftSchedule> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);
    List<ShiftSchedule> findByEmployeeIdAndWeekStart(Long employeeId, LocalDate weekStart);
    List<ShiftSchedule> findByWorkDate(LocalDate workDate);
    List<ShiftSchedule> findByWorkDateAndStatus(LocalDate workDate, ScheduleStatus status);
}
