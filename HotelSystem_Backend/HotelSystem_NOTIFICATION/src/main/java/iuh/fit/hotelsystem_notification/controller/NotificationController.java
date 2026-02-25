package iuh.fit.hotelsystem_notification.controller;

import iuh.fit.hotelsystem_notification.entity.Notification;
import iuh.fit.hotelsystem_notification.repository.NotificationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Notification> list(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long bookingId
    ) {
        if (userId != null) {
            return repository.findByUserId(userId);
        }
        if (bookingId != null) {
            return repository.findByBookingId(bookingId);
        }
        return repository.findAll();
    }
}
