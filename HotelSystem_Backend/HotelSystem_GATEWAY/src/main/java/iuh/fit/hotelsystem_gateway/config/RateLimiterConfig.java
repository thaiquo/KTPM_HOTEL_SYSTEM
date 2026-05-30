package iuh.fit.hotelsystem_gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpCookie;
import org.springframework.context.annotation.Primary;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Configuration
public class RateLimiterConfig {

    public static final String RATE_LIMIT_USER_ID_ATTR = "rateLimitUserId";
    public static final String RATE_LIMIT_AUTH_IDENTITY_ATTR = "rateLimitAuthIdentity";

    @Bean
    @Primary
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just("ip:" + hash(resolveClientIp(exchange)));
    }

    @Bean
    public KeyResolver userOrIpKeyResolver() {
        return exchange -> {
            String userId = exchange.getAttribute(RATE_LIMIT_USER_ID_ATTR);
            if (userId != null && !userId.isBlank()) {
                return Mono.just("user:" + hash(userId));
            }
            return Mono.just("ip:" + hash(resolveClientIp(exchange)));
        };
    }

    @Bean
    public KeyResolver authIdentityKeyResolver() {
        return exchange -> {
            String identity = exchange.getAttribute(RATE_LIMIT_AUTH_IDENTITY_ATTR);
            if (identity != null && !identity.isBlank()) {
                return Mono.just("auth:" + hash(identity));
            }
            return Mono.just("auth-ip:" + hash(resolveClientIp(exchange)));
        };
    }

    @Bean
    public KeyResolver otpIdentityKeyResolver() {
        return exchange -> {
            String regToken = exchange.getRequest().getQueryParams().getFirst("regToken");
            if (regToken == null || regToken.isBlank()) {
                regToken = Optional.ofNullable(exchange.getRequest().getCookies().getFirst("reg_token"))
                        .map(HttpCookie::getValue)
                        .orElse(null);
            }
            if (regToken != null && !regToken.isBlank()) {
                return Mono.just("otp-reg:" + hash(regToken));
            }
            return Mono.just("otp-ip:" + hash(resolveClientIp(exchange)));
        };
    }

    private static String resolveClientIp(ServerWebExchange exchange) {
        String xForwardedFor = exchange.getRequest()
                .getHeaders()
                .getFirst("X-Forwarded-For");

        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }

        return Optional.ofNullable(exchange.getRequest().getRemoteAddress())
                .map(addr -> addr.getAddress().getHostAddress())
                .orElse("unknown");
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.toLowerCase().trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (int index = 0; index < Math.min(16, digest.length); index++) {
                out.append(String.format("%02x", digest[index]));
            }
            return out.toString();
        } catch (NoSuchAlgorithmException ex) {
            return Integer.toHexString(value.hashCode());
        }
    }
}
