package iuh.fit.hotelsystem_booking.client;

import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", fallbackFactory = UserServiceFallbackFactory.class)
public interface UserServiceClient {

    @Retry(name = "userServiceApi")
    @GetMapping("/api/users/{staffId}/staff-or-admin")
    Boolean isStaffOrAdmin(@PathVariable("staffId") Long staffId);
}
