package iuh.fit.hotelsystem_notification.repository;

import iuh.fit.hotelsystem_notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	List<Notification> findByUserId(Long userId);

	List<Notification> findByBookingId(Long bookingId);
}
