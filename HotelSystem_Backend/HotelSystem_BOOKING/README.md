# HotelSystem_BOOKING (Booking Service)

Service **tạo và quản lý booking**. Booking service phối hợp với ROOM + PAYMENT qua RabbitMQ.

## Port

- `8084`

## Base path

- `/bookings`

## REST endpoints

- `POST /bookings` — tạo booking
- `GET /bookings/{id}` — lấy booking theo id
- `GET /bookings/user/{userId}` — list booking theo userId

Ghi chú concurrency (tránh đặt trùng phòng):

- BOOKING chỉ cho phép **1 booking active / 1 room** trong cùng thời điểm.
- Nếu room đã có booking `CONFIRMED` hoặc có booking `PENDING` mới trong vòng TTL (mặc định 6 phút) thì `POST /bookings` sẽ trả **409 Conflict**.

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

## RabbitMQ flow (đặt phòng)

- Khi `POST /bookings`: publish `room.hold`
- Khi nhận `room.held`: publish `payment.request`
- Khi nhận `room.hold.failed`: cancel booking (tránh kẹt PENDING)
- Khi nhận `payment.result`:
  - SUCCESS: set booking CONFIRMED, publish `room.confirm` và `booking.confirmed`
  - FAILED: publish `room.release` và `booking.cancelled`

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_booking`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

Booking HOLD TTL:

- `BOOKING_HOLD_TTL_SECONDS` (default 6 phút) — nếu payment.result đến quá trễ thì booking sẽ bị cancel.

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

## Cập nhật README khi thay đổi

- Nếu đổi endpoint/payload/response: cập nhật mục **REST endpoints** + **Body mẫu khi tạo booking**.
- Nếu đổi retry/timeout/rate limit hoặc base-url ROOM: cập nhật mục **ENV / Config**.
