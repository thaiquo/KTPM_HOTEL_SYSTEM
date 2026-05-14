package iuh.fit.hotelsystem_room.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

@Component
public class BookingServiceFallbackFactory implements FallbackFactory<BookingServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(BookingServiceFallbackFactory.class);

    @Override
    public BookingServiceClient create(Throwable cause) {
        return (checkIn, checkOut) -> {
            log.error("booking-service unavailable for getBookedRoomIds. checkIn={}, checkOut={}, error={}",
                    checkIn, checkOut, cause.getMessage());
            // Return empty array so all rooms appear available when booking-service is down
            return new Long[0];
        };
    }
}
