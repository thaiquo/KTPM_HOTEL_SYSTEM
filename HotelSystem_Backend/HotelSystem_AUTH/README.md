# HotelSystem_AUTH (Auth Service)

Service **xác thực**: đăng ký, đăng nhập, refresh token.

## Port

- `8081` (theo `server.port`)

## Base path

- `/auth`

## Endpoints

- `POST /auth/register` — đăng ký user
- `POST /auth/login` — đăng nhập, trả về access/refresh token
- `POST /auth/refresh` — refresh access token bằng refresh token

## ENV / Config

Các biến môi trường được đọc trong `application.properties`:

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_auth`)
- `DB_USERNAME` (default: `postgres`)
- `DB_PASSWORD` (default: `quocthai`)
- `RABBIT_HOST` (default: `localhost`)
- `RABBIT_USERNAME` / `RABBIT_PASSWORD`

JWT:

- `jwt.secret`
- `jwt.expiration`
- `jwt.refresh-expiration`

## Chạy service

Khuyến nghị chạy bằng Docker Compose ở thư mục root:

```bash
docker compose -f docker-compose.dev.yml up -d auth-service
```

Xem log:

```bash
docker compose -f docker-compose.dev.yml logs -f auth-service
```

## Test nhanh (curl)

```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@gmail.com","password":"123456","role":"CUSTOMER"}'

curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@gmail.com","password":"123456"}'

curl -X POST http://localhost:8081/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```
