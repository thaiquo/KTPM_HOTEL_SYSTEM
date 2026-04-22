package iuh.fit.hotelsystem_auth.service;

import iuh.fit.hotelsystem_auth.dto.request.LoginRequest;
import iuh.fit.hotelsystem_auth.dto.request.RegisterRequest;
import iuh.fit.hotelsystem_auth.dto.response.AuthResponse;
import iuh.fit.hotelsystem_auth.entity.*;
import iuh.fit.hotelsystem_auth.entity.enums.RoleName;
import iuh.fit.hotelsystem_auth.repository.*;
import iuh.fit.hotelsystem_auth.util.JwtUtil;
import iuh.fit.hotelsystem_auth.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final RegistrationSessionRepository sessionRepo;
    private final PasswordUtil passwordUtil;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public AuthService(
            UserRepository userRepo,
            RoleRepository roleRepo,
            RefreshTokenRepository refreshTokenRepo,
            RegistrationSessionRepository sessionRepo,
            PasswordUtil passwordUtil,
            JwtUtil jwtUtil,
            EmailService emailService
    ) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.sessionRepo = sessionRepo;
        this.passwordUtil = passwordUtil;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    // ===================== REGISTER (STEP 1: INITIAL) =====================
    public String register(RegisterRequest req) {

        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        if (userRepo.findByPhoneNumber(req.getPhoneNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number already exists");
        }

        // Check if there's an existing session for this email and delete it
        sessionRepo.findByEmail(req.getEmail()).ifPresent(sessionRepo::delete);

        RegistrationSession session = new RegistrationSession();
        session.setEmail(req.getEmail());
        session.setPhoneNumber(req.getPhoneNumber());
        session.setName(req.getName());
        session.setDateOfBirth(req.getDateOfBirth());
        session.setAddress(req.getAddress());
        session.setPassword(passwordUtil.encode(req.getPassword()));
        session.setRole(req.getRole());
        session.setRegistrationToken(UUID.randomUUID().toString());

        sessionRepo.save(session);
        return session.getRegistrationToken();
    }

    // ===================== SEND OTP (STEP 2) =====================
    public void sendOtp(String regToken, String method) {
        RegistrationSession session = sessionRepo.findByRegistrationToken(regToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration session not found"));

        // Check 1 minute resend limit
        if (session.getLastSentAt() != null &&
                session.getLastSentAt().plusSeconds(60).isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait 1 minute before resending OTP");
        }

        // Generate 6-digit OTP
        String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));
        session.setOtp(otp);
        session.setOtpExpiry(Instant.now().plusSeconds(300)); // 5 minutes
        session.setLastSentAt(Instant.now());
        sessionRepo.save(session);

        if ("EMAIL".equalsIgnoreCase(method)) {
            emailService.sendOtpEmail(session.getEmail(), otp);
        } else if ("PHONE".equalsIgnoreCase(method)) {
            // Local SMS: log to console
            System.out.println("========================================");
            System.out.println("LOCAL SMS to " + session.getPhoneNumber() + ": Your OTP is " + otp);
            System.out.println("========================================");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP method");
        }
    }

    // ===================== VERIFY OTP (STEP 3: FINALIZE) =====================
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

        // OTP is valid, create user
        RoleName roleName = session.getRole() == null
                ? RoleName.CUSTOMER
                : RoleName.valueOf(session.getRole());

        Role role = roleRepo.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        User user = new User();
        user.setEmail(session.getEmail());
        user.setPhoneNumber(session.getPhoneNumber());
        user.setName(session.getName());
        user.setDateOfBirth(session.getDateOfBirth());
        user.setAddress(session.getAddress());
        user.setPassword(session.getPassword());
        user.setRole(role);

        userRepo.save(user);

        // Delete session after success
        sessionRepo.delete(session);
    }

    // ===================== LOGIN =====================
    public AuthResponse login(LoginRequest req) {

        // 1️⃣ Kiểm tra user
        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordUtil.matches(req.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // 2️⃣ Tạo access token LUÔN MỚI
        String accessToken = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().getName().name()
        );

        // 3️⃣ Lấy refresh token hiện tại (nếu có)
        RefreshToken refreshToken = refreshTokenRepo
                .findByUser_Id(user.getId())
                .orElse(null);

        // 4️⃣ Nếu có refresh token nhưng HẾT HẠN → xóa
        if (refreshToken != null &&
                refreshToken.getExpiryDate().isBefore(Instant.now())) {

            refreshTokenRepo.delete(refreshToken);
            refreshToken = null;
        }

        // 5️⃣ Nếu chưa có hoặc đã bị xóa → tạo refresh token mới
        if (refreshToken == null) {
            refreshToken = new RefreshToken();
            refreshToken.setUser(user);
            refreshToken.setToken(UUID.randomUUID().toString());
            refreshToken.setExpiryDate(
                    Instant.now().plusMillis(refreshExpiration)
            );
            refreshTokenRepo.save(refreshToken);
        } else {
            // 🔐 Rotate refresh token (best practice)
            refreshToken.setToken(UUID.randomUUID().toString());
            refreshToken.setExpiryDate(
                    Instant.now().plusMillis(refreshExpiration)
            );
            refreshTokenRepo.save(refreshToken);
        }

        // 6️⃣ Trả về access + refresh token
        return new AuthResponse(
                accessToken,
                refreshToken.getToken()
        );
    }

    // ===================== REFRESH ACCESS TOKEN =====================
    public AuthResponse refresh(String token) {

        RefreshToken refreshToken = refreshTokenRepo.findByToken(token)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepo.delete(refreshToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
        }

        User user = refreshToken.getUser();

        String newAccessToken = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().getName().name()
        );

        return new AuthResponse(newAccessToken, refreshToken.getToken());
    }
}
