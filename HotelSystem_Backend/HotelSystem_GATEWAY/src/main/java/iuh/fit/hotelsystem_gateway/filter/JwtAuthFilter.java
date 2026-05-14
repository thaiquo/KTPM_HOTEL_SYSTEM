package iuh.fit.hotelsystem_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secretKey;

    private static final List<String> EXCLUDED_PATHS = List.of(
            "/auth-api/auth/login",
            "/auth-api/auth/register",
            "/auth-api/auth/verify-otp",
            "/auth-api/auth/send-otp",
            "/auth-api/auth/refresh",
            "/payment-api/payments/vnpay-return",
            "/payment-api/payments/momo-return",
            "/payment-api/payments/momo-ipn",
            // Actuator endpoints (health checks, metrics)
            "/actuator"
    );

    private static final List<String> EXCLUDED_GET_PATHS = List.of(
            "/room-api",
            "/booking-api"
    );

    private static final List<String> EXCLUDED_POST_PATHS = List.of(
            "/booking-api/bookings/pricing"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod() != null ? request.getMethod().toString() : "GET";

        // CORS preflight must not require JWT (browser sends OPTIONS without Authorization).
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return chain.filter(exchange);
        }

        // Skip validation for public paths
        if (EXCLUDED_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        // Allow GET requests to certain paths (browsing is public)
        if ("GET".equalsIgnoreCase(method) && EXCLUDED_GET_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        // Allow public preview calculations that do not create or mutate data.
        if ("POST".equalsIgnoreCase(method) && EXCLUDED_POST_PATHS.stream().anyMatch(path::equals)) {
            return chain.filter(exchange);
        }

        if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
            return onError(exchange, "Missing Authorization Header", HttpStatus.UNAUTHORIZED);
        }

        String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return onError(exchange, "Invalid Authorization Header", HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = validateToken(token);
            String userIdHeader = resolveUserIdClaim(claims);
            String role = claims.get("role", String.class);
            // Optionally add user info to headers for downstream services
            ServerHttpRequest.Builder mutate = request.mutate()
                    .header("X-User-Email", claims.getSubject());
            if (userIdHeader != null) {
                mutate.header("X-User-Id", userIdHeader);
            }
            if (role != null) {
                mutate.header("X-User-Role", role);
            }
            ServerHttpRequest modifiedRequest = mutate.build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        } catch (Exception e) {
            return onError(exchange, "Invalid Token: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Must match auth-service / microservices {@code JwtUtil#getKey()}:
     * try Base64-decode of {@code jwt.secret}, else raw UTF-8 bytes; then SHA-256 if &lt; 32 bytes.
     */
    private SecretKey resolveSigningKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (Exception ex) {
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            try {
                keyBytes = MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available", e);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static String resolveUserIdClaim(Claims claims) {
        Object raw = claims.get("userId");
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number) {
            return String.valueOf(((Number) raw).longValue());
        }
        return raw.toString();
    }

    private Claims validateToken(String token) {
        SecretKey key = resolveSigningKey();

        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
