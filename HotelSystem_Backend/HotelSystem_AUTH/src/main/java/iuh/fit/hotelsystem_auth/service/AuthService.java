package iuh.fit.hotelsystem_auth.service;

import iuh.fit.hotelsystem_auth.dto.request.LoginRequest;
import iuh.fit.hotelsystem_auth.dto.request.RegisterRequest;
import iuh.fit.hotelsystem_auth.dto.response.AuthResponse;
import iuh.fit.hotelsystem_auth.entity.*;
import iuh.fit.hotelsystem_auth.repository.*;
import iuh.fit.hotelsystem_auth.util.JwtUtil;
import iuh.fit.hotelsystem_auth.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final RefreshTokenRepository refreshTokenRepo;
    private final RegistrationSessionRepository sessionRepo;
    private final PasswordUtil passwordUtil;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final RestTemplate restTemplate;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    @Value("${user.service.url:http://user-service:8082}")
    private String userServiceUrl;

    public AuthService(
            RefreshTokenRepository refreshTokenRepo,
            RegistrationSessionRepository sessionRepo,
            PasswordUtil passwordUtil,
            JwtUtil jwtUtil,
            EmailService emailService,
            RestTemplate restTemplate
    ) {
        this.refreshTokenRepo = refreshTokenRepo;
        this.sessionRepo = sessionRepo;
        this.passwordUtil = passwordUtil;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.restTemplate = restTemplate;
    }

    public String register(RegisterRequest req) {
        // Call user-service to check if email/phone exists
        try {
            String checkUrl = userServiceUrl + "/api/users/internal/check-exists?email=" + req.getEmail() + "&phone=" + req.getPhoneNumber();
            ResponseEntity<Map> response = restTemplate.getForEntity(checkUrl, Map.class);
            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("exists"))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or phone number already exists");
            }
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(e.getStatusCode(), "Error checking user existence");
        }

        sessionRepo.findByEmail(req.getEmail()).ifPresent(sessionRepo::delete);

        RegistrationSession session = new RegistrationSession();
        session.setEmail(req.getEmail());
        session.setPhoneNumber(req.getPhoneNumber());
        session.setName(req.getName());
        session.setDateOfBirth(req.getDateOfBirth());
        session.setGender(req.getGender());
        session.setAddress(req.getAddress());
        session.setPassword(passwordUtil.encode(req.getPassword()));
        session.setRole(req.getRole());
        session.setRegistrationToken(UUID.randomUUID().toString());

        sessionRepo.save(session);
        return session.getRegistrationToken();
    }

    public void sendOtp(String regToken, String method) {
        RegistrationSession session = sessionRepo.findByRegistrationToken(regToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration session not found"));

        if (session.getLastSentAt() != null &&
                session.getLastSentAt().plusSeconds(60).isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait 1 minute before resending OTP");
        }

        String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));
        session.setOtp(otp);
        session.setOtpExpiry(Instant.now().plusSeconds(300));
        session.setLastSentAt(Instant.now());
        sessionRepo.save(session);

        if ("EMAIL".equalsIgnoreCase(method)) {
            emailService.sendOtpEmail(session.getEmail(), otp);
        } else if ("PHONE".equalsIgnoreCase(method)) {
            System.out.println("========================================");
            System.out.println("LOCAL SMS to " + session.getPhoneNumber() + ": Your OTP is " + otp);
            System.out.println("========================================");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP method");
        }
    }

    @jakarta.transaction.Transactional
    public void verifyOtp(String regToken, String otp) {
        RegistrationSession session = sessionRepo.findByRegistrationToken(regToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration session not found"));

        if (session.getOtp() == null || !session.getOtp().equals(otp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP");
        }

        if (session.getOtpExpiry().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP expired");
        }

        // Call user-service to create user
        Map<String, Object> createReq = new HashMap<>();
        createReq.put("email", session.getEmail());
        createReq.put("phoneNumber", session.getPhoneNumber());
        createReq.put("name", session.getName());
        createReq.put("dateOfBirth", session.getDateOfBirth());
        createReq.put("gender", session.getGender());
        createReq.put("address", session.getAddress());
        createReq.put("password", session.getPassword());
        createReq.put("role", session.getRole());

        try {
            restTemplate.postForEntity(userServiceUrl + "/api/users/internal/create", createReq, Map.class);
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(e.getStatusCode(), "Error creating user in user-service: " + e.getResponseBodyAsString());
        }

        sessionRepo.delete(session);
    }

    public AuthResponse login(LoginRequest req) {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("email", req.getEmail());
        credentials.put("password", req.getPassword());

        Map<String, Object> userData;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(userServiceUrl + "/api/users/internal/verify", credentials, Map.class);
            userData = response.getBody();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            } else if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang tạm ngưng");
            }
            throw new ResponseStatusException(e.getStatusCode(), "Authentication service error");
        }

        if (userData == null || !userData.containsKey("id")) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid response from user-service");
        }

        Long userId = ((Number) userData.get("id")).longValue();
        String email = (String) userData.get("email");
        String role = (String) userData.get("role");

        String accessToken = jwtUtil.generateToken(userId, email, role);

        RefreshToken refreshToken = refreshTokenRepo.findByUserId(userId).orElse(null);

        if (refreshToken != null && refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepo.delete(refreshToken);
            refreshToken = null;
        }

        if (refreshToken == null) {
            refreshToken = new RefreshToken();
            refreshToken.setUserId(userId);
            refreshToken.setEmail(email);
            refreshToken.setRole(role);
            refreshToken.setToken(UUID.randomUUID().toString());
            refreshToken.setExpiryDate(Instant.now().plusMillis(refreshExpiration));
            refreshTokenRepo.save(refreshToken);
        } else {
            refreshToken.setToken(UUID.randomUUID().toString());
            refreshToken.setExpiryDate(Instant.now().plusMillis(refreshExpiration));
            refreshTokenRepo.save(refreshToken);
        }

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    public AuthResponse refresh(String token) {
        RefreshToken refreshToken = refreshTokenRepo.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepo.delete(refreshToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
        }

        String newAccessToken = jwtUtil.generateToken(
                refreshToken.getUserId(),
                refreshToken.getEmail(),
                refreshToken.getRole()
        );

        return new AuthResponse(newAccessToken, refreshToken.getToken());
    }
}
