# HotelSystem Frontend (React + Vite + TypeScript)

Frontend của hệ thống quản lý khách sạn (QLKS). Được xây dựng bằng React, Vite, Tailwind CSS, và TypeScript.

## 1) Chạy nhanh bằng Docker (khuyến nghị)

Chạy full stack (frontend + 6 backend + RabbitMQ + Postgres) ở thư mục root (bên ngoài thư mục này):

```bash
docker compose -f docker-compose.dev.yml up -d
```

Mở UI:

- http://localhost:3000

Frontend trong dev mode dùng Vite dev server và được cấu hình proxy tự động trỏ về các API backend.

## 2) Chạy frontend standalone (không dùng Docker)

```bash
cd HotelSystem
npm install
npm run dev -- --host
```

Mặc định Vite chạy ở `http://localhost:5173` (để tránh xung đột port 3000 của Docker nếu đang chạy).
Nếu bạn muốn đổi port, có thể dùng:

```bash
VITE_PORT=3001 npm run dev -- --host
```

_Lưu ý: Nếu không dùng Docker thì backend cần chạy từ port 8081..8086 hoặc bạn cần cấu hình lại các biến môi trường trỏ tới backend._

## 3) Cấu trúc gọi API

Frontend gọi API qua các proxy endpoints sau (giải quyết triệt để lỗi CORS):

- `/auth-api/*`
- `/user-api/*`
- `/room-api/*`
- `/booking-api/*`
- `/payment-api/*`
- `/notification-api/*`

Cấu hình Dev proxy nằm ở `vite.config.ts`.
Cấu hình Prod proxy nằm ở `nginx.conf`.

## 4) Auth Token

Hệ thống lưu trữ token tại `localStorage`:

- `accessToken`
- `refreshToken`

Axios Interceptor (`src/services/api.ts`) sẽ tự động lấy token và gửi lên server. Đồng thời, interceptor cũng xử lý luôn tính năng "tự động refresh token" khi nhận về lỗi 401 Unauthorized, giúp tạo trải nghiệm đăng nhập không đứt quãng.

## 5) Build Production

Build cho môi trường Production được đóng gói cùng **Nginx**:

- Xem `Dockerfile` để biết chi tiết stage build bằng Node.js và stage run bằng Nginx.
- Nginx sẽ host các file tĩnh và config thêm tính năng reverse-proxy cho API theo cấu hình trong file `nginx.conf`.
