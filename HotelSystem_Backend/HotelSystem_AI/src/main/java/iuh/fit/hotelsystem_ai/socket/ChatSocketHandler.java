package iuh.fit.hotelsystem_ai.socket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_ai.dto.ChatbotRequest;
import iuh.fit.hotelsystem_ai.dto.ChatbotResponse;
import iuh.fit.hotelsystem_ai.service.ChatbotService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ChatSocketHandler extends TextWebSocketHandler {
    private final ChatbotService chatbotService;
    private final ObjectMapper objectMapper;

    public ChatSocketHandler(ChatbotService chatbotService, ObjectMapper objectMapper) {
        this.chatbotService = chatbotService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            JsonNode payload = root.has("payload") ? root.get("payload") : root;
            ChatbotRequest request = objectMapper.treeToValue(payload, ChatbotRequest.class);
            ChatbotResponse reply = chatbotService.reply(request);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("event", "chat:reply");
            if (root.hasNonNull("requestId")) {
                response.put("requestId", root.get("requestId").asText());
            }
            response.put("payload", reply);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (Exception exception) {
            try {
                Map<String, Object> response = Map.of(
                        "event", "chat:error",
                        "message", "Không thể xử lý nội dung chat realtime"
                );
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
            } catch (Exception ignored) {
                // Ignore secondary failure.
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        // No session state to clean up.
    }
}