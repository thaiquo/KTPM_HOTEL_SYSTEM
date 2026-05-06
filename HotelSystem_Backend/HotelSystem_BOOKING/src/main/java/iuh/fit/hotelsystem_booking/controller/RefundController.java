package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundAuditLog;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundAuditLogRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.service.RefundAssignmentService;
import iuh.fit.hotelsystem_booking.service.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/refunds")
public class RefundController {

    private final RefundTransactionRepository refundRepository;
    private final RefundPaymentTransactionRepository paymentTransactionRepository;
    private final RefundAuditLogRepository auditLogRepository;
    private final RefundAssignmentService assignmentService;
    private final RefundService refundService;

    public RefundController(RefundTransactionRepository refundRepository,
                            RefundPaymentTransactionRepository paymentTransactionRepository,
                            RefundAuditLogRepository auditLogRepository,
                            RefundAssignmentService assignmentService,
                            RefundService refundService) {
        this.refundRepository = refundRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.auditLogRepository = auditLogRepository;
        this.assignmentService = assignmentService;
        this.refundService = refundService;
    }

    @GetMapping("/{id}")
    public RefundTransaction getRefund(@PathVariable Long id) {
        return refundRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + id));
    }

    @GetMapping("/booking/{bookingId}")
    public List<RefundTransaction> getRefundsByBooking(@PathVariable Long bookingId) {
        return refundRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
    }

    @GetMapping("/user/{userId}")
    public List<RefundTransaction> getRefundsByUser(@PathVariable Long userId) {
        return refundRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/{id}/history")
    public List<RefundPaymentTransaction> history(@PathVariable Long id) {
        return paymentTransactionRepository.findByRefundRequestIdOrderByCreatedAtAsc(id);
    }

    @GetMapping("/{id}/audit")
    public List<RefundAuditLog> audit(@PathVariable Long id) {
        return auditLogRepository.findByRefundRequestIdOrderByCreatedAtAsc(id);
    }

    @GetMapping("/my-tasks")
    public List<RefundTransaction> myTasks(@RequestParam Long staffId) {
        return refundRepository.findByAssignedToAndStatusInOrderByDueAtAsc(
                staffId,
                List.of(RefundStatus.ASSIGNED, RefundStatus.PROCESSING, RefundStatus.OVERDUE));
    }

    @GetMapping("/pending")
    public List<RefundTransaction> pending() {
        return refundRepository.findByStatusOrderByCreatedAtAsc(RefundStatus.PENDING);
    }

    @GetMapping("/overdue")
    public List<RefundTransaction> overdue() {
        return refundRepository.findByStatusOrderByCreatedAtAsc(RefundStatus.OVERDUE);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<RefundTransaction> approve(@PathVariable Long id,
                                                     @RequestBody(required = false) Map<String, Object> body) {
        Long staffId = parseLong(body != null ? body.get("staffId") : null);
        return ResponseEntity.ok(refundService.approveRefundByStaff(id, staffId));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<RefundTransaction> reject(@PathVariable Long id,
                                                    @RequestBody(required = false) Map<String, Object> body) {
        String reason = body != null && body.get("reason") != null ? String.valueOf(body.get("reason")) : "Refund rejected by staff";
        Long staffId = parseLong(body != null ? body.get("staffId") : null);
        return ResponseEntity.ok(refundService.rejectRefundByStaff(id, staffId, reason));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<RefundTransaction> assign(@PathVariable Long id,
                                                    @RequestBody(required = false) Map<String, Object> body) {
        Long staffId = parseLong(body != null ? body.get("staffId") : null);
        return ResponseEntity.ok(assignmentService.assignToStaff(id, staffId));
    }

    @PostMapping("/{id}/reassign")
    public ResponseEntity<RefundTransaction> reassign(@PathVariable Long id,
                                                      @RequestBody(required = false) Map<String, Long> body) {
        Long staffId = body != null ? body.get("staffId") : null;
        return ResponseEntity.ok(assignmentService.reassign(id, staffId));
    }

    private Long parseLong(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        return Long.parseLong(String.valueOf(value));
    }
}
