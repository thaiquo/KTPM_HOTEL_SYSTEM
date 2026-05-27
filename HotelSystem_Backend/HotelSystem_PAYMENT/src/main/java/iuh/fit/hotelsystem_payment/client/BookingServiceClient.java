package iuh.fit.hotelsystem_payment.client;

import iuh.fit.hotelsystem_payment.dto.CheckinBookingConfirmRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "booking-service", fallbackFactory = BookingServiceFallbackFactory.class)
public interface BookingServiceClient {

    @GetMapping("/bookings/{bookingId}")
    Map<String, Object> getBooking(@PathVariable("bookingId") Long bookingId);

    @PostMapping("/bookings/{bookingId}/confirm-checkin-payment")
    Map<String, Object> confirmCheckinPayment(@PathVariable("bookingId") Long bookingId,
                                               @RequestBody CheckinBookingConfirmRequest request);
}
