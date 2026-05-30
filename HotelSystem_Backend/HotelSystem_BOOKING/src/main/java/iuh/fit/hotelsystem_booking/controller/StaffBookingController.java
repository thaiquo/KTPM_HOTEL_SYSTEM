package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.dto.CheckInCheckOutStatsDto;
import iuh.fit.hotelsystem_booking.dto.BookingRoomActionResult;
import iuh.fit.hotelsystem_booking.dto.BookingRoomBatchRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomExtraFeeRequest;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.BookingCheckoutPreviewResponse;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.RoomChangeRequest;
import iuh.fit.hotelsystem_booking.dto.RoomChangeResponse;
import iuh.fit.hotelsystem_booking.dto.StaffCheckInRequest;
import iuh.fit.hotelsystem_booking.dto.StaffTokenInfo;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.service.BookingService;
import iuh.fit.hotelsystem_booking.service.BookingRoomWorkflowService;
import iuh.fit.hotelsystem_booking.service.BookingCheckoutBillingService;
import iuh.fit.hotelsystem_booking.service.CheckoutService;
import iuh.fit.hotelsystem_booking.service.RefundAuditService;
import iuh.fit.hotelsystem_booking.service.RefundAssignmentService;
import iuh.fit.hotelsystem_booking.service.RefundQueueProducer;
import iuh.fit.hotelsystem_booking.service.RefundService;
import iuh.fit.hotelsystem_booking.service.StaffAuthService;
import iuh.fit.hotelsystem_booking.service.StaffCheckInOutStatsService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
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

    private static final Logger log = LoggerFactory.getLogger(StaffBookingController.class);

    private final BookingService bookingService;
    private final CheckoutService checkoutService;
    private final BookingRepository bookingRepository;
    private final RefundTransactionRepository refundRepository;
    private final RefundAssignmentService refundAssignmentService;
    private final RefundService refundService;
    private final RefundAuditService refundAuditService;
    private final RefundQueueProducer refundQueueProducer;
    private final StaffAuthService staffAuthService;
    private final StaffCheckInOutStatsService statsService;
    private final BookingRoomWorkflowService bookingRoomWorkflowService;
    private final BookingCheckoutBillingService bookingCheckoutBillingService;
    private final iuh.fit.hotelsystem_booking.service.BookingInvoiceService bookingInvoiceService;
    private final iuh.fit.hotelsystem_booking.service.NewInvoiceService newInvoiceService;

    public StaffBookingController(BookingService bookingService,
                                  BookingRepository bookingRepository,
                                  RefundTransactionRepository refundRepository,
                                  RefundAssignmentService refundAssignmentService,
                                  RefundService refundService,
                                  RefundAuditService refundAuditService,
                                  RefundQueueProducer refundQueueProducer,
                                  StaffAuthService staffAuthService,
                                  StaffCheckInOutStatsService statsService,
                                  CheckoutService checkoutService,
                                  BookingRoomWorkflowService bookingRoomWorkflowService,
                                  BookingCheckoutBillingService bookingCheckoutBillingService,
                                  iuh.fit.hotelsystem_booking.service.BookingInvoiceService bookingInvoiceService,
                                  iuh.fit.hotelsystem_booking.service.NewInvoiceService newInvoiceService) {
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
        this.refundRepository = refundRepository;
        this.refundAssignmentService = refundAssignmentService;
        this.refundService = refundService;
        this.refundAuditService = refundAuditService;
        this.refundQueueProducer = refundQueueProducer;
        this.staffAuthService = staffAuthService;
        this.statsService = statsService;
        this.checkoutService = checkoutService;
        this.bookingRoomWorkflowService = bookingRoomWorkflowService;
        this.bookingCheckoutBillingService = bookingCheckoutBillingService;
        this.bookingInvoiceService = bookingInvoiceService;
        this.newInvoiceService = newInvoiceService;
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

    @GetMapping("/booking-rooms/check-in-today")
    public ResponseEntity<List<BookingItem>> getRoomCheckInToday(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(bookingRoomWorkflowService.getCheckInRooms(resolveDate(date)));
    }

    @GetMapping("/booking-rooms/in-house")
    public ResponseEntity<List<BookingItem>> getInHouseRooms(HttpServletRequest request) {
        ensureStaff(request);
        return ResponseEntity.ok(bookingRoomWorkflowService.getInHouseRooms());
    }

    @GetMapping("/booking-rooms/check-out-today")
    public ResponseEntity<List<BookingItem>> getRoomCheckOutToday(
            HttpServletRequest request,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        ensureStaff(request);
        return ResponseEntity.ok(bookingRoomWorkflowService.getCheckOutRooms(resolveDate(date)));
    }

    @GetMapping("/bookings")
    public List<Booking> bookings(HttpServletRequest request) {
        ensureStaff(request);
        return bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @PostMapping("/booking-rooms/{bookingRoomId:\\d+}/check-in")
    public ResponseEntity<BookingItem> checkInRoom(HttpServletRequest httpRequest,
                                                   @PathVariable Long bookingRoomId,
                                                   @RequestBody(required = false) StaffCheckInRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        CheckInRequest checkInRequest = new CheckInRequest();
        if (request != null) {
            checkInRequest.setRepresentativeCccd(request.getRepresentativeCccd());
            checkInRequest.setRepresentativePhone(request.getRepresentativePhone());
            checkInRequest.setRepresentativeGuestId(request.getRepresentativeGuestId());
        }
        return ResponseEntity.ok(bookingRoomWorkflowService.checkInRoom(bookingRoomId, staff.getStaffId(), checkInRequest));
    }

    @PostMapping("/bookings/{bookingId:\\d+}/check-in-multiple")
    public ResponseEntity<BookingRoomActionResult> checkInMultipleRooms(HttpServletRequest httpRequest,
                                                                        @PathVariable Long bookingId,
                                                                        @RequestBody BookingRoomBatchRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        return ResponseEntity.ok(bookingRoomWorkflowService.checkInRooms(bookingId, request, staff.getStaffId()));
    }

    @PostMapping("/booking-rooms/{bookingRoomId:\\d+}/check-out")
    public ResponseEntity<BookingItem> checkOutRoom(HttpServletRequest httpRequest,
                                                    @PathVariable Long bookingRoomId,
                                                    @RequestBody(required = false) BookingRoomExtraFeeRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        return ResponseEntity.ok(bookingRoomWorkflowService.checkOutRoom(bookingRoomId, staff.getStaffId(), request));
    }

    @PostMapping("/bookings/{bookingId:\\d+}/check-out-multiple")
    public ResponseEntity<BookingRoomActionResult> checkOutMultipleRooms(HttpServletRequest httpRequest,
                                                                         @PathVariable Long bookingId,
                                                                         @RequestBody BookingRoomBatchRequest request) {
        StaffTokenInfo staff = staff(httpRequest);
        return ResponseEntity.ok(bookingRoomWorkflowService.checkOutRooms(bookingId, request, staff.getStaffId()));
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

    @GetMapping("/bookings/{bookingId:\\d+}/invoice")
    public iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto getInvoice(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return checkoutService.getInvoice(bookingId);
    }

    @GetMapping("/invoices")
    public java.util.List<iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto> listInvoices(HttpServletRequest request) {
        ensureStaff(request);
        return checkoutService.listInvoices();
    }

    @GetMapping("/invoices/search")
    public iuh.fit.hotelsystem_booking.dto.invoice.InvoiceSearchResponseDto searchInvoices(
            HttpServletRequest request,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String invoiceCode,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String bookingCode,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String customerName,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String customerPhone,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String date,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String specificDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String fromDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String toDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.List<String> invoiceStatus,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String paymentStatus,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "10") int size) {
        ensureStaff(request);
        java.time.LocalDate dateParsed = date != null && !date.isBlank() ? java.time.LocalDate.parse(date) : null;
        java.time.LocalDate specificDateParsed = specificDate != null && !specificDate.isBlank() ? java.time.LocalDate.parse(specificDate) : null;
        java.time.LocalDate fromParsed = fromDate != null && !fromDate.isBlank() ? java.time.LocalDate.parse(fromDate) : null;
        java.time.LocalDate toParsed   = toDate != null && !toDate.isBlank()   ? java.time.LocalDate.parse(toDate)   : null;
        java.time.LocalDate effectiveSpecificDate = specificDateParsed != null ? specificDateParsed : dateParsed;
        return newInvoiceService.searchInvoices(invoiceCode, bookingCode, customerName, customerPhone, effectiveSpecificDate, fromParsed, toParsed, invoiceStatus, paymentStatus, page, size);
    }

    @GetMapping("/invoices/{invoiceId:\\d+}")
    public iuh.fit.hotelsystem_booking.dto.invoice.InvoiceDetailResponseDto getInvoiceDetailV2(HttpServletRequest request, @PathVariable Long invoiceId) {
        ensureStaff(request);
        return newInvoiceService.getInvoiceDetail(invoiceId);
    }

    @GetMapping("/invoices/summary")
    public Map<String, Object> getInvoicesSummary(HttpServletRequest request) {
        ensureStaff(request);
        return newInvoiceService.getInvoiceSummary();
    }

    @GetMapping("/bookings/{bookingId:\\d+}/services")
    public java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> getServiceLines(HttpServletRequest request, @PathVariable Long bookingId) {
        ensureStaff(request);
        return bookingService.listServiceLines(bookingId);
    }

    @PostMapping("/bookings/{bookingId:\\d+}/services")
    public iuh.fit.hotelsystem_booking.dto.ServiceLineDto addServiceLine(HttpServletRequest request, @PathVariable Long bookingId,
                                                                         @RequestBody iuh.fit.hotelsystem_booking.dto.ServiceLineDto body) {
        StaffTokenInfo staff = staff(request);
        return bookingService.addServiceLine(bookingId, body, staff.getStaffId());
    }

    @DeleteMapping("/bookings/{bookingId:\\d+}/services/{lineId}")
    public ResponseEntity<Void> deleteServiceLine(HttpServletRequest request, @PathVariable Long bookingId, @PathVariable Long lineId) {
        StaffTokenInfo staff = staff(request);
        bookingService.removeServiceLine(bookingId, lineId, staff.getStaffId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bookings/{bookingId:\\d+}/room-change")
    public RoomChangeResponse changeRoom(HttpServletRequest request,
                                         @PathVariable Long bookingId,
                                         @RequestBody RoomChangeRequest body) {
        StaffTokenInfo staff = staff(request);
        return bookingService.changeRoom(bookingId, body, staff.getStaffId());
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

    @PostMapping("/bookings/{bookingId:\\d+}/checkout-preview")
    public BookingCheckoutPreviewResponse previewCheckout(HttpServletRequest request,
                                                          @PathVariable Long bookingId,
                                                          @RequestBody(required = false) BookingRoomBatchRequest body) {
        ensureStaff(request);
        return bookingCheckoutBillingService.previewCheckout(bookingId, body != null ? body : new BookingRoomBatchRequest());
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
        return refundRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
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

    @PostMapping("/refund-requests/early-checkout/{bookingId}")
    public RefundTransaction createEarlyCheckoutRefund(
            HttpServletRequest request,
            @PathVariable Long bookingId,
            @RequestBody Map<String, Object> body) {
        StaffTokenInfo staff = staff(request);
        Double refundAmount = body != null && body.get("refundAmount") instanceof Number 
            ? ((Number) body.get("refundAmount")).doubleValue() 
            : 0.0;
        // Lấy paidAmount thực tế từ booking (số tiền khách đã thanh toán)
        // KHÔNG dùng refundAmount làm paidAmount
        
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        
        String idempotencyKey = iuh.fit.hotelsystem_booking.constants.BookingConstants.EARLY_CHECKOUT_REFUND_IDEMPOTENCY_PREFIX + bookingId;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.util.Optional<RefundTransaction> existingRefund =
                refundRepository.findByIdempotencyKey(idempotencyKey)
                        .or(() -> refundRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(
                                bookingId, "EARLY_CHECKOUT_REFUND"));

        if (existingRefund.isPresent()) {
            RefundTransaction refund = existingRefund.get();
            if (refund.getStatus() != RefundStatus.REFUNDED
                    && refund.getStatus() != RefundStatus.SUCCESS
                    && refund.getStatus() != RefundStatus.REJECTED) {
                RefundStatus oldStatus = refund.getStatus();
                refund.setStatus(RefundStatus.ASSIGNED);
                refund.setAssignedTo(staff.getStaffId());
                refund.setAssignedAt(now);
                refund.setProcessedBy(null);
                refund.setProcessedByStaffId(null);
                refund.setProcessedAt(null);
                refund.setCompletedAt(null);
                refund.setRejectReason(null);
                refund.setRefundAmount(refundAmount);
                refund.setAmount(refundAmount);
                double actualPaid = booking.getPaidAmount() != null ? booking.getPaidAmount() : refundAmount;
                refund.setPaidAmount(actualPaid);
                refund.setCancellationFee(Math.max(0, actualPaid - refundAmount));
                refund.setUpdatedAt(now);
                RefundTransaction saved = refundRepository.save(refund);
                try {
                    refundAuditService.log(saved.getId(), "REASSIGNED", oldStatus, RefundStatus.ASSIGNED,
                            String.valueOf(staff.getStaffId()), "STAFF", "Early checkout refund assigned to checkout staff");
                } catch (Exception e) {
                    log.warn("Could not log audit for early checkout refund: {}", e.getMessage());
                }
                try {
                    refundQueueProducer.publishAssigned(saved);
                } catch (Exception e) {
                    log.warn("Could not publish refund event: {}", e.getMessage());
                }
                return saved;
            }
            return refund;
        }

        double actualPaidAmount = booking.getPaidAmount() != null ? booking.getPaidAmount() : refundAmount;
        double retentionFee = Math.max(0, actualPaidAmount - refundAmount);

        RefundTransaction refund = new RefundTransaction();
        refund.setBookingId(bookingId);
        refund.setUserId(booking.getUserId());
        refund.setPaymentTransactionId(booking.getPaymentTransactionId());
        refund.setPaidAmount(actualPaidAmount);
        refund.setCancellationFee(retentionFee);
        refund.setRefundAmount(refundAmount);
        refund.setRefundMethod("VNPAY");
        refund.setAmount(refundAmount);
        refund.setReason("EARLY_CHECKOUT_REFUND");
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setAssignedTo(staff.getStaffId());
        refund.setAssignedAt(java.time.LocalDateTime.now());
        refund.setProcessedBy(null);
        refund.setProcessedByStaffId(null);
        refund.setProcessedAt(null);
        refund.setCompletedAt(null);
        refund.setIdempotencyKey(idempotencyKey);
        refund.setCreatedAt(now);
        refund.setDueAt(now.plusHours(iuh.fit.hotelsystem_booking.constants.BookingConstants.REFUND_SLA_HOURS));
        refund.setPriority(iuh.fit.hotelsystem_booking.constants.BookingConstants.REFUND_PRIORITY_NORMAL);
        refund.setUpdatedAt(now);
        
        RefundTransaction saved = refundRepository.save(refund);
        
        // Log audit
        try {
            refundAuditService.log(saved.getId(), "CREATED_AND_ASSIGNED", null, RefundStatus.ASSIGNED,
                    String.valueOf(staff.getStaffId()), "STAFF", "Early checkout refund created and assigned to staff");
        } catch (Exception e) {
            log.warn("Could not log audit for early checkout refund: {}", e.getMessage());
        }
        
        // Publish event
        try {
            refundQueueProducer.publishAssigned(saved);
        } catch (Exception e) {
            log.warn("Could not publish refund event: {}", e.getMessage());
        }
        
        return saved;
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
