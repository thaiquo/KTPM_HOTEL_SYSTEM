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
    private final PasswordUtil passwordUtil;
    private final JwtUtil jwtUtil;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public AuthService(
            UserRepository userRepo,
            RoleRepository roleRepo,
            RefreshTokenRepository refreshTokenRepo,
            PasswordUtil passwordUtil,
            JwtUtil jwtUtil
    ) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.passwordUtil = passwordUtil;
        this.jwtUtil = jwtUtil;
    }

    // ===================== REGISTER =====================
    public void register(RegisterRequest req) {

        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        RoleName roleName = req.getRole() == null
                ? RoleName.CUSTOMER
                : RoleName.valueOf(req.getRole());

        Role role = roleRepo.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordUtil.encode(req.getPassword()));
        user.setRole(role);

        userRepo.save(user);
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
