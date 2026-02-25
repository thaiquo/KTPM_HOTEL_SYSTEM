package iuh.fit.hotelsystem_auth.controller;



import iuh.fit.hotelsystem_auth.dto.request.LoginRequest;
import iuh.fit.hotelsystem_auth.dto.request.RefreshTokenRequest;
import iuh.fit.hotelsystem_auth.dto.request.RegisterRequest;
import iuh.fit.hotelsystem_auth.dto.response.AuthResponse;
import iuh.fit.hotelsystem_auth.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public void register(@RequestBody RegisterRequest req) {
        service.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return service.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody RefreshTokenRequest req) {
        return service.refresh(req.getRefreshToken());
    }
}
