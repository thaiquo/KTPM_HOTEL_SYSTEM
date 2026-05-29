package iuh.fit.hotelsystem_payment.client;

import iuh.fit.hotelsystem_payment.dto.CheckinBookingConfirmRequest;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;

@FeignClient(name = "booking-service", fallbackFactory = BookingServiceFallbackFactory.class)
public interface BookingServiceClient {

    @Retry(name = "bookingServiceApi")
    @GetMapping("/bookings/{bookingId}")
    Map<String, Object> getBooking(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/bookings/{bookingId}/confirm-checkin-payment")
    @Retry(name = "bookingTransactionApi")
    Map<String, Object> confirmCheckinPayment(@PathVariable("bookingId") Long bookingId,
                                               @RequestHeader("Idempotency-Key") String idempotencyKey,
                                               @RequestBody CheckinBookingConfirmRequest request);
}
