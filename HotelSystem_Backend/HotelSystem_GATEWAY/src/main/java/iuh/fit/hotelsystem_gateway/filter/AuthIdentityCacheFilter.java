package iuh.fit.hotelsystem_gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_gateway.config.RateLimiterConfig;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class AuthIdentityCacheFilter implements GlobalFilter, Ordered {

    private static final List<String> AUTH_BODY_IDENTITY_PATHS = List.of(
            "/auth-api/auth/login",
            "/auth-api/auth/register"
    );

    private final ObjectMapper objectMapper;

    public AuthIdentityCacheFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod() != null ? request.getMethod().toString() : "GET";

        if (!"POST".equalsIgnoreCase(method) || !AUTH_BODY_IDENTITY_PATHS.contains(path)) {
            return chain.filter(exchange);
        }

        return DataBufferUtils.join(request.getBody())
                .defaultIfEmpty(exchange.getResponse().bufferFactory().wrap(new byte[0]))
                .flatMap(dataBuffer -> {
                    byte[] body = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(body);
                    DataBufferUtils.release(dataBuffer);

                    extractIdentity(body).ifPresent(identity ->
                            exchange.getAttributes().put(RateLimiterConfig.RATE_LIMIT_AUTH_IDENTITY_ATTR, identity));

                    ServerHttpRequest decoratedRequest = decorateRequest(exchange, request, body);
                    return chain.filter(exchange.mutate().request(decoratedRequest).build());
                });
    }

    private java.util.Optional<String> extractIdentity(byte[] body) {
        if (body.length == 0) {
            return java.util.Optional.empty();
        }
        try {
            JsonNode root = objectMapper.readTree(new String(body, StandardCharsets.UTF_8));
            String identity = firstText(root, "email", "phoneNumber", "phone", "username");
            if (identity == null || identity.isBlank()) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.of(identity.trim().toLowerCase());
        } catch (Exception ignored) {
            return java.util.Optional.empty();
        }
    }

    private String firstText(JsonNode root, String... fields) {
        for (String field : fields) {
            JsonNode value = root.get(field);
            if (value != null && value.isTextual() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        return null;
    }

    private ServerHttpRequest decorateRequest(ServerWebExchange exchange,
                                              ServerHttpRequest request,
                                              byte[] body) {
        return new ServerHttpRequestDecorator(request) {
            @Override
            public Flux<DataBuffer> getBody() {
                return Flux.defer(() -> Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
            }

            @Override
            public HttpHeaders getHeaders() {
                HttpHeaders headers = new HttpHeaders();
                headers.putAll(super.getHeaders());
                headers.remove(HttpHeaders.TRANSFER_ENCODING);
                headers.setContentLength(body.length);
                return headers;
            }
        };
    }

    @Override
    public int getOrder() {
        return -4;
    }
}
