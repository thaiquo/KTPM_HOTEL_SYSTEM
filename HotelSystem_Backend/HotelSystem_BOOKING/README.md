# 📑 HotelSystem_BOOKING (Booking Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

Service **tạo và quản lý đặt phòng**. Đây là service cốt lõi điều phối trạng thái giữa các dịch vụ ROOM và PAYMENT thông qua cơ chế bất đồng bộ (RabbitMQ).

## 🚀 Tính năng chính
- Quản lý quy trình đặt phòng (Booking Lifecycle).
- Áp dụng quy tắc nghiệp vụ Ngày Lễ/Tết (Holiday Pricing & Rules).
- Tự động hủy booking quá hạn thanh toán (Hold Expiry).
- Tính toán phí hủy phòng (Cancellation Policy).
- Phụ thu Check-in sớm / Check-out trễ.

## 🔌 Cấu hình kết nối
- **Port**: `8084`
- **Base Path**: `/bookings`

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/bookings` | Tạo đặt phòng mới |
| `GET` | `/bookings/{id}` | Lấy thông tin chi tiết đặt phòng |
| `GET` | `/bookings/user/{userId}` | Danh sách đặt phòng của người dùng |
| `POST` | `/bookings/{id}/check-in` | Thực hiện thủ tục nhận phòng |
| `POST` | `/bookings/{id}/cancel` | Hủy đặt phòng |

### Body mẫu khi tạo booking

Backend hiện nhận entity `Booking` tối thiểu:

```json
{
  "roomId": 1,
  "userId": 1,
  "checkIn": "2026-04-14",
  "checkOut": "2026-04-15"
}
```

`status` và `createdAt` được service tự set.

## RabbitMQ flow (đặt phòng + thanh toán)

- Khi `POST /bookings`: publish `room.hold`
- Khi nhận `payment.result`:
  - FULL_PAID: set booking `CONFIRMED`, publish `room.confirm` và `booking.confirmed`
  - DEPOSIT_PAID: set booking `DEPOSIT_PAID`, publish `room.confirm` và `booking.confirmed`
  - REMAINING_PAID: set booking `CHECKED_IN`
  - FAILED: set booking `CANCELLED`, publish `room.release` và `booking.cancelled`

## Booking status

- `PENDING`
- `DEPOSIT_PAID`
- `CONFIRMED`
- `CHECKED_IN`
- `CANCELLED`

## Rule nhận phòng

- `CONFIRMED` -> được check-in trực tiếp
- `DEPOSIT_PAID` -> cần gọi Payment Service tạo thanh toán `REMAINING` trước
- `PENDING` hoặc `CANCELLED` -> không được check-in

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_booking`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

## Chạy service

```bash
docker compose -f docker-compose.dev.yml up -d booking-service
```

## Test nhanh

```bash
curl -X POST http://localhost:8084/bookings \
  -H "Content-Type: application/json" \
  -d '{"roomId":1,"userId":1,"checkIn":"2026-04-14","checkOut":"2026-04-15"}'

curl http://localhost:8084/bookings/user/1
```
