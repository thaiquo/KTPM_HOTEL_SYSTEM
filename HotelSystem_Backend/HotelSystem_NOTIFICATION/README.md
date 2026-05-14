# 🔔 HotelSystem_NOTIFICATION (Notification Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

Service **gửi thông báo**. Lắng nghe các sự kiện từ hệ thống để gửi thông báo đến người dùng qua các kênh khác nhau.

## 🚀 Tính năng chính
- Lắng nghe sự kiện `booking.confirmed`, `booking.cancelled`, `payment.success`.
- Gửi thông báo xác nhận đặt phòng thành công.
- Gửi thông báo nhắc lịch Check-in.
- (Mở rộng) Gửi Email hoặc Push Notification.

## 🔌 Cấu hình kết nối
- **Internal Port**: `8086`
- **Service ID**: `notification-service` (Đăng ký với Eureka)
- **Gateway Path**: `/notification-api/**`
- **Tracing**: Brave/Zipkin enabled
