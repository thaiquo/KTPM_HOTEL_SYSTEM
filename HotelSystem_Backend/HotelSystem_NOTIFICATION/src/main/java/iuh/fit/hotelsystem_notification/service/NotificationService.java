package iuh.fit.hotelsystem_notification.service;

import iuh.fit.hotelsystem_notification.entity.Notification;
import iuh.fit.hotelsystem_notification.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    public void saveNotification(Long bookingId, Long userId,
                                 String type, String message) {

        Notification notification = new Notification();
        notification.setBookingId(bookingId);
        notification.setUserId(userId);
        notification.setType(type);
        notification.setMessage(message);
        notification.setCreatedAt(LocalDateTime.now());

        repository.save(notification);
    }
}