package iuh.fit.hotelsystem_ai.controller;

import iuh.fit.hotelsystem_ai.dto.ChatbotRequest;
import iuh.fit.hotelsystem_ai.dto.ChatbotResponse;
import iuh.fit.hotelsystem_ai.service.ChatbotService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/chat")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping
    public ChatbotResponse chat(@Valid @RequestBody ChatbotRequest request) {
        return chatbotService.reply(request);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
