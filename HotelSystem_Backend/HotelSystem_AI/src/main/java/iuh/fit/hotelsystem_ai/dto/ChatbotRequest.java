package iuh.fit.hotelsystem_ai.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ChatbotRequest(
        @NotBlank String message,
        Boolean isAuthenticated,
        List<ChatContextMessage> context
) {
}
