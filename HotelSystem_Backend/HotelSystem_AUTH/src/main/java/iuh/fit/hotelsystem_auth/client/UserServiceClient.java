package iuh.fit.hotelsystem_auth.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "user-service", fallbackFactory = UserServiceFallbackFactory.class)
public interface UserServiceClient {

    @GetMapping("/api/users/internal/check-exists")
    Map<String, Object> checkExists(@RequestParam("email") String email,
                                     @RequestParam("phone") String phone);

    @PostMapping("/api/users/internal/create")
    Map<String, Object> createUser(@RequestBody Map<String, Object> request);

    @PostMapping("/api/users/internal/verify")
    Map<String, Object> verifyCredentials(@RequestBody Map<String, String> credentials);
}
