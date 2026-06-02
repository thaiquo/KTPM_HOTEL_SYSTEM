package iuh.fit.hotelsystem_user.controller;

import iuh.fit.hotelsystem_user.dto.request.*;
import iuh.fit.hotelsystem_user.dto.response.*;
import iuh.fit.hotelsystem_user.service.ShiftService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ShiftService shiftService;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @GetMapping
    public ResponseEntity<List<ShiftResponse>> getShifts() {
        return ResponseEntity.ok(shiftService.getShifts());
    }

    @GetMapping("/schedule")
    public ResponseEntity<List<ShiftScheduleResponse>> getScheduleByWeek(
            @RequestParam(name = "weekStart") String weekStart) {
        LocalDate weekStartDate = LocalDate.parse(weekStart, DATE_FORMATTER);
        return ResponseEntity.ok(shiftService.getScheduleByWeek(weekStartDate));
    }

    @GetMapping("/my-schedule")
    public ResponseEntity<List<ShiftScheduleResponse>> getMySchedule(
            Principal principal,
            @RequestParam(name = "weekStart") String weekStart) {
        Long employeeId = Long.parseLong(principal.getName());
        LocalDate weekStartDate = LocalDate.parse(weekStart, DATE_FORMATTER);
        return ResponseEntity.ok(shiftService.getMySchedule(employeeId, weekStartDate));
    }

    @PostMapping("/schedule/save")
    public ResponseEntity<String> saveSchedule(@RequestBody SaveScheduleRequest request) {
        shiftService.saveSchedule(request);
        return ResponseEntity.ok("Lưu lịch thành công");
    }

    @PostMapping("/schedule/copy-week")
    public ResponseEntity<String> copyWeek(@RequestBody CopyWeekRequest request) {
        shiftService.copyWeek(request);
        return ResponseEntity.ok("Copy lịch thành công");
    }

    @PatchMapping("/schedule/{id}/replace")
    public ResponseEntity<String> replaceShift(
            @PathVariable Long id,
            @RequestBody ReplaceShiftRequest request) {
        shiftService.replaceShift(id, request);
        return ResponseEntity.ok("Thay ca thành công");
    }

    @PatchMapping("/schedule/{id}/reset")
    public ResponseEntity<String> resetSchedule(@PathVariable Long id) {
        shiftService.resetSchedule(id);
        return ResponseEntity.ok("Mo lai ca thanh cong");
    }

    @PostMapping("/checkin")
    public ResponseEntity<String> checkin(Principal principal, @RequestBody CheckinRequest request) {
        Long employeeId = Long.parseLong(principal.getName());
        shiftService.checkin(request, employeeId);
        return ResponseEntity.ok("Check-in thành công");
    }

    @PostMapping("/checkout")
    public ResponseEntity<String> checkout(Principal principal, @RequestBody CheckinRequest request) {
        Long employeeId = Long.parseLong(principal.getName());
        shiftService.checkout(request, employeeId);
        return ResponseEntity.ok("Check-out thành công");
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ShiftDashboardResponse> getDashboard(
            @RequestParam(name = "date") String date) {
        LocalDate queryDate = LocalDate.parse(date, DATE_FORMATTER);
        return ResponseEntity.ok(shiftService.getDashboard(queryDate));
    }
}
