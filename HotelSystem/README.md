# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

````js
export default defineConfig([
  # HotelSystem Frontend (React + Vite)

  Frontend của hệ thống QLKS.

  ## 1) Chạy nhanh bằng Docker (khuyến nghị)

  Chạy full stack (frontend + 6 backend + RabbitMQ + Postgres) ở thư mục root:

  ```bash
  docker compose -f docker-compose.dev.yml up -d
````

Mở UI:

- http://localhost:3000

Frontend trong dev mode dùng Vite dev server và proxy API về các service backend.

## 2) Chạy frontend standalone (không dùng Docker)

```bash
cd HotelSystem
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Lưu ý: nếu không dùng Docker thì backend cần chạy sẵn trên máy (8081..8086) hoặc bạn cấu hình biến môi trường.

## 3) API base paths

Trong code, frontend gọi API theo các base path dưới đây (được proxy bởi Vite hoặc Nginx):

- `/auth-api/*`
- `/user-api/*`
- `/room-api/*`
- `/booking-api/*`
- `/payment-api/*`
- `/notification-api/*`

Dev proxy cấu hình ở [vite.config.ts](vite.config.ts)

## 4) Cấu hình ENV (tuỳ chọn)

Frontend đọc các biến môi trường sau (nếu không set sẽ dùng các path `/xxx-api`):

- `VITE_AUTH_API_URL`
- `VITE_USER_API_URL`
- `VITE_ROOM_API_URL`
- `VITE_BOOKING_API_URL`
- `VITE_PAYMENT_API_URL`
- `VITE_NOTIFICATION_API_URL`

Trong Docker dev stack, compose đã set `VITE_DOCKER=true` để Vite proxy trỏ vào tên service trong Docker network.

## 5) Auth tokens

Frontend lưu token trong `localStorage`:

- `accessToken`
- `refreshToken`

Axios interceptor tự gắn `Authorization: Bearer <accessToken>` và tự refresh khi bị 401 (xem [src/services/api.ts](src/services/api.ts)).

## 6) Production build

Production build được đóng gói bằng Nginx theo [Dockerfile](Dockerfile) và reverse proxy theo [nginx.conf](nginx.conf).
