package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentRefundRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class RestPaymentClient implements PaymentClient {

    private final RestTemplate restTemplate;

    @Value("${payment.service.url:http://payment-service:8085}")
    private String paymentServiceUrl;

    public RestPaymentClient() {
        this.restTemplate = new RestTemplate();
    }

    private <T> T postWithRetry(String url, Object body, Class<T> responseType) {
        int attempts = 0;
        while (true) {
            try {
                return restTemplate.postForObject(url, body, responseType);
            } catch (ResourceAccessException ex) {
                attempts++;
                if (attempts >= 3) {
                    throw ex;
                }
                try {
                    Thread.sleep(500L * attempts);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    private <T> T getWithRetry(String url, Class<T> responseType) {
        int attempts = 0;
        while (true) {
            try {
                return restTemplate.getForObject(url, responseType);
            } catch (ResourceAccessException ex) {
                attempts++;
                if (attempts >= 3) {
                    throw ex;
                }
                try {
                    Thread.sleep(500L * attempts);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    @Override
    public void requestLateCheckoutFeePayment(Long bookingId, Long userId, BigDecimal amount) {
        LateCheckoutPaymentRequest paymentRequest = new LateCheckoutPaymentRequest();
        paymentRequest.setBookingId(bookingId);
        paymentRequest.setUserId(userId);
        paymentRequest.setAmount(amount.doubleValue());
        postWithRetryVoid(paymentServiceUrl + "/payments/bookings/" + bookingId + "/late-checkout-fee", paymentRequest);
    }

    @Override
    public void requestEarlyCheckoutRefund(Long bookingId, BigDecimal refundAmount, String reason, Long processedByStaffId) {
        PaymentRefundRequest request = new PaymentRefundRequest();
        request.setBookingId(bookingId);
        request.setAmount(refundAmount.doubleValue());
        request.setReason(reason != null ? reason : "EARLY_CHECKOUT");
        request.setProcessedByStaffId(processedByStaffId);
        postWithRetryVoid(paymentServiceUrl + "/payments/bookings/" + bookingId + "/early-checkout-refund", request);
    }

    private void postWithRetryVoid(String url, Object body) {
        postWithRetry(url, body, Object.class);
    }

    @Override
    public List<RefundAllocationLineDto> previewRefundAllocation(Long bookingId, BigDecimal refundAmount) {
        Map<String, Object> body = new HashMap<>();
        body.put("amount", refundAmount.doubleValue());
        RefundAllocationLineDto[] arr = postWithRetry(
                paymentServiceUrl + "/payments/bookings/" + bookingId + "/early-checkout-refund/preview",
                body,
                RefundAllocationLineDto[].class);
        return arr == null ? List.of() : List.of(arr);
    }

    @Override
    public boolean isLateCheckoutFeePaid(Long bookingId) {
        PaymentStatusResponse paymentStatus = getWithRetry(
                paymentServiceUrl + "/payments/bookings/" + bookingId + "/late-checkout-fee/status",
                PaymentStatusResponse.class);
        return paymentStatus != null && "PAID".equalsIgnoreCase(paymentStatus.getStatus());
    }
}
