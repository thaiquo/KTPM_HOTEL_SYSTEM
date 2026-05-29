package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;

@FeignClient(name = "payment-service", url = "${payment.service.url:http://localhost:8085}", fallbackFactory = PaymentServiceFallbackFactory.class)
public interface PaymentServiceClient {

    @Retry(name = "paymentStatusApi")
    @GetMapping("/payments/invoices/booking/{bookingId}/status")
    PaymentStatusResponse getInvoiceStatus(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/payments/bookings/{bookingId}/remaining-payment")
    @Retry(name = "paymentTransactionApi")
    Object collectRemainingPayment(@PathVariable("bookingId") Long bookingId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody RemainingPaymentRequest request);

    @Retry(name = "paymentStatusApi")
    @GetMapping("/payments/bookings/{bookingId}/early-checkin-fee/status")
    PaymentStatusResponse getEarlyCheckinFeeStatus(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/payments/bookings/{bookingId}/early-checkin-fee")
    @Retry(name = "paymentTransactionApi")
    Object createEarlyCheckinFee(@PathVariable("bookingId") Long bookingId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody LateCheckoutPaymentRequest request);

    @PostMapping("/payments/refunds/{refundId}")
    @Retry(name = "paymentTransactionApi")
    Object processRefund(@PathVariable("refundId") Long refundId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody Map<String, Object> request);

    @PostMapping("/payments/bookings/{bookingId}/late-checkout-fee")
    @Retry(name = "paymentTransactionApi")
    void requestLateCheckoutFeePayment(@PathVariable("bookingId") Long bookingId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody LateCheckoutPaymentRequest request);

    @PostMapping("/payments/bookings/{bookingId}/early-checkout-refund")
    void requestEarlyCheckoutRefund(@PathVariable("bookingId") Long bookingId,
            @RequestBody Map<String, Object> request);

    @PostMapping("/payments/bookings/{bookingId}/early-checkout-refund/preview")
    java.util.List<iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto> previewRefundAllocation(
            @PathVariable("bookingId") Long bookingId, @RequestBody Map<String, Object> request);

    @Retry(name = "paymentStatusApi")
    @GetMapping("/payments/bookings/{bookingId}/late-checkout-fee/status")
    PaymentStatusResponse getLateCheckoutFeeStatus(@PathVariable("bookingId") Long bookingId);
}
