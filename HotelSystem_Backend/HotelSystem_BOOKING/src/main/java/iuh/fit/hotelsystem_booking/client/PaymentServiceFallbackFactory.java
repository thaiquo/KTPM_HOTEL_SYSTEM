package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PaymentServiceFallbackFactory implements FallbackFactory<PaymentServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceFallbackFactory.class);

    @Override
    public PaymentServiceClient create(Throwable cause) {
        return new PaymentServiceClient() {
            @Override
            public PaymentStatusResponse getInvoiceStatus(Long bookingId) {
                log.error("payment-service unavailable for getInvoiceStatus. bookingId={}, error={}", bookingId, cause.getMessage());
                PaymentStatusResponse fallback = new PaymentStatusResponse();
                fallback.setStatus("SERVICE_UNAVAILABLE");
                fallback.setPaidAmount(0.0);
                fallback.setRemainingAmount(0.0);
                return fallback;
            }

            @Override
            public java.util.List<iuh.fit.hotelsystem_booking.dto.PaymentTransactionDto> getPaymentsByBooking(Long bookingId) {
                log.error("payment-service unavailable for getPaymentsByBooking. bookingId={}, error={}", bookingId, cause.getMessage());
                return java.util.Collections.emptyList();
            }

            @Override
            public Object collectRemainingPayment(Long bookingId, String idempotencyKey, RemainingPaymentRequest request) {
                log.error("payment-service unavailable for collectRemainingPayment. bookingId={}, error={}", bookingId, cause.getMessage());
                throw new RuntimeException("Payment service is temporarily unavailable. Please try again later.", cause);
            }

            @Override
            public PaymentStatusResponse getEarlyCheckinFeeStatus(Long bookingId) {
                log.error("payment-service unavailable for getEarlyCheckinFeeStatus. bookingId={}, error={}", bookingId, cause.getMessage());
                PaymentStatusResponse fallback = new PaymentStatusResponse();
                fallback.setStatus("SERVICE_UNAVAILABLE");
                return fallback;
            }

            @Override
            public Object createEarlyCheckinFee(Long bookingId, String idempotencyKey, LateCheckoutPaymentRequest request) {
                log.error("payment-service unavailable for createEarlyCheckinFee. bookingId={}, error={}", bookingId, cause.getMessage());
                throw new RuntimeException("Payment service is temporarily unavailable. Please try again later.", cause);
            }

            @Override
            public Object processRefund(Long refundId, String idempotencyKey, Map<String, Object> request) {
                log.error("payment-service unavailable for processRefund. refundId={}, error={}", refundId, cause.getMessage());
                throw new RuntimeException("Payment service is temporarily unavailable. Please try again later.", cause);
            }

            @Override
            public void requestLateCheckoutFeePayment(Long bookingId, String idempotencyKey, LateCheckoutPaymentRequest request) {
                log.error("payment-service unavailable for requestLateCheckoutFeePayment. bookingId={}, error={}", bookingId, cause.getMessage());
                throw new RuntimeException("Payment service is temporarily unavailable. Please try again later.", cause);
            }

            @Override
            public void requestEarlyCheckoutRefund(Long bookingId, Map<String, Object> request) {
                log.error("payment-service unavailable for requestEarlyCheckoutRefund. bookingId={}, error={}", bookingId, cause.getMessage());
            }

            @Override
            public java.util.List<iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto> previewRefundAllocation(Long bookingId, Map<String, Object> request) {
                log.error("payment-service unavailable for previewRefundAllocation. bookingId={}, error={}", bookingId, cause.getMessage());
                return java.util.Collections.emptyList();
            }

            @Override
            public PaymentStatusResponse getLateCheckoutFeeStatus(Long bookingId) {
                log.error("payment-service unavailable for getLateCheckoutFeeStatus. bookingId={}, error={}", bookingId, cause.getMessage());
                PaymentStatusResponse fallback = new PaymentStatusResponse();
                fallback.setStatus("SERVICE_UNAVAILABLE");
                return fallback;
            }
        };
    }
}
