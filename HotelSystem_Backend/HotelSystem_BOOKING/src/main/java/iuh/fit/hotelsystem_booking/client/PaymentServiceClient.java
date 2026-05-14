package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "payment-service", fallbackFactory = PaymentServiceFallbackFactory.class)
public interface PaymentServiceClient {

    @GetMapping("/payments/invoices/booking/{bookingId}/status")
    PaymentStatusResponse getInvoiceStatus(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/payments/bookings/{bookingId}/remaining-payment")
    Object collectRemainingPayment(@PathVariable("bookingId") Long bookingId,
                                    @RequestBody RemainingPaymentRequest request);

    @GetMapping("/payments/bookings/{bookingId}/early-checkin-fee/status")
    PaymentStatusResponse getEarlyCheckinFeeStatus(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/payments/bookings/{bookingId}/early-checkin-fee")
    Object createEarlyCheckinFee(@PathVariable("bookingId") Long bookingId,
                                  @RequestBody LateCheckoutPaymentRequest request);

    @PostMapping("/payments/refunds/{refundId}")
    Object processRefund(@PathVariable("refundId") Long refundId, @RequestBody Map<String, Object> request);

    @PostMapping("/payments/bookings/{bookingId}/late-checkout-fee")
    void requestLateCheckoutFeePayment(@PathVariable("bookingId") Long bookingId, @RequestBody LateCheckoutPaymentRequest request);

    @PostMapping("/payments/bookings/{bookingId}/early-checkout-refund")
    void requestEarlyCheckoutRefund(@PathVariable("bookingId") Long bookingId, @RequestBody Map<String, Object> request);

    @PostMapping("/payments/bookings/{bookingId}/early-checkout-refund/preview")
    java.util.List<iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto> previewRefundAllocation(@PathVariable("bookingId") Long bookingId, @RequestBody Map<String, Object> request);

    @GetMapping("/payments/bookings/{bookingId}/late-checkout-fee/status")
    PaymentStatusResponse getLateCheckoutFeeStatus(@PathVariable("bookingId") Long bookingId);
}
