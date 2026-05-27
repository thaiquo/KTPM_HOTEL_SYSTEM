package iuh.fit.hotelsystem_user.service;

import iuh.fit.hotelsystem_user.dto.request.*;
import iuh.fit.hotelsystem_user.dto.response.*;
import iuh.fit.hotelsystem_user.entity.*;
import iuh.fit.hotelsystem_user.entity.enums.CheckinStatus;
import iuh.fit.hotelsystem_user.entity.enums.ScheduleStatus;
import iuh.fit.hotelsystem_user.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@Transactional
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final ShiftScheduleRepository scheduleRepository;
    private final ShiftCheckinRepository checkinRepository;
    private final UserRepository userRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_TIME;
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public ShiftService(
            ShiftRepository shiftRepository,
            ShiftScheduleRepository scheduleRepository,
            ShiftCheckinRepository checkinRepository,
            UserRepository userRepository) {
        this.shiftRepository = shiftRepository;
        this.scheduleRepository = scheduleRepository;
        this.checkinRepository = checkinRepository;
        this.userRepository = userRepository;
    }

    public List<ShiftResponse> getShifts() {
        return shiftRepository.findAll()
                .stream()
                .map(ShiftResponse::new)
                .collect(Collectors.toList());
    }

    public List<ShiftScheduleResponse> getScheduleByWeek(LocalDate weekStart) {
        return scheduleRepository.findByWeekStart(weekStart)
                .stream()
                .map(ShiftScheduleResponse::new)
                .collect(Collectors.toList());
    }

    public void saveSchedule(SaveScheduleRequest request) {
        LocalDate weekStart = LocalDate.parse(request.getWeekStart(), DATE_FORMATTER);

        for (ScheduleItemRequest item : request.getSchedules()) {
            LocalDate workDate = LocalDate.parse(item.getWorkDate(), DATE_FORMATTER);

            Optional<ShiftSchedule> existing = scheduleRepository
                    .findByEmployeeIdAndWorkDate(item.getEmployeeId(), workDate);

            ShiftSchedule schedule;
            if (existing.isPresent()) {
                schedule = existing.get();
                schedule.setUpdatedAt(LocalDateTime.now());
            } else {
                schedule = new ShiftSchedule();
                schedule.setWeekStart(weekStart);
                schedule.setWorkDate(workDate);
                schedule.setStatus(ScheduleStatus.ASSIGNED);
            }

            User employee = userRepository.findById(item.getEmployeeId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy nhân viên"));
            schedule.setEmployee(employee);

            if (item.getShiftId() != null && item.getShiftId() > 0) {
                Shift shift = shiftRepository.findById(item.getShiftId())
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy ca"));
                schedule.setShift(shift);
            } else {
                schedule.setShift(null);
            }

            schedule.setNote(item.getNote());
            scheduleRepository.save(schedule);
        }
    }

    public void copyWeek(CopyWeekRequest request) {
        LocalDate fromWeekStart = LocalDate.parse(request.getFromWeekStart(), DATE_FORMATTER);
        LocalDate toWeekStart = LocalDate.parse(request.getToWeekStart(), DATE_FORMATTER);

        List<ShiftSchedule> sourceSchedules = scheduleRepository.findByWeekStart(fromWeekStart);

        for (ShiftSchedule sourceSchedule : sourceSchedules) {
            LocalDate newWorkDate = sourceSchedule.getWorkDate()
                    .plusDays(ChronoUnit.DAYS.between(fromWeekStart, toWeekStart));

            Optional<ShiftSchedule> existing = scheduleRepository
                    .findByEmployeeIdAndWorkDate(sourceSchedule.getEmployee().getId(), newWorkDate);

            if (existing.isEmpty()) {
                ShiftSchedule newSchedule = new ShiftSchedule();
                newSchedule.setEmployee(sourceSchedule.getEmployee());
                newSchedule.setShift(sourceSchedule.getShift());
                newSchedule.setWorkDate(newWorkDate);
                newSchedule.setWeekStart(toWeekStart);
                newSchedule.setStatus(ScheduleStatus.ASSIGNED);
                newSchedule.setNote(sourceSchedule.getNote());
                scheduleRepository.save(newSchedule);
            }
        }
    }

    public void replaceShift(Long scheduleId, ReplaceShiftRequest request) {
        ShiftSchedule originalSchedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy lịch trực"));

        User replacementEmployee = userRepository.findById(request.getReplacementEmployeeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy nhân viên thay ca"));

        // Tạo lịch cho người thay ca
        ShiftSchedule replacementSchedule = new ShiftSchedule();
        replacementSchedule.setEmployee(replacementEmployee);
        replacementSchedule.setShift(originalSchedule.getShift());
        replacementSchedule.setWorkDate(originalSchedule.getWorkDate());
        replacementSchedule.setWeekStart(originalSchedule.getWeekStart());
        replacementSchedule.setStatus(ScheduleStatus.REPLACED);
        replacementSchedule.setNote("Thay ca: " + request.getReason());
        scheduleRepository.save(replacementSchedule);

        // Cập nhật lịch gốc
        originalSchedule.setStatus(ScheduleStatus.REPLACED);
        originalSchedule.setNote("Được thay bởi: " + replacementEmployee.getName());
        scheduleRepository.save(originalSchedule);
    }

    public void checkin(CheckinRequest request) {
        ShiftSchedule schedule = scheduleRepository.findById(request.getScheduleId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy lịch trực"));

        LocalDateTime checkinTime = LocalDateTime.parse(request.getCheckinTime(), DATETIME_FORMATTER);

        if (schedule.getShift() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể check-in khi không có ca trực");
        }

        LocalDateTime expectedTime = LocalDateTime.of(
                schedule.getWorkDate(),
                schedule.getShift().getStartTime());

        // Kiểm tra ± 30 phút
        LocalDateTime earliestTime = expectedTime.minusMinutes(30);
        LocalDateTime latestTime = expectedTime.plusMinutes(30);

        CheckinStatus status;
        if (checkinTime.isBefore(earliestTime)) {
            throw new ResponseStatusException(BAD_REQUEST, "Check-in quá sớm");
        } else if (checkinTime.isAfter(latestTime)) {
            status = CheckinStatus.LATE;
        } else {
            status = CheckinStatus.ON_TIME;
        }

        Optional<ShiftCheckin> existing = checkinRepository.findByScheduleId(request.getScheduleId());
        ShiftCheckin checkin;

        if (existing.isPresent()) {
            checkin = existing.get();
        } else {
            checkin = new ShiftCheckin();
            checkin.setSchedule(schedule);
            checkin.setEmployee(schedule.getEmployee());
        }

        checkin.setCheckinTime(checkinTime);
        checkin.setCheckinStatus(status);
        checkinRepository.save(checkin);

        schedule.setStatus(ScheduleStatus.CHECKED_IN);
        scheduleRepository.save(schedule);
    }

    public void checkout(CheckinRequest request) {
        ShiftCheckin checkin = checkinRepository.findByScheduleId(request.getScheduleId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy check-in"));

        LocalDateTime checkoutTime = LocalDateTime.parse(request.getCheckoutTime(), DATETIME_FORMATTER);
        checkin.setCheckoutTime(checkoutTime);
        checkinRepository.save(checkin);

        ShiftSchedule schedule = checkin.getSchedule();
        schedule.setStatus(ScheduleStatus.COMPLETED);
        scheduleRepository.save(schedule);
    }

    public ShiftDashboardResponse getDashboard(LocalDate date) {
        List<ShiftSchedule> todaySchedules = scheduleRepository.findByWorkDate(date);
        List<Shift> allShifts = shiftRepository.findAll();

        long onShift = todaySchedules.stream()
                .filter(s -> s.getStatus() == ScheduleStatus.CHECKED_IN || s.getStatus() == ScheduleStatus.COMPLETED)
                .count();

        long notCheckedIn = todaySchedules.stream()
                .filter(s -> s.getStatus() == ScheduleStatus.ASSIGNED && s.getShift() != null)
                .count();

        long absent = todaySchedules.stream()
                .filter(s -> s.getStatus() == ScheduleStatus.ABSENT)
                .count();

        long emptyShift = todaySchedules.stream()
                .filter(s -> s.getShift() == null)
                .count();

        ShiftDashboardResponse response = new ShiftDashboardResponse(
                onShift, notCheckedIn, absent, emptyShift, date.toString());

        // Tạo danh sách chi tiết các ca trong ngày
        List<ShiftDashboardResponse.ShiftDayDetailResponse> shiftDetails = new ArrayList<>();

        for (Shift shift : allShifts) {
            ShiftDashboardResponse.ShiftDayDetailResponse shiftDetail = new ShiftDashboardResponse.ShiftDayDetailResponse(
                    shift.getId(),
                    shift.getName(),
                    shift.getStartTime().toString(),
                    shift.getEndTime().toString());

            List<ShiftDashboardResponse.EmployeeStatusResponse> employees = new ArrayList<>();
            for (ShiftSchedule schedule : todaySchedules) {
                if (schedule.getShift() != null && schedule.getShift().getId().equals(shift.getId())) {
                    ShiftCheckin checkin = checkinRepository.findByScheduleId(schedule.getId()).orElse(null);
                    String status = schedule.getStatus().toString();
                    String checkinTimeStr = checkin != null && checkin.getCheckinTime() != null
                            ? checkin.getCheckinTime().toLocalTime().toString()
                            : null;

                    employees.add(new ShiftDashboardResponse.EmployeeStatusResponse(
                            schedule.getEmployee().getId(),
                            schedule.getEmployee().getName(),
                            status,
                            checkinTimeStr));
                }
            }

            shiftDetail.setEmployees(employees);
            shiftDetails.add(shiftDetail);
        }

        response.setShifts(shiftDetails);
        return response;
    }
}
