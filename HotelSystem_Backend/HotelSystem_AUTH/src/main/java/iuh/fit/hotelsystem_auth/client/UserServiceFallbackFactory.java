package iuh.fit.hotelsystem_auth.client;

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
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "User service is temporarily unavailable. Please try again later.");
            }

            @Override
            public Map<String, Object> createUser(Map<String, Object> request) {
                log.error("user-service is unavailable for createUser. error={}", cause.getMessage());
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "User service is temporarily unavailable. Please try again later.");
            }

            @Override
            public Map<String, Object> verifyCredentials(Map<String, String> credentials) {
                log.error("user-service is unavailable for verifyCredentials. error={}", cause.getMessage());
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "User service is temporarily unavailable. Please try again later.");
            }
        };
    }
}
