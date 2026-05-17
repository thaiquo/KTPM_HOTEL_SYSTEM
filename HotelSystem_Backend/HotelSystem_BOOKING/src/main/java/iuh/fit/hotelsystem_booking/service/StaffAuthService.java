package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.StaffTokenInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StaffAuthService {

    private static final Pattern USER_ID_PATTERN = Pattern.compile("\"userId\"\\s*:\\s*(\\d+)");
    private static final Pattern ROLE_PATTERN = Pattern.compile("\"role\"\\s*:\\s*\"([^\"]+)\"");

    public StaffTokenInfo requireStaffOrAdmin(HttpServletRequest request) {
        if (request != null) {
            String gatewayRole = request.getHeader("X-User-Role");
            String gatewayUserId = request.getHeader("X-User-Id");
            if (gatewayRole != null && gatewayUserId != null) {
                String role = gatewayRole.trim().toUpperCase();
                if ("STAFF".equals(role) || "ADMIN".equals(role)) {
                    try {
                        return new StaffTokenInfo(Long.parseLong(gatewayUserId.trim()), role);
                    } catch (NumberFormatException ignored) {
                        // fall through to Bearer token
                    }
                }
            }
        }
        if (request == null) {
            throw new SecurityException("Missing access token");
        }
        return requireStaffOrAdmin(request.getHeader("Authorization"));
    }

    public StaffTokenInfo requireStaffOrAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new SecurityException("Missing access token");
        }
        String token = authorizationHeader.substring("Bearer ".length());
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            throw new SecurityException("Invalid access token");
        }
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        Long staffId = extractLong(payload, USER_ID_PATTERN);
        String role = extractString(payload, ROLE_PATTERN);
        if (staffId == null || role == null || (!"STAFF".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role))) {
            throw new SecurityException("STAFF or ADMIN role is required");
        }
        return new StaffTokenInfo(staffId, role.toUpperCase());
    }

    private Long extractLong(String payload, Pattern pattern) {
        Matcher matcher = pattern.matcher(payload);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }

    private String extractString(String payload, Pattern pattern) {
        Matcher matcher = pattern.matcher(payload);
        return matcher.find() ? matcher.group(1) : null;
    }
}
