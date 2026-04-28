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
- `POST /bookings/{id}/check-in` — nhận phòng theo rule status

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
