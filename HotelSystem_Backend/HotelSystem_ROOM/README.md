# 🏨 HotelSystem_ROOM (Room Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

Service **quản lý phòng và hạng phòng**. Xử lý trạng thái phòng và đồng bộ với hệ thống đặt phòng.

## 🚀 Tính năng chính
- Quản lý danh mục hạng phòng (Room Types).
- Quản lý danh sách phòng (Rooms).
- Xử lý trạng thái phòng (AVAILABLE, HELD, OCCUPIED, CLEANING).
- Lắng nghe sự kiện từ BOOKING để giữ chỗ (Hold) hoặc giải phóng (Release) phòng.
- Tìm kiếm phòng trống theo thời gian.

## 🔌 Cấu hình kết nối
- **Port**: `8083`
- **Base Path**: `/rooms`

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/rooms/available` | Tìm kiếm phòng trống |
| `GET` | `/rooms/{id}` | Chi tiết phòng |
| `GET` | `/rooms/types` | Danh sách hạng phòng |
| `PUT` | `/rooms/{id}/status` | Cập nhật trạng thái phòng |
