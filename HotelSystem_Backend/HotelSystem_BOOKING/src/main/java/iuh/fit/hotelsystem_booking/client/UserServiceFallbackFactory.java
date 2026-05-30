package iuh.fit.hotelsystem_booking.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class UserServiceFallbackFactory implements FallbackFactory<UserServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(UserServiceFallbackFactory.class);

    @Override
    public UserServiceClient create(Throwable cause) {
        return new UserServiceClient() {
            @Override
            public Boolean isStaffOrAdmin(Long staffId) {
                log.warn("user-service unavailable for isStaffOrAdmin. staffId={}, error={}", staffId, cause.getMessage());
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "User service is temporarily unavailable.", cause);
            }

            @Override
            public iuh.fit.hotelsystem_booking.dto.UserProfileDto getProfile(Long userId) {
                log.warn("user-service unavailable for getProfile. userId={}, error={}", userId, cause.getMessage());
                return null;
            }
        };
    }
}
