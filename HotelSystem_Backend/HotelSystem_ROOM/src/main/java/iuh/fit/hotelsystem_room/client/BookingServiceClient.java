package iuh.fit.hotelsystem_room.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "booking-service", fallbackFactory = BookingServiceFallbackFactory.class)
public interface BookingServiceClient {

    @GetMapping("/bookings/booked-rooms")
    Long[] getBookedRoomIds(@RequestParam("checkIn") String checkIn,
                            @RequestParam("checkOut") String checkOut);
}
