package iuh.fit.hotelsystem_payment.config;

import iuh.fit.hotelsystem_payment.socket.PaymentSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class PaymentWebSocketConfig implements WebSocketConfigurer {
    private final PaymentSocketHandler paymentSocketHandler;

    public PaymentWebSocketConfig(PaymentSocketHandler paymentSocketHandler) {
        this.paymentSocketHandler = paymentSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(paymentSocketHandler, "/ws/payments").setAllowedOrigins("*");
    }
}
