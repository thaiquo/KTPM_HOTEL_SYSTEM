package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.service.BookingService;
import iuh.fit.hotelsystem_booking.service.BookingCancelService;
import iuh.fit.hotelsystem_booking.service.PricingService;
import iuh.fit.hotelsystem_booking.service.CancellationPolicyService;
import iuh.fit.hotelsystem_booking.service.RefundService;
import iuh.fit.hotelsystem_booking.service.PreCheckinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/bookings")
//@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final BookingCancelService bookingCancelService;
    private final PricingService pricingService;
    private final CancellationPolicyService policyService;
    private final RefundService refundService;
    private final PreCheckinService preCheckinService;

    public BookingController(BookingService bookingService,
                             BookingCancelService bookingCancelService,
                             PricingService pricingService,
                             CancellationPolicyService policyService,
                             RefundService refundService,
                             PreCheckinService preCheckinService) {
        this.bookingService = bookingService;
        this.bookingCancelService = bookingCancelService;
        this.pricingService = pricingService;
        this.policyService = policyService;
        this.refundService = refundService;
        this.preCheckinService = preCheckinService;
    }
    // Tạo booking (gửi sang Payment qua Rabbit)
    @PostMapping
    public Booking createBooking(@RequestBody iuh.fit.hotelsystem_booking.dto.BookingCreateRequest booking) {
        return bookingService.createBooking(booking);
    }

    // Xem booking theo id
    @GetMapping("/{id}")
    public Booking getBooking(@PathVariable Long id) {
        return bookingService.getBooking(id);
    }

    // Xem booking theo user
    @GetMapping("/user/{userId}")
    public List<Booking> getBookingsByUser(@PathVariable Long userId) {
        return bookingService.getBookingsByUserId(userId);
    }

    @GetMapping("/{id}/guests")
    public List<BookingGuest> getGuests(@PathVariable Long id) {
        return bookingService.getGuests(id);
    }

    @PutMapping("/{id}/guests/{guestId}")
    public BookingGuest updateGuest(@PathVariable Long id,
                                    @PathVariable Long guestId,
                                    @RequestBody iuh.fit.hotelsystem_booking.dto.GuestRequest request) {
        return bookingService.updateGuest(id, guestId, request);
    }

    @PostMapping("/{id}/pre-checkin")
    public List<iuh.fit.hotelsystem_booking.dto.PreCheckinResponse> preCheckin(
            @PathVariable Long id,
            @RequestBody iuh.fit.hotelsystem_booking.dto.PreCheckinRequest request) {
        return preCheckinService.submit(id, request);
    }

    @PostMapping("/{id}/check-in/verify")
    public List<iuh.fit.hotelsystem_booking.dto.PreCheckinResponse> verifyCheckIn(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, Long> body) {
        Long staffId = body != null ? body.get("staffId") : null;
        return preCheckinService.verify(id, staffId);
    }

    @PutMapping("/{id}/modify")
    public Booking modifyBooking(@PathVariable Long id,
                                 @RequestBody iuh.fit.hotelsystem_booking.dto.BookingModificationRequest request) {
        return bookingService.modifyBooking(id, request);
    }

    // Lấy danh sách ID phòng đã được đặt trong khoảng thời gian
    @GetMapping("/booked-rooms")
    public List<Long> getBookedRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        return bookingService.getBookedRoomIds(checkIn, checkOut);
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<Booking> checkIn(
            @PathVariable Long id,
            @RequestBody iuh.fit.hotelsystem_booking.dto.CheckInRequest request) {
        return ResponseEntity.ok(bookingService.checkIn(id, request));
    }

    @PostMapping("/{id}/remaining-payment")
    public ResponseEntity<Booking> collectRemainingPayment(
            @PathVariable Long id,
            @RequestBody iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest request) {
        return ResponseEntity.ok(bookingService.collectRemainingPayment(id, request));
    }

    @PostMapping("/{id}/checkout")
    public ResponseEntity<iuh.fit.hotelsystem_booking.dto.CheckoutResponse> checkout(
            @PathVariable Long id,
            @RequestBody iuh.fit.hotelsystem_booking.dto.CheckOutRequest request) {
        return ResponseEntity.ok(bookingService.checkout(id, request));
    }

    @PostMapping("/{id}/complete-checkout")
    public ResponseEntity<Booking> completeCheckout(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.completeCheckout(id));
    }

    @PostMapping("/{id}/check-out")
    public ResponseEntity<Booking> checkOutLegacy(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.checkOut(id));
    }

    // Hủy booking
    @PostMapping("/{id}/cancel")
    public ResponseEntity<iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult> cancelBooking(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "User requested cancellation";
        return ResponseEntity.ok(bookingCancelService.cancelBooking(id, reason));
    }

    @PostMapping("/{id}/refund-request")
    public ResponseEntity<iuh.fit.hotelsystem_booking.entity.RefundTransaction> createRefundRequest(
            @PathVariable Long id,
            @RequestBody iuh.fit.hotelsystem_booking.dto.RefundRequest request) {
        return ResponseEntity.ok(refundService.createRefundRequest(id, request));
    }

    // Xem chính sách hủy của một booking cụ thể
    @GetMapping("/{id}/policy")
    public ResponseEntity<iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult> getPolicy(@PathVariable Long id) {
        Booking booking = bookingService.getBooking(id);
        return ResponseEntity.ok(policyService.calculateCancellationPolicy(booking, LocalDateTime.now()));
    }

    // Preview giá phòng (không tạo booking)
    @PostMapping("/pricing")
    public ResponseEntity<iuh.fit.hotelsystem_booking.dto.PricingResult> previewPricing(
            @RequestBody iuh.fit.hotelsystem_booking.dto.PricingRequest request) {
        LocalDate checkIn = LocalDate.parse(request.getCheckInDate());
        LocalDate checkOut = LocalDate.parse(request.getCheckOutDate());
        RatePlan ratePlan = request.getRatePlan() == null || request.getRatePlan().isBlank()
                ? RatePlan.FLEXIBLE
                : RatePlan.valueOf(request.getRatePlan());
        return ResponseEntity.ok(pricingService.calculatePrice(checkIn, checkOut, request.getPricePerNight(), ratePlan));
    }

    @PostMapping("/refunds/{refundId}/approve")
    public ResponseEntity<iuh.fit.hotelsystem_booking.entity.RefundTransaction> approveRefund(
            @PathVariable Long refundId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String processedBy = body != null ? body.get("processedBy") : "admin";
        return ResponseEntity.ok(refundService.approveRefund(refundId, processedBy));
    }

    @PostMapping("/refunds/{refundId}/reject")
    public ResponseEntity<iuh.fit.hotelsystem_booking.entity.RefundTransaction> rejectRefund(
            @PathVariable Long refundId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String processedBy = body != null ? body.get("processedBy") : "admin";
        String reason = body != null ? body.get("reason") : "Refund rejected by admin";
        return ResponseEntity.ok(refundService.rejectRefund(refundId, processedBy, reason));
    }
}
