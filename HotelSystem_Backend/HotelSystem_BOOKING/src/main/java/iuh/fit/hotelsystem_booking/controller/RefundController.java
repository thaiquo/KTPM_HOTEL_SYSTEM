package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundAuditLog;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.repository.RefundAuditLogRepository;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.service.RefundAssignmentService;
import iuh.fit.hotelsystem_booking.service.RefundService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/refunds")
public class RefundController {
    private static final Logger log = LoggerFactory.getLogger(RefundController.class);

    private final RefundTransactionRepository refundRepository;
    private final BookingRepository bookingRepository;
    private final BookingInvoiceRepository invoiceRepository;
    private final RefundPaymentTransactionRepository paymentTransactionRepository;
    private final RefundAuditLogRepository auditLogRepository;
    private final RefundAssignmentService assignmentService;
    private final RefundService refundService;

    public RefundController(RefundTransactionRepository refundRepository,
                            BookingRepository bookingRepository,
                            BookingInvoiceRepository invoiceRepository,
                            RefundPaymentTransactionRepository paymentTransactionRepository,
                            RefundAuditLogRepository auditLogRepository,
                            RefundAssignmentService assignmentService,
                            RefundService refundService) {
        this.refundRepository = refundRepository;
        this.bookingRepository = bookingRepository;
        this.invoiceRepository = invoiceRepository;
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
        backfillEarlyCheckoutRefunds(userId);
        return refundRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    private void backfillEarlyCheckoutRefunds(Long userId) {
        if (userId == null) return;
        for (Booking booking : bookingRepository.findByUserIdWithItems(userId)) {
            if (booking.getId() == null
                    || refundRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(
                            booking.getId(), "EARLY_CHECKOUT_REFUND").isPresent()) {
                continue;
            }
            BigDecimal amount = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId())
                    .map(this::resolveRefundAmountFromInvoice)
                    .orElse(BigDecimal.ZERO);
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            try {
                refundService.createAssignedEarlyCheckoutRefundTransaction(booking, amount, null);
            } catch (RuntimeException ex) {
                log.warn("Could not backfill early checkout refund. bookingId={}, amount={}",
                        booking.getId(), amount, ex);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private BigDecimal resolveRefundAmountFromInvoice(BookingInvoice invoice) {
        if (invoice.getTotalRefundToCustomer() != null
                && invoice.getTotalRefundToCustomer().compareTo(BigDecimal.ZERO) > 0) {
            return invoice.getTotalRefundToCustomer();
        }
        try {
            Object parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(invoice.getLinesJson(), Object.class);
            if (parsed instanceof Map<?, ?> lines) {
                BigDecimal amount = toBigDecimal(lines.get("additionalRefundAmount"));
                if (amount.compareTo(BigDecimal.ZERO) > 0) return amount;
                amount = toBigDecimal(lines.get("refundSettlementAmount"));
                if (amount.compareTo(BigDecimal.ZERO) > 0) return amount;
                return toBigDecimal(lines.get("totalRefundToCustomer"));
            }
        } catch (Exception ex) {
            log.warn("Could not parse invoice refund amount. invoiceId={}", invoice.getId(), ex);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
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
