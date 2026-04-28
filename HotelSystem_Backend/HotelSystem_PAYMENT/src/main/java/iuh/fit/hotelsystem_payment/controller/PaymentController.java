package iuh.fit.hotelsystem_payment.controller;

import iuh.fit.hotelsystem_payment.config.VNPayConfig;
import iuh.fit.hotelsystem_payment.dto.CreateVNPayRequest;
import iuh.fit.hotelsystem_payment.dto.VNPayResponse;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final VNPayService vnPayService;
    private final VNPayConfig vnPayConfig;
    private final PaymentRepository paymentRepository;

    public PaymentController(VNPayService vnPayService,
                             VNPayConfig vnPayConfig,
                             PaymentRepository paymentRepository) {
        this.vnPayService = vnPayService;
        this.vnPayConfig = vnPayConfig;
        this.paymentRepository = paymentRepository;
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

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String buildFrontendReturnUrl(Map<String, String> result) {
        StringBuilder url = new StringBuilder(vnPayConfig.getFrontendReturnUrl());
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
