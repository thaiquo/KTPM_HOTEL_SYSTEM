package iuh.fit.hotelsystem_gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    /**
     * Key Resolver: giới hạn rate theo địa chỉ IP của client.
     * X-Forwarded-For được ưu tiên (khi đứng sau Load Balancer/Proxy).
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String xForwardedFor = exchange.getRequest()
                    .getHeaders()
                    .getFirst("X-Forwarded-For");

            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                // Lấy IP đầu tiên trong chuỗi (client gốc)
                return Mono.just(xForwardedFor.split(",")[0].trim());
            }

            // Fallback: lấy remote address
            return Mono.justOrEmpty(exchange.getRequest().getRemoteAddress())
                    .map(addr -> addr.getAddress().getHostAddress())
                    .defaultIfEmpty("unknown");
        };
    }
}
