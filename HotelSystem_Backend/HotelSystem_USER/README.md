# HotelSystem_USER (User Service)

Service **quản lý hồ sơ người dùng** (profile).

## Port

- `8082`

## Base path

- `/users`

## Endpoints

- `GET /users/me` — lấy profile hiện tại
- `PUT /users/me` — cập nhật profile hiện tại
- `POST /users` — tạo profile

## Auth

- Các endpoint thường yêu cầu header: `Authorization: Bearer <accessToken>`

## ENV / Config

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/hotel_user`)
- `DB_USERNAME` / `DB_PASSWORD`
- `RABBIT_HOST` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `jwt.secret` / `jwt.expiration`

## Chạy service

```bash
docker compose -f docker-compose.dev.yml up -d user-service
```

## Test nhanh (curl)

```bash
curl http://localhost:8082/users/me \
  -H "Authorization: Bearer <access-token>"
```
