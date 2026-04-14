# HotelSystem_PAYMENT (Payment Service)

Service **thanh toán (demo)**. Hiện tại flow chính chạy qua RabbitMQ.

## Port

- `8085`

## REST endpoints

- Có controller nhưng có thể đang tắt/không dùng trong flow demo (tuỳ code).

## RabbitMQ

Payment service lắng nghe:

- `payment.request` → xử lý thanh toán demo → publish `payment.result`

Trong demo, kết quả SUCCESS/FAILED có thể được quyết định theo logic đơn giản (xem service code).

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_payment`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

## Chạy service

```bash
docker compose -f docker-compose.dev.yml up -d payment-service
```

## Cập nhật README khi thay đổi

- Nếu bật/tắt REST endpoints hoặc đổi API: cập nhật mục **REST endpoints**.
- Nếu đổi routing keys/flow: cập nhật mục **RabbitMQ**.
- Nếu đổi JWT/DB/RabbitMQ config: cập nhật mục **ENV / Config**.
