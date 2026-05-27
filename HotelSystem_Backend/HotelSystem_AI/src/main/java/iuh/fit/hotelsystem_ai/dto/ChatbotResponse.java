package iuh.fit.hotelsystem_ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChatbotResponse(
        String message,
        ChatAction action,
        String intent,
        String source
) {
}
