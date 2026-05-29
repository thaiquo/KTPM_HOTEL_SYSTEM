package iuh.fit.hotelsystem_auth.client;

import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class UserServiceFallbackFactory implements FallbackFactory<UserServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(UserServiceFallbackFactory.class);

    @Override
    public UserServiceClient create(Throwable cause) {
        return new UserServiceClient() {
            @Override
            public Map<String, Object> checkExists(String email, String phone) {
                log.error("user-service is unavailable for checkExists. email={}, error={}", email, cause.getMessage());
                throw mapCause(cause, "User service is temporarily unavailable. Please try again later.");
            }

            @Override
            public Map<String, Object> createUser(Map<String, Object> request) {
                log.error("user-service is unavailable for createUser. error={}", cause.getMessage());
                throw mapCause(cause, "User service is temporarily unavailable. Please try again later.");
            }

            @Override
            public Map<String, Object> verifyCredentials(Map<String, String> credentials) {
                log.error("user-service is unavailable for verifyCredentials. error={}", cause.getMessage());
                throw mapCause(cause, "User service is temporarily unavailable. Please try again later.");
            }
        };
    }

    private ResponseStatusException mapCause(Throwable cause, String unavailableMessage) {
        if (cause instanceof FeignException feignException) {
            HttpStatus status = HttpStatus.resolve(feignException.status());
            if (status != null && status.is4xxClientError()) {
                return new ResponseStatusException(status, clientErrorMessage(status), cause);
            }
        }

        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, unavailableMessage, cause);
    }

    private String clientErrorMessage(HttpStatus status) {
        return switch (status) {
            case UNAUTHORIZED -> "Invalid credentials";
            case FORBIDDEN -> "User account is not allowed to login";
            case CONFLICT -> "User data already exists";
            default -> "User service rejected the request";
        };
    }
}
