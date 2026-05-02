package iuh.fit.hotelsystem_payment.socket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class PaymentSocketHandler extends TextWebSocketHandler {
    private final PaymentSocketService paymentSocketService;

    public PaymentSocketHandler(PaymentSocketService paymentSocketService) {
        this.paymentSocketService = paymentSocketService;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        if (payload.contains("\"event\":\"payment:join\"")) {
            paymentSocketService.join(extractPaymentCode(payload), session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        paymentSocketService.remove(session);
    }

    private String extractPaymentCode(String payload) {
        String marker = "\"paymentCode\":\"";
        int start = payload.indexOf(marker);
        if (start < 0) {
            return "";
        }
        start += marker.length();
        int end = payload.indexOf('"', start);
        return end > start ? payload.substring(start, end) : "";
    }
}
