package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.dto.CheckInCheckOutStatsDto;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.StaffCheckInRequest;
import iuh.fit.hotelsystem_booking.dto.StaffRejectRefundRequest;
import iuh.fit.hotelsystem_booking.dto.StaffTokenInfo;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.service.BookingService;
import iuh.fit.hotelsystem_booking.service.RefundAssignmentService;
import iuh.fit.hotelsystem_booking.service.RefundService;
import iuh.fit.hotelsystem_booking.service.StaffAuthService;
import iuh.fit.hotelsystem_booking.service.StaffCheckInOutStatsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
public class StaffBookingController {

    private final BookingService bookingService;
    private final RefundTransactionRepository refundRepository;
    private final RefundAssignmentService refundAssignmentService;
    private final RefundService refundService;
    private final StaffAuthService staffAuthService;
    private final StaffCheckInOutStatsService statsService;

    public StaffBookingController(BookingService bookingService,
                                  RefundTransactionRepository refundRepository,
                                  RefundAssignmentService refundAssignmentService,
                                  RefundService refundService,
                                  StaffAuthService staffAuthService,
                                  StaffCheckInOutStatsService statsService) {
        this.bookingService = bookingService;
        this.refundRepository = refundRepository;
        this.refundAssignmentService = refundAssignmentService;
        this.refundService = refundService;
        this.staffAuthService = staffAuthService;
        this.statsService = statsService;
    }

    private StaffTokenInfo staff(HttpServletRequest request) {
        return staffAuthService.requireStaffOrAdmin(request);
    }

    private void ensureStaff(HttpServletRequest request) {
        staffAuthService.requireStaffOrAdmin(request);
    }

    private LocalDate resolveDate(LocalDate date) {
        return date != null ? date : statsService.todayInVietnam();
    }

    @GetMapping("/bookings/check-in-list")
    public List<Booking> checkInList(HttpServletRequest request) {
        ensureStaff(request);
        return bookingService.getStaffCheckInList();
    }

    @GetMapping("/bookings/checkout-list")
    public List<Booking> checkoutList(HttpServletRequest request) {
        ensureStaff(request);
        return bookingService.getStaffCheckoutList();
    }

    @GetMapping("/bookings/{bookingId:\\d+}")
    public Booking detail(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return bookingService.getBooking(bookingId);
    }

    @GetMapping("/bookings/{bookingId:\\d+}/guests")
    public List<BookingGuest> guests(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return bookingService.getGuests(bookingId);
    }

    @PostMapping("/bookings/{bookingId:\\d+}/check-in")
    public ResponseEntity<Booking> checkIn(HttpServletRequest httpRequest,
                                           @PathVariable Long bookingId,
                                           @RequestBody StaffCheckInRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        CheckInRequest checkInRequest = new CheckInRequest();
        checkInRequest.setStaffId(staff.getStaffId());
        checkInRequest.setRepresentativeGuestId(request.getRepresentativeGuestId());
        checkInRequest.setRepresentativePhone(request.getRepresentativePhone());
        checkInRequest.setRepresentativeCccd(request.getRepresentativeCccd());
        return ResponseEntity.ok(bookingService.checkIn(bookingId, checkInRequest));
    }

    @PutMapping("/bookings/{bookingId:\\d+}/check-in-representative")
    public ResponseEntity<Booking> updateCheckInRepresentative(HttpServletRequest httpRequest,
                                                               @PathVariable Long bookingId,
                                                               @RequestBody StaffCheckInRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        CheckInRequest checkInRequest = new CheckInRequest();
        checkInRequest.setStaffId(staff.getStaffId());
        checkInRequest.setRepresentativeGuestId(request.getRepresentativeGuestId());
        checkInRequest.setRepresentativePhone(request.getRepresentativePhone());
        checkInRequest.setRepresentativeCccd(request.getRepresentativeCccd());
        return ResponseEntity.ok(bookingService.updateCheckInRepresentative(bookingId, checkInRequest));
    }

    @GetMapping("/bookings/{bookingId:\\d+}/check-in")
    public RedirectView checkInGetNotAllowed() {
        return new RedirectView("http://localhost:3000/staff/check-in");
    }

    @PostMapping("/bookings/{bookingId:\\d+}/remaining-payment")
    public ResponseEntity<Booking> remainingPayment(HttpServletRequest httpRequest,
                                                    @PathVariable Long bookingId,
                                                    @RequestBody RemainingPaymentRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        request.setStaffId(staff.getStaffId());
        return ResponseEntity.ok(bookingService.collectRemainingPayment(bookingId, request));
    }

    @GetMapping("/bookings/{bookingId:\\d+}/remaining-payment")
    public RedirectView remainingPaymentGetNotAllowed() {
        return new RedirectView("http://localhost:3000/staff/check-in");
    }

    @PostMapping("/bookings/{bookingId:\\d+}/checkout/calculate")
    public CheckoutResponse calculateCheckout(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return bookingService.calculateCheckout(bookingId);
    }

    @PostMapping("/bookings/{bookingId:\\d+}/checkout/confirm")
    public CheckoutResponse confirmCheckout(HttpServletRequest httpRequest,
                                            @PathVariable Long bookingId,
                                            @RequestBody(required = false) CheckOutRequest body) {
        StaffTokenInfo staff = staff(httpRequest);
        CheckOutRequest request = body != null ? body : new CheckOutRequest();
        request.setStaffId(staff.getStaffId());
        return bookingService.checkout(bookingId, request);
    }

    @PostMapping("/bookings/{bookingId:\\d+}/checkout/complete")
    public Booking completeCheckout(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return bookingService.completeCheckout(bookingId);
    }

    @GetMapping("/refund-requests")
    public List<RefundTransaction> refundRequests(HttpServletRequest request) {
        ensureStaff(request);
        return refundRepository.findByStatusInOrderByCreatedAtAsc(
                List.of(RefundStatus.PENDING, RefundStatus.ASSIGNED, RefundStatus.PROCESSING));
    }

    @GetMapping("/refund-requests/{id}")
    public RefundTransaction refundDetail(HttpServletRequest request, @PathVariable Long id) {
        ensureStaff(request);
        return refundRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + id));
    }

    @PostMapping("/refund-requests/{id}/assign")
    public RefundTransaction assignRefund(HttpServletRequest request, @PathVariable Long id) {
        StaffTokenInfo staff = staff(request);
        return refundAssignmentService.assignToStaff(id, staff.getStaffId());
    }

    @PostMapping("/refund-requests/{id}/approve")
    public RefundTransaction approveRefund(HttpServletRequest request, @PathVariable Long id) {
        StaffTokenInfo staff = staff(request);
        return refundService.approveRefundByStaff(id, staff.getStaffId());
    }

    @PostMapping("/refund-requests/{id}/reject")
    public RefundTransaction rejectRefund(HttpServletRequest request,
                                          @PathVariable Long id,
                                          @RequestBody StaffRejectRefundRequest body) {
        StaffTokenInfo staff = staff(request);
        return refundService.rejectRefundByStaff(id, staff.getStaffId(), body.getReason());
    }

    @GetMapping("/bookings/check-in-today")
    public ResponseEntity<List<Booking>> getTodayCheckInList(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(statsService.getCheckInList(date));
    }

    @GetMapping("/bookings/checkout-today")
    public ResponseEntity<List<Booking>> getTodayCheckOutList(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(statsService.getCheckOutList(date));
    }

    @GetMapping("/bookings/checked-in-today")
    public ResponseEntity<List<Booking>> getAlreadyCheckedInTodayList(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(statsService.getAlreadyCheckedInList(date));
    }

    @GetMapping("/bookings/checked-out-today")
    public ResponseEntity<List<Booking>> getAlreadyCheckedOutTodayList(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(statsService.getAlreadyCheckedOutList(date));
    }

    @GetMapping("/bookings/today-stats")
    public ResponseEntity<CheckInCheckOutStatsDto> getTodayStats(
            HttpServletRequest request,
            @RequestParam(required = false) String date) {
        ensureStaff(request);
        LocalDate localDate = date != null && !date.isBlank()
                ? LocalDate.parse(date)
                : statsService.todayInVietnam();
        return ResponseEntity.ok(statsService.getStats(localDate));
    }

    @GetMapping("/rooms/today-highlight")
    public ResponseEntity<Map<String, List<Long>>> getTodayRoomHighlight(HttpServletRequest request) {
        ensureStaff(request);
        Map<String, List<Long>> result = new HashMap<>();
        result.put("checkInRooms", statsService.getTodayCheckInRoomIds());
        result.put("checkOutRooms", statsService.getTodayCheckOutRoomIds());
        return ResponseEntity.ok(result);
    }
}
