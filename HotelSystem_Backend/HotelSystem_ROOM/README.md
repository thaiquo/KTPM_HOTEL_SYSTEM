# HotelSystem_ROOM (Room Service)

Service **quản lý phòng** + xử lý trạng thái phòng qua RabbitMQ (AVAILABLE/HOLD/BOOKED).

## Port

- `8083`

## Base path

- `/rooms`

## REST endpoints

- `GET /rooms` — list tất cả phòng
- `GET /rooms/{id}` — lấy phòng theo id
- `GET /rooms/available` — list phòng AVAILABLE
- `POST /rooms` — tạo phòng
- `PUT /rooms/{id}/status?status=AVAILABLE|HOLD|BOOKED` — cập nhật trạng thái

## RabbitMQ

Room service lắng nghe các routing keys để đổi trạng thái phòng:

- `room.hold` → giữ phòng (AVAILABLE → HOLD) và publish `room.held`
- `room.confirm` → xác nhận phòng (HOLD → BOOKED)
- `room.release` → trả phòng về AVAILABLE

Exchange/queue cụ thể nằm trong phần config RabbitMQ của service.

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_room`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

Room HOLD TTL (để tránh giữ phòng quá lâu khi nhiều người đặt cùng lúc):

- `ROOM_HOLD_TTL_SECONDS` (default 6 phút)
- `ROOM_HOLD_SWEEP_MS` (default 30s) — interval job tự release HOLD quá hạn

## Chạy service

```bash
docker compose -f docker-compose.dev.yml up -d room-service
```

## Cập nhật README khi thay đổi

- Nếu đổi endpoint/payload/response: cập nhật mục **REST endpoints**.
- Nếu đổi ENV/Redis cache/rate limit: cập nhật mục **ENV / Config**.
