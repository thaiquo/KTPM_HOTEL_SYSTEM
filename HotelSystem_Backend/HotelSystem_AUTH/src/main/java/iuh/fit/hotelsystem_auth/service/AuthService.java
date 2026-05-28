package iuh.fit.hotelsystem_auth.service;

import feign.FeignException;
import iuh.fit.hotelsystem_auth.client.UserServiceClient;
import iuh.fit.hotelsystem_auth.dto.request.LoginRequest;
import iuh.fit.hotelsystem_auth.dto.request.RegisterRequest;
import iuh.fit.hotelsystem_auth.dto.response.AuthResponse;
import iuh.fit.hotelsystem_auth.entity.*;
import iuh.fit.hotelsystem_auth.repository.*;
import iuh.fit.hotelsystem_auth.util.JwtUtil;
import iuh.fit.hotelsystem_auth.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
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
    private final UserServiceClient userServiceClient;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public AuthService(
            RefreshTokenRepository refreshTokenRepo,
            RegistrationSessionRepository sessionRepo,
            PasswordUtil passwordUtil,
            JwtUtil jwtUtil,
            EmailService emailService,
            UserServiceClient userServiceClient
    ) {
        this.refreshTokenRepo = refreshTokenRepo;
        this.sessionRepo = sessionRepo;
        this.passwordUtil = passwordUtil;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.userServiceClient = userServiceClient;
    }

    public String register(RegisterRequest req) {
        // Call user-service to check if email/phone exists
        try {
            Map<String, Object> response = userServiceClient.checkExists(req.getEmail(), req.getPhoneNumber());
            if (response != null && Boolean.TRUE.equals(response.get("exists"))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or phone number already exists");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Error checking user existence: " + e.getMessage());
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

        // Call user-service to create user via Feign
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
            userServiceClient.createUser(createReq);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error creating user in user-service: " + e.getMessage());
        }

        sessionRepo.delete(session);
    }

    public AuthResponse login(LoginRequest req) {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("email", req.getEmail());
        credentials.put("password", req.getPassword());

        Map<String, Object> userData;
        try {
            userData = userServiceClient.verifyCredentials(credentials);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw mapLoginException(e);
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

    private ResponseStatusException mapLoginException(Exception e) {
        if (e instanceof FeignException feignException) {
            HttpStatus status = HttpStatus.resolve(feignException.status());
            if (status != null && status.is4xxClientError()) {
                return new ResponseStatusException(status, loginClientErrorMessage(status));
            }
        }

        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Authentication service error: " + e.getMessage());
    }

    private String loginClientErrorMessage(HttpStatus status) {
        return switch (status) {
            case UNAUTHORIZED -> "Invalid email or password";
            case FORBIDDEN -> "User account is not allowed to login";
            default -> "Invalid login request";
        };
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
