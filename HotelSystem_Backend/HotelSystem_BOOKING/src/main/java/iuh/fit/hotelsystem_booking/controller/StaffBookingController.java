package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.StaffCheckInRequest;
import iuh.fit.hotelsystem_booking.dto.StaffRejectRefundRequest;
import iuh.fit.hotelsystem_booking.dto.StaffTokenInfo;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.service.BookingService;
import iuh.fit.hotelsystem_booking.service.RefundAssignmentService;
import iuh.fit.hotelsystem_booking.service.RefundService;
import iuh.fit.hotelsystem_booking.service.StaffAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffBookingController {

    private final BookingService bookingService;
    private final RefundTransactionRepository refundRepository;
    private final RefundAssignmentService refundAssignmentService;
    private final RefundService refundService;
    private final StaffAuthService staffAuthService;

    public StaffBookingController(BookingService bookingService,
                                  RefundTransactionRepository refundRepository,
                                  RefundAssignmentService refundAssignmentService,
                                  RefundService refundService,
                                  StaffAuthService staffAuthService) {
        this.bookingService = bookingService;
        this.refundRepository = refundRepository;
        this.refundAssignmentService = refundAssignmentService;
        this.refundService = refundService;
        this.staffAuthService = staffAuthService;
    }

    @GetMapping("/bookings/check-in-list")
    public List<Booking> checkInList(@RequestHeader("Authorization") String authorization) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return bookingService.getStaffCheckInList();
    }

    @GetMapping("/bookings/checkout-list")
    public List<Booking> checkoutList(@RequestHeader("Authorization") String authorization) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return bookingService.getStaffCheckoutList();
    }

    @GetMapping("/bookings/{bookingId}")
    public Booking detail(@RequestHeader("Authorization") String authorization,
                          @PathVariable Long bookingId) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return bookingService.getBooking(bookingId);
    }

    @PostMapping("/bookings/{bookingId}/check-in")
    public ResponseEntity<Booking> checkIn(@RequestHeader("Authorization") String authorization,
                                           @PathVariable Long bookingId,
                                           @RequestBody StaffCheckInRequest request) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        CheckInRequest checkInRequest = new CheckInRequest();
        checkInRequest.setStaffId(staff.getStaffId());
        checkInRequest.setRepresentativeCccd(request.getRepresentativeCccd());
        return ResponseEntity.ok(bookingService.checkIn(bookingId, checkInRequest));
    }

    @GetMapping("/bookings/{bookingId}/check-in")
    public RedirectView checkInGetNotAllowed() {
        return new RedirectView("http://localhost:3000/staff/check-in");
    }

    @PostMapping("/bookings/{bookingId}/remaining-payment")
    public ResponseEntity<Booking> remainingPayment(@RequestHeader("Authorization") String authorization,
                                                    @PathVariable Long bookingId,
                                                    @RequestBody RemainingPaymentRequest request) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        request.setStaffId(staff.getStaffId());
        return ResponseEntity.ok(bookingService.collectRemainingPayment(bookingId, request));
    }

    @GetMapping("/bookings/{bookingId}/remaining-payment")
    public RedirectView remainingPaymentGetNotAllowed() {
        return new RedirectView("http://localhost:3000/staff/check-in");
    }

    @PostMapping("/bookings/{bookingId}/checkout/calculate")
    public CheckoutResponse calculateCheckout(@RequestHeader("Authorization") String authorization,
                                              @PathVariable Long bookingId) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return bookingService.calculateCheckout(bookingId);
    }

    @PostMapping("/bookings/{bookingId}/checkout/confirm")
    public CheckoutResponse confirmCheckout(@RequestHeader("Authorization") String authorization,
                                            @PathVariable Long bookingId) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(staff.getStaffId());
        return bookingService.checkout(bookingId, request);
    }

    @PostMapping("/bookings/{bookingId}/checkout/complete")
    public Booking completeCheckout(@RequestHeader("Authorization") String authorization,
                                    @PathVariable Long bookingId) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return bookingService.completeCheckout(bookingId);
    }

    @GetMapping("/refund-requests")
    public List<RefundTransaction> refundRequests(@RequestHeader("Authorization") String authorization) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return refundRepository.findByStatusInOrderByCreatedAtAsc(
                List.of(RefundStatus.PENDING, RefundStatus.ASSIGNED, RefundStatus.PROCESSING));
    }

    @GetMapping("/refund-requests/{id}")
    public RefundTransaction refundDetail(@RequestHeader("Authorization") String authorization,
                                          @PathVariable Long id) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return refundRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + id));
    }

    @PostMapping("/refund-requests/{id}/assign")
    public RefundTransaction assignRefund(@RequestHeader("Authorization") String authorization,
                                          @PathVariable Long id) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        return refundAssignmentService.assignToStaff(id, staff.getStaffId());
    }

    @PostMapping("/refund-requests/{id}/approve")
    public RefundTransaction approveRefund(@RequestHeader("Authorization") String authorization,
                                           @PathVariable Long id) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        return refundService.approveRefundByStaff(id, staff.getStaffId());
    }

    @PostMapping("/refund-requests/{id}/reject")
    public RefundTransaction rejectRefund(@RequestHeader("Authorization") String authorization,
                                          @PathVariable Long id,
                                          @RequestBody StaffRejectRefundRequest request) {
        StaffTokenInfo staff = staffAuthService.requireStaffOrAdmin(authorization);
        return refundService.rejectRefundByStaff(id, staff.getStaffId(), request.getReason());
    }
}
