package iuh.fit.hotelsystem_gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/room")
    public ResponseEntity<Map<String, String>> room() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "Room service timeout or unavailable"));
    }

    @GetMapping("/booking")
    public ResponseEntity<Map<String, String>> booking() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "Booking service timeout or unavailable"));
    }

    @GetMapping("/payment")
    public ResponseEntity<Map<String, String>> payment() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "Payment service timeout or unavailable"));
    }
}
