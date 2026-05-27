package iuh.fit.hotelsystem_booking.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final long SLOW_API_THRESHOLD_MS = 1000L;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long tookMs = System.currentTimeMillis() - startedAt;
            String userId = request.getHeader("X-User-Id");
            String message = "%s %s %d %dms userId=%s".formatted(
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    tookMs,
                    userId == null || userId.isBlank() ? "-" : userId
            );
            if (tookMs > SLOW_API_THRESHOLD_MS) {
                log.warn("SLOW API: {}", message);
            } else {
                log.info(message);
            }
        }
    }
}
