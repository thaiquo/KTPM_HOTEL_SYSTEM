package iuh.fit.hotelsystem_auth.controller;

import iuh.fit.hotelsystem_auth.dto.request.LoginRequest;
import iuh.fit.hotelsystem_auth.dto.request.RefreshTokenRequest;
import iuh.fit.hotelsystem_auth.dto.request.RegisterRequest;
import iuh.fit.hotelsystem_auth.dto.response.AuthResponse;
import iuh.fit.hotelsystem_auth.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest req, HttpServletResponse response) {
        String regToken = service.register(req);
        
        Cookie cookie = new Cookie("reg_token", regToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(600); // 10 minutes
        response.addCookie(cookie);

        return ResponseEntity.ok(regToken);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<String> sendOtp(
            @RequestParam String method,
            @RequestParam(required = false) String regToken,
            HttpServletRequest request) {
        
        String token = (regToken != null && !regToken.isEmpty()) ? regToken : getRegToken(request);
        service.sendOtp(token, method);
        return ResponseEntity.ok("OTP sent via " + method);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(
            @RequestParam String otp,
            @RequestParam(required = false) String regToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String token = (regToken != null && !regToken.isEmpty()) ? regToken : getRegToken(request);
        service.verifyOtp(token, otp);

        // Clear the cookie after success
        Cookie cookie = new Cookie("reg_token", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok("Registration successful. You can now login.");
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return service.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody RefreshTokenRequest req) {
        return service.refresh(req.getRefreshToken());
    }

    private String getRegToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            throw new RuntimeException("Registration session cookie missing. Please provide regToken parameter.");
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> "reg_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Registration session cookie missing. Please provide regToken parameter."));
    }
}
