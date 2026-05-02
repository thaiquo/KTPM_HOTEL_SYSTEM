package iuh.fit.hotelsystem_payment.controller;

import iuh.fit.hotelsystem_payment.config.MoMoConfig;
import iuh.fit.hotelsystem_payment.config.VNPayConfig;
import iuh.fit.hotelsystem_payment.dto.CreateMoMoRequest;
import iuh.fit.hotelsystem_payment.dto.CreateVNPayRequest;
import iuh.fit.hotelsystem_payment.dto.CheckinPaymentConfirmResponse;
import iuh.fit.hotelsystem_payment.dto.CheckinQrRequest;
import iuh.fit.hotelsystem_payment.dto.CheckinQrResponse;
import iuh.fit.hotelsystem_payment.dto.MoMoResponse;
import iuh.fit.hotelsystem_payment.dto.OperationalPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_payment.dto.RefundPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.EarlyCheckoutRefundRequest;
import iuh.fit.hotelsystem_payment.dto.EarlyCheckoutPreviewRequest;
import iuh.fit.hotelsystem_payment.dto.RefundAllocationPreviewDto;
import iuh.fit.hotelsystem_payment.dto.VNPayResponse;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.RefundTransaction;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.service.MoMoService;
import iuh.fit.hotelsystem_payment.service.PaymentService;
import iuh.fit.hotelsystem_payment.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final VNPayService vnPayService;
    private final MoMoService moMoService;
    private final VNPayConfig vnPayConfig;
    private final MoMoConfig moMoConfig;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public PaymentController(VNPayService vnPayService,
                             MoMoService moMoService,
                             VNPayConfig vnPayConfig,
                             MoMoConfig moMoConfig,
                             PaymentRepository paymentRepository,
                             PaymentService paymentService) {
        this.vnPayService = vnPayService;
        this.moMoService = moMoService;
        this.vnPayConfig = vnPayConfig;
        this.moMoConfig = moMoConfig;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    @PostMapping("/vnpay/create")
    public ResponseEntity<VNPayResponse> createVNPayPayment(@RequestBody CreateVNPayRequest request,
                                                            HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(vnPayService.createPayment(request, extractClientIp(httpServletRequest)));
    }

    @PostMapping("/vnpay/create-remaining")
    public ResponseEntity<VNPayResponse> createRemainingPayment(@RequestBody CreateVNPayRequest request,
                                                                HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(vnPayService.createRemainingPayment(request, extractClientIp(httpServletRequest)));
    }

    @GetMapping("/vnpay-return")
    public RedirectView vnpayReturn(@RequestParam Map<String, String> params) {
        Map<String, String> result = vnPayService.handleReturn(params);
        return new RedirectView(buildFrontendReturnUrl(result));
    }

    @GetMapping("/vnpay-ipn")
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(vnPayService.handleIpn(params));
    }

    @PostMapping("/momo/create")
    public ResponseEntity<MoMoResponse> createMoMoPayment(@RequestBody CreateMoMoRequest request) {
        return ResponseEntity.ok(moMoService.createPayment(request));
    }

    @PostMapping("/momo/create-remaining")
    public ResponseEntity<MoMoResponse> createRemainingMoMoPayment(@RequestBody CreateMoMoRequest request) {
        return ResponseEntity.ok(moMoService.createRemainingPayment(request));
    }

    @GetMapping("/momo-return")
    public RedirectView momoReturn(@RequestParam Map<String, String> params) {
        Map<String, String> result = moMoService.handleReturn(params);
        return new RedirectView(buildFrontendReturnUrl(result, moMoConfig.getFrontendReturnUrl()));
    }

    @PostMapping("/momo-ipn")
    public ResponseEntity<Map<String, String>> momoIpn(@RequestBody Map<String, Object> body) {
        Map<String, String> params = new java.util.HashMap<>();
        body.forEach((key, value) -> params.put(key, value == null ? "" : String.valueOf(value)));
        return ResponseEntity.ok(moMoService.handleIpn(params));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<Payment>> getPaymentsByBooking(@RequestParam(required = false) Long userId,
                                                              @org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        List<Payment> payments = paymentRepository.findByBookingId(bookingId);
        if (userId != null) {
            payments = payments.stream()
                    .filter(payment -> userId.equals(payment.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/invoices/booking/{bookingId}/status")
    public ResponseEntity<PaymentStatusResponse> getInvoiceStatus(@org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.getInvoiceStatus(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/remaining-payment")
    public ResponseEntity<Payment> remainingPayment(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId,
            @RequestBody OperationalPaymentRequest request) {
        return ResponseEntity.ok(paymentService.recordRemainingPayment(bookingId, request));
    }

    @PostMapping("/bookings/{bookingId}/late-checkout-fee")
    public ResponseEntity<Payment> lateCheckoutFee(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId,
            @RequestBody OperationalPaymentRequest request) {
        return ResponseEntity.ok(paymentService.createLateCheckoutFee(bookingId, request));
    }

    @PostMapping("/bookings/{bookingId}/early-checkin-fee")
    public ResponseEntity<Payment> earlyCheckinFee(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId,
            @RequestBody OperationalPaymentRequest request) {
        return ResponseEntity.ok(paymentService.createEarlyCheckinFee(bookingId, request));
    }

    @PostMapping("/bookings/{bookingId}/early-checkin-fee/paid")
    public ResponseEntity<Payment> markEarlyCheckinFeePaid(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.markEarlyCheckinFeePaid(bookingId));
    }

    @GetMapping("/bookings/{bookingId}/early-checkin-fee/status")
    public ResponseEntity<PaymentStatusResponse> earlyCheckinFeeStatus(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.getEarlyCheckinFeeStatus(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/late-checkout-fee/paid")
    public ResponseEntity<Payment> markLateCheckoutFeePaid(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.markLateCheckoutFeePaid(bookingId));
    }

    @GetMapping("/bookings/{bookingId}/late-checkout-fee/status")
    public ResponseEntity<PaymentStatusResponse> lateCheckoutFeeStatus(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.getLateCheckoutFeeStatus(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/early-checkout-refund/preview")
    public ResponseEntity<List<RefundAllocationPreviewDto>> previewEarlyCheckoutRefund(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId,
            @RequestBody EarlyCheckoutPreviewRequest body) {
        if (body == null || body.getAmount() == null || body.getAmount() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }
        return ResponseEntity.ok(paymentService.previewEarlyCheckoutRefund(bookingId, BigDecimal.valueOf(body.getAmount())));
    }

    @PostMapping("/bookings/{bookingId}/early-checkout-refund")
    public ResponseEntity<List<RefundTransaction>> earlyCheckoutRefund(
            @org.springframework.web.bind.annotation.PathVariable Long bookingId,
            @RequestBody EarlyCheckoutRefundRequest request) {
        request.setBookingId(bookingId);
        return ResponseEntity.ok(paymentService.createEarlyCheckoutRefund(request));
    }

    @PostMapping("/refunds/{refundRequestId}")
    public ResponseEntity<Payment> createRefund(
            @org.springframework.web.bind.annotation.PathVariable Long refundRequestId,
            @RequestBody RefundPaymentRequest request) {
        request.setRefundRequestId(refundRequestId);
        return ResponseEntity.ok(paymentService.createRefundPayment(request));
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
    public ResponseEntity<CheckinPaymentConfirmResponse> confirmCheckinQr(@PathVariable String paymentCode) {
        return ResponseEntity.ok(paymentService.confirmCheckinPayment(paymentCode));
    }

    @PostMapping("/{paymentCode}/cancel")
    public ResponseEntity<CheckinPaymentConfirmResponse> cancelCheckinQr(@PathVariable String paymentCode) {
        return ResponseEntity.ok(paymentService.cancelCheckinPayment(paymentCode));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String buildFrontendReturnUrl(Map<String, String> result) {
        return buildFrontendReturnUrl(result, vnPayConfig.getFrontendReturnUrl());
    }

    private String buildFrontendReturnUrl(Map<String, String> result, String frontendReturnUrl) {
        StringBuilder url = new StringBuilder(frontendReturnUrl);
        appendQueryParam(url, "code", result.getOrDefault("code", "99"));
        appendQueryParam(url, "message", result.getOrDefault("message", ""));
        appendQueryParam(url, "bookingId", result.getOrDefault("bookingId", ""));
        appendQueryParam(url, "paymentType", result.getOrDefault("paymentType", ""));
        appendQueryParam(url, "paymentStatus", result.getOrDefault("paymentStatus", ""));
        return url.toString();
    }

    private void appendQueryParam(StringBuilder url, String key, String value) {
        url.append(url.indexOf("?") >= 0 ? "&" : "?");
        url.append(URLEncoder.encode(key, StandardCharsets.UTF_8));
        url.append("=");
        url.append(URLEncoder.encode(value, StandardCharsets.UTF_8));
    }
}
