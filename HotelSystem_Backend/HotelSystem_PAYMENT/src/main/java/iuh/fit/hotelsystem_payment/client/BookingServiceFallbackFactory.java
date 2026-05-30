package iuh.fit.hotelsystem_payment.client;

import iuh.fit.hotelsystem_payment.dto.CheckinBookingConfirmRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BookingServiceFallbackFactory implements FallbackFactory<BookingServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(BookingServiceFallbackFactory.class);

    @Override
    public BookingServiceClient create(Throwable cause) {
        return new BookingServiceClient() {
            @Override
            public Map<String, Object> getBooking(Long bookingId) {
                log.error("booking-service unavailable for getBooking. bookingId={}, error={}", bookingId, cause.getMessage());
                throw new RuntimeException("Booking service is temporarily unavailable. Please try again later.", cause);
            }

            @Override
            public Map<String, Object> confirmCheckinPayment(Long bookingId, String idempotencyKey, CheckinBookingConfirmRequest request) {
                log.error("booking-service unavailable for confirmCheckinPayment. bookingId={}, error={}", bookingId, cause.getMessage());
                throw new RuntimeException("Booking service is temporarily unavailable. Please try again later.", cause);
            }
        };
    }
}
