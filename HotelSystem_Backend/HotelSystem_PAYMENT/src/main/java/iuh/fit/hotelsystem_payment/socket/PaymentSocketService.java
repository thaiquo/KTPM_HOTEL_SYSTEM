package iuh.fit.hotelsystem_payment.socket;

import iuh.fit.hotelsystem_payment.dto.CheckinPaymentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentSocketService {
    private final Map<String, Set<WebSocketSession>> sessionsByPaymentCode = new ConcurrentHashMap<>();

    public void join(String paymentCode, WebSocketSession session) {
        if (paymentCode == null || paymentCode.isBlank()) {
            return;
        }
        sessionsByPaymentCode
                .computeIfAbsent(paymentCode, ignored -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    public void remove(WebSocketSession session) {
        sessionsByPaymentCode.values().forEach(sessions -> sessions.remove(session));
    }

    public void emit(String event, CheckinPaymentEvent payload) {
        Set<WebSocketSession> sessions = sessionsByPaymentCode.get(payload.getPaymentCode());
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String message = "{\"event\":\"" + escape(event) + "\",\"payload\":{"
                + "\"paymentCode\":\"" + escape(payload.getPaymentCode()) + "\","
                + "\"bookingId\":" + payload.getBookingId() + ","
                + "\"amount\":" + payload.getAmount() + ","
                + "\"status\":\"" + escape(payload.getStatus()) + "\","
                + "\"checkinStatus\":" + nullableString(payload.getCheckinStatus())
                + ",\"payerGuestId\":" + nullableNumber(payload.getPayerGuestId())
                + ",\"payerName\":" + nullableString(payload.getPayerName())
                + ",\"payerPhone\":" + nullableString(payload.getPayerPhone())
                + ",\"payerCccd\":" + nullableString(payload.getPayerCccd())
                + "}}";
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException ignored) {
                    remove(session);
                }
            }
        }
    }

    private String nullableString(String value) {
        return value == null ? "null" : "\"" + escape(value) + "\"";
    }

    private String nullableNumber(Long value) {
        return value == null ? "null" : String.valueOf(value);
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
