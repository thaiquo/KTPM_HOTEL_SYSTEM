# QLKS / HotelSystem (Microservices)

Project quản lý khách sạn (QLKS) gồm:

- **Frontend**: React + TypeScript + Vite
- **Backend**: 6 microservice Spring Boot (AUTH, USER, ROOM, BOOKING, PAYMENT, NOTIFICATION)
- **Hạ tầng**: RabbitMQ + PostgreSQL riêng cho từng service + pgAdmin

Mục tiêu của README này là để người mới clone về chỉ cần đọc là:

1. hiểu kiến trúc tổng quan, 2) chạy được dev/prod nhanh, 3) biết port/API chính.

## 1) Cấu trúc thư mục

- [HotelSystem/](HotelSystem/) — Frontend (Vite) + Nginx config (production)
- [HotelSystem_Backend/](HotelSystem_Backend/) — 6 service Spring Boot
- [docker-compose.dev.yml](docker-compose.dev.yml) — Dev: hot reload (Vite + `mvn spring-boot:run`)
- [docker-compose.yml](docker-compose.yml) — Prod: build image (frontend Nginx + backend jar)

## 2) Services, ports, URL

### Dev mode (docker-compose.dev.yml)

Frontend chạy Vite dev server:

- UI: http://localhost:3000

Backend (expose ra host):

- AUTH: http://localhost:8081
- USER: http://localhost:8082
- ROOM: http://localhost:8083
- BOOKING: http://localhost:8084
- PAYMENT: http://localhost:8085
- NOTIFICATION: http://localhost:8086

Hạ tầng:

- RabbitMQ Management: http://localhost:15672 (user/pass trong compose)
- pgAdmin: http://localhost:5050

Credentials mặc định (dev compose):

- RabbitMQ: `thaiquoc` / `123456`
- pgAdmin: `admin@gmail.com` / `123456`
- Postgres (mỗi DB): user `postgres`, pass `quocthai`

PostgreSQL (mỗi service 1 DB, map port ra host):

- auth: `localhost:54321`
- user: `localhost:54322`
- room: `localhost:54323`
- booking: `localhost:54324`
- payment: `localhost:54325`
- notification: `localhost:54326`

### API Gateway path (trong Frontend)

Frontend gọi backend qua proxy path (để tránh CORS và unify endpoint):

- `/auth-api/*` → AUTH (8081)
- `/user-api/*` → USER (8082)
- `/room-api/*` → ROOM (8083)
- `/booking-api/*` → BOOKING (8084)
- `/payment-api/*` → PAYMENT (8085)
- `/notification-api/*` → NOTIFICATION (8086)

Dev proxy nằm ở [HotelSystem/vite.config.ts](HotelSystem/vite.config.ts)

Prod proxy (Nginx) nằm ở [HotelSystem/nginx.conf](HotelSystem/nginx.conf)

## 3) Chạy hệ thống

### Yêu cầu

- Windows: cài Docker Desktop và bật WSL2
- Docker Compose v2 (`docker compose ...`)

### Chạy DEV (khuyến nghị khi đang code)

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Xem log realtime:

```bash
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f booking-service
```

Restart 1 service khi vừa sửa code nhưng container chưa reload:

```bash
docker compose -f docker-compose.dev.yml restart booking-service
```

Tắt dev stack:

```bash
docker compose -f docker-compose.dev.yml down
```

Reset sạch toàn bộ DB volumes:

```bash
docker compose -f docker-compose.dev.yml down -v
```

### Chạy PROD (build image)

```bash
docker compose up -d --build
docker compose ps
```

Trong prod, frontend là Nginx (port 3000:80 theo compose) và Nginx reverse proxy về các backend.

## 4) Luồng nghiệp vụ chính (đặt phòng)

Luồng đặt phòng dùng RabbitMQ để phối hợp trạng thái phòng và thanh toán demo:

1. Client `POST /booking-api/bookings` → BOOKING lưu booking (PENDING) và publish `room.hold`
2. ROOM nhận `room.hold` → giữ phòng (AVAILABLE → HOLD) và publish `room.held`
3. BOOKING nhận `room.held` → publish `payment.request`
4. PAYMENT xử lý demo → publish `payment.result` (SUCCESS/FAILED)
5. BOOKING nhận `payment.result` → SUCCESS: CONFIRMED + publish `room.confirm` + `booking.confirmed`; FAILED: publish `room.release` + `booking.cancelled`
6. NOTIFICATION lắng nghe `booking.confirmed` và `payment.result` để lưu thông báo

RabbitMQ (topic) dùng chung:

- Exchange: `hotel.exchange`
- Routing keys chính: `room.hold`, `room.held`, `room.confirm`, `room.release`, `payment.request`, `payment.result`, `booking.confirmed`, `booking.cancelled`

## 5) README theo module

- Frontend: [HotelSystem/README.md](HotelSystem/README.md)
- AUTH service: [HotelSystem_Backend/HotelSystem_AUTH/README.md](HotelSystem_Backend/HotelSystem_AUTH/README.md)
- USER service: [HotelSystem_Backend/HotelSystem_USER/README.md](HotelSystem_Backend/HotelSystem_USER/README.md)
- ROOM service: [HotelSystem_Backend/HotelSystem_ROOM/README.md](HotelSystem_Backend/HotelSystem_ROOM/README.md)
- BOOKING service: [HotelSystem_Backend/HotelSystem_BOOKING/README.md](HotelSystem_Backend/HotelSystem_BOOKING/README.md)
- PAYMENT service: [HotelSystem_Backend/HotelSystem_PAYMENT/README.md](HotelSystem_Backend/HotelSystem_PAYMENT/README.md)
- NOTIFICATION service: [HotelSystem_Backend/HotelSystem_NOTIFICATION/README.md](HotelSystem_Backend/HotelSystem_NOTIFICATION/README.md)

## 6) Ghi chú nhanh / Troubleshoot

- Nếu `docker compose` báo không connect được daemon: mở Docker Desktop và đợi status "Running".
- Nếu API trả 404 qua proxy path: kiểm tra frontend/proxy đang chạy đúng compose (dev/prod) và container service tương ứng đang `Up`.
- Dev mode trên Windows đôi khi watch file bị lỗi I/O (Vite). Compose đã bật `CHOKIDAR_USEPOLLING=true` để giảm lỗi.
