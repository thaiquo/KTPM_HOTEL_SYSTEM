package iuh.fit.hotelsystem_payment.controller;

import iuh.fit.hotelsystem_payment.dto.CheckinPaymentConfirmResponse;
import iuh.fit.hotelsystem_payment.dto.CheckinQrRequest;
import iuh.fit.hotelsystem_payment.dto.CheckinQrResponse;
import iuh.fit.hotelsystem_payment.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class CheckinQrPaymentController {
    private final PaymentService paymentService;

    public CheckinQrPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/checkin-qr")
    public ResponseEntity<CheckinQrResponse> createCheckinQr(@RequestBody CheckinQrRequest request) {
        return ResponseEntity.ok(paymentService.createCheckinQr(request));
    }

    @GetMapping("/checkin-qr")
    public ResponseEntity<CheckinPaymentConfirmResponse> getCheckinQr(@RequestParam String code) {
        return ResponseEntity.ok(paymentService.getCheckinPayment(code));
    }

    @PostMapping("/{paymentCode}/confirm")
    public ResponseEntity<CheckinPaymentConfirmResponse> confirm(@PathVariable String paymentCode) {
        return ResponseEntity.ok(paymentService.confirmCheckinPayment(paymentCode));
    }

    @PostMapping("/{paymentCode}/cancel")
    public ResponseEntity<CheckinPaymentConfirmResponse> cancel(@PathVariable String paymentCode) {
        return ResponseEntity.ok(paymentService.cancelCheckinPayment(paymentCode));
    }
}
