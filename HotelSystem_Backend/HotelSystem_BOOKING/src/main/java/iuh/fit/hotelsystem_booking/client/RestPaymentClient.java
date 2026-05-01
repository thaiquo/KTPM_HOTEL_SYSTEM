package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.PaymentRefundRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.math.BigDecimal;

@Component
public class RestPaymentClient implements PaymentClient {

    private final RestTemplate restTemplate;

    @Value("${payment.service.url:http://payment-service:8085}")
    private String paymentServiceUrl;

    public RestPaymentClient() {
        this.restTemplate = new RestTemplate();
    }

    private void postWithRetry(String url, Object body) {
        int attempts = 0;
        while (true) {
            try {
                restTemplate.postForObject(url, body, Object.class);
                return;
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
        postWithRetry(paymentServiceUrl + "/payments/bookings/" + bookingId + "/late-checkout-fee", paymentRequest);
    }

    @Override
    public void requestEarlyCheckoutRefund(Long bookingId, Long userId, BigDecimal refundAmount) {
        PaymentRefundRequest request = new PaymentRefundRequest();
        request.setBookingId(bookingId);
        request.setUserId(userId);
        request.setAmount(refundAmount.doubleValue());
        postWithRetry(paymentServiceUrl + "/payments/bookings/" + bookingId + "/early-checkout-refund", request);
    }

    @Override
    public boolean isLateCheckoutFeePaid(Long bookingId) {
        PaymentStatusResponse paymentStatus = getWithRetry(
                paymentServiceUrl + "/payments/bookings/" + bookingId + "/late-checkout-fee/status",
                PaymentStatusResponse.class);
        return paymentStatus != null && "PAID".equalsIgnoreCase(paymentStatus.getStatus());
    }
}
