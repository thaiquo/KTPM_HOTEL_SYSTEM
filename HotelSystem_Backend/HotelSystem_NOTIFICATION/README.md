# 🔔 HotelSystem_NOTIFICATION (Notification Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

Service **Gửi thông báo** (Notification) là mảnh ghép tối ưu hóa tương tác khách hàng của hệ thống. Service hoạt động theo cơ chế lắng nghe sự kiện bất đồng bộ (Reactive/Event-Driven) từ hàng đợi tin nhắn RabbitMQ để tự động hóa quy trình gửi email xác nhận đặt phòng, thông báo giao dịch thành công, nhắc lịch check-in hoặc cảnh báo trễ hạn hoàn tiền.

---

## 🚀 Tính năng cốt lõi

1. **Lắng nghe sự kiện hệ thống thời gian thực (RabbitMQ Subscriber)**:
   - Đăng ký tiêu thụ tin nhắn từ các hàng đợi chính:
     - Hàng đợi `notification.booking.queue` lắng nghe sự kiện:
       - `booking.confirmed`: Gửi Email xác nhận đặt phòng thành công kèm mã QR Code đặt phòng.
       - `booking.cancelled`: Gửi thông báo hủy phòng thành công kèm chi tiết hoàn tiền.
     - Hàng đợi `notification.payment.queue` lắng nghe sự kiện:
       - `payment.success`: Gửi hóa đơn điện tử (e-invoice) xác nhận thanh toán thành công (cọc/đầy đủ).
2. **Quản lý lịch sử thông báo (Audit Logs)**:
   - Ghi nhận trạng thái gửi thành công hoặc thất bại vào cơ sở dữ liệu riêng biệt `hotel_notification` trên cổng `55426` để làm cơ sở đối soát và phục vụ cơ chế tự động gửi lại (Retry mechanism) khi gặp sự cố mạng.
3. **Mở rộng đa kênh (Extensible Channels)**:
   - Thiết kế dạng mô-đun hóa dễ dàng cắm thêm các cổng gửi tin nhắn khác bên cạnh Email:
     - SMS Gateways (Twilio/VietGuys).
     - Push Notifications (Firebase Cloud Messaging - FCM) trực tiếp đến ứng dụng di động của Khách hàng/Nhân viên.
4. **Tích hợp Eureka & Gateway**:
   - Tự động đăng ký với Eureka dưới tên ứng dụng `notification-service` để Gateway định tuyến qua đường dẫn `/notification-api/**`.

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8086`
- **Tên đăng ký Eureka**: `notification-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_notification` trên cổng `55426` (Dev container: `postgres-notification`)
- **Hàng đợi tin nhắn**: RabbitMQ (Dev container: `rabbitmq`)
- **Gateway Path**: `/notification-api/**`
