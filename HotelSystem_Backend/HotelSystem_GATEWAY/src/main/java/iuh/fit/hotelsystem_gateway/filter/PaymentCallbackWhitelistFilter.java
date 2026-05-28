package iuh.fit.hotelsystem_gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;

@Component
public class PaymentCallbackWhitelistFilter implements GlobalFilter, Ordered {

    private static final List<String> PROVIDER_IPN_PATHS = List.of(
            "/payment-api/payments/vnpay-ipn",
            "/payment-api/payments/momo-ipn"
    );

    private final List<String> allowedIpSpecs;

    public PaymentCallbackWhitelistFilter(
            @Value("${payment.callback.allowed-ips:}") String allowedIps) {
        this.allowedIpSpecs = Arrays.stream(allowedIps.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (!PROVIDER_IPN_PATHS.contains(path) || allowedIpSpecs.isEmpty()) {
            return chain.filter(exchange);
        }

        String clientIp = resolveClientIp(exchange.getRequest());
        if (clientIp != null && allowedIpSpecs.stream().anyMatch(spec -> matches(spec, clientIp))) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        return exchange.getResponse().setComplete();
    }

    private String resolveClientIp(ServerHttpRequest request) {
        String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddress() != null
                ? request.getRemoteAddress().getAddress().getHostAddress()
                : null;
    }

    private boolean matches(String spec, String clientIp) {
        if (!spec.contains("/")) {
            return spec.equals(clientIp);
        }
        return matchesCidr(spec, clientIp);
    }

    private boolean matchesCidr(String cidr, String clientIp) {
        String[] parts = cidr.split("/", 2);
        if (parts.length != 2) {
            return false;
        }

        try {
            byte[] network = InetAddress.getByName(parts[0]).getAddress();
            byte[] address = InetAddress.getByName(clientIp).getAddress();
            if (network.length != address.length) {
                return false;
            }

            int prefixLength = Integer.parseInt(parts[1]);
            int fullBytes = prefixLength / 8;
            int remainingBits = prefixLength % 8;

            for (int index = 0; index < fullBytes; index++) {
                if (network[index] != address[index]) {
                    return false;
                }
            }

            if (remainingBits == 0) {
                return true;
            }

            int mask = (-1) << (8 - remainingBits);
            return (network[fullBytes] & mask) == (address[fullBytes] & mask);
        } catch (NumberFormatException | UnknownHostException | ArrayIndexOutOfBoundsException ex) {
            return false;
        }
    }

    @Override
    public int getOrder() {
        return -2;
    }
}
