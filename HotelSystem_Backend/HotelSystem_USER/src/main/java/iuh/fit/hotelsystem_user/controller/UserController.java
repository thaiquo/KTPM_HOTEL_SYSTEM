package iuh.fit.hotelsystem_user.controller;

import iuh.fit.hotelsystem_user.entity.UserProfile;
import iuh.fit.hotelsystem_user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
//@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public UserProfile getMyProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return service.getProfile(userId);
    }

    @PutMapping("/me")
    public UserProfile updateMyProfile(
            Authentication authentication,
            @RequestBody UserProfile updated
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return service.updateProfile(userId, updated);
    }

    @PostMapping
    public UserProfile createProfile(
            Authentication authentication,
            @RequestBody UserProfile profile
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return service.createProfile(userId, profile);
    }
}
