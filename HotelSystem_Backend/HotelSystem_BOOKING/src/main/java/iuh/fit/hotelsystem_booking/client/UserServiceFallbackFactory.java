package iuh.fit.hotelsystem_booking.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

@Component
public class UserServiceFallbackFactory implements FallbackFactory<UserServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(UserServiceFallbackFactory.class);

    @Override
    public UserServiceClient create(Throwable cause) {
        return staffId -> {
            log.warn("user-service unavailable for isStaffOrAdmin. staffId={}, error={}", staffId, cause.getMessage());
            return false; // Deny access when user-service is down for safety
        };
    }
}
