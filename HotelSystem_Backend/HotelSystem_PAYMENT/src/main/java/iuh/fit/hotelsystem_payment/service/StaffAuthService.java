package iuh.fit.hotelsystem_payment.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StaffAuthService {

    private static final Pattern ROLE_PATTERN = Pattern.compile("\"role\"\\s*:\\s*\"([^\"]+)\"");

    public void requireStaffOrAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new SecurityException("Missing access token");
        }
        String[] parts = authorizationHeader.substring("Bearer ".length()).split("\\.");
        if (parts.length < 2) {
            throw new SecurityException("Invalid access token");
        }
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        Matcher matcher = ROLE_PATTERN.matcher(payload);
        String role = matcher.find() ? matcher.group(1) : null;
        if (role == null || (!"STAFF".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role))) {
            throw new SecurityException("STAFF or ADMIN role is required");
        }
    }
}
