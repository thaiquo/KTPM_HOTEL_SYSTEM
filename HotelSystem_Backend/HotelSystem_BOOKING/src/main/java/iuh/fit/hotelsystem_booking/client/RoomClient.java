package iuh.fit.hotelsystem_booking.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class RoomClient {

    private final WebClient webClient;
    private final Duration timeout;

    public RoomClient(
            @Value("${room.service.base-url:http://room-service:8083}") String baseUrl,
            @Value("${room.service.timeout-ms:1500}") long timeoutMs
    ) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        this.timeout = Duration.ofMillis(timeoutMs);
    }

    public RoomDto getRoomById(Long roomId) {
        return webClient
                .get()
                .uri("/rooms/{id}", roomId)
                .retrieve()
                .onStatus(HttpStatus.NOT_FOUND::equals, r -> Mono.error(new IllegalArgumentException("room not found")))
                .bodyToMono(RoomDto.class)
                .timeout(timeout)
                .block();
    }

    public record RoomDto(Long id, String status) {
        public boolean isAvailable() {
            return status != null && status.equalsIgnoreCase("AVAILABLE");
        }
    }
}
