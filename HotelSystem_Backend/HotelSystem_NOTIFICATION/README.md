# HotelSystem_NOTIFICATION (Notification Service)

Service **thông báo**: lưu và truy vấn các notification khi booking/payment thành công.

## Port

- `8086`

## Base path

- `/notifications`

## REST endpoints

- `GET /notifications` — list notifications
- `GET /notifications?userId={userId}` — list theo userId
- `GET /notifications?bookingId={bookingId}` — list theo bookingId

## RabbitMQ

Notification service lắng nghe:

- `booking.confirmed` → tạo notification loại BOOKING_SUCCESS
- `payment.result` → nếu SUCCESS tạo notification loại PAYMENT_SUCCESS

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_notification`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

## Chạy service

```bash
docker compose -f docker-compose.dev.yml up -d notification-service
```

## Cập nhật README khi thay đổi

- Nếu đổi endpoint/query params: cập nhật mục **REST endpoints**.
- Nếu đổi routing keys/flow: cập nhật mục **RabbitMQ**.
- Nếu đổi JWT/DB/RabbitMQ config: cập nhật mục **ENV / Config**.
