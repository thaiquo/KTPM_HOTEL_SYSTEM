package iuh.fit.hotelsystem_payment.controller;

import iuh.fit.hotelsystem_payment.dto.InvoiceSummaryResponse;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.service.PaymentService;
import iuh.fit.hotelsystem_payment.service.StaffAuthService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/invoices")
public class StaffPaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final StaffAuthService staffAuthService;

    public StaffPaymentController(PaymentService paymentService,
                                  PaymentRepository paymentRepository,
                                  StaffAuthService staffAuthService) {
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.staffAuthService = staffAuthService;
    }

    @GetMapping("/summary")
    public InvoiceSummaryResponse summary(@RequestHeader("Authorization") String authorization) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return paymentService.getStaffInvoiceSummary();
    }

    @GetMapping
    public List<Payment> invoices(@RequestHeader("Authorization") String authorization) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return paymentService.getStaffInvoices();
    }

    @GetMapping("/{invoiceId}")
    public Payment invoice(@RequestHeader("Authorization") String authorization,
                           @PathVariable Long invoiceId) {
        staffAuthService.requireStaffOrAdmin(authorization);
        return paymentRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));
    }
}
