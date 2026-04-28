# HotelSystem_USER (User Service)

Service **quản lý thông tin hồ sơ người dùng**, lịch sử hoạt động, lấy danh sách khách hàng.

## Port

- `8082`

## Base path

- `/users`

## Mối quan hệ

- Giao tiếp bảo mật với `HotelSystem_AUTH` để tạo User mới sau khi Authentication cung cấp Identity id.
- Liên kết với PostgreSQL database (dễ dàng chia sẻ cơ sở dữ liệu chung hoặc kết nối JDBC qua `.env`).

## API endpoints chính

- `GET /users/profile` — Lấy thông tin cá nhân hiện tại từ Token.
- `GET /users/{id}` — Lấy công khai User từ id khách/người dùng.
- `GET /users` — Admin endpoints: Phân trang/liệt kê danh sách users nền tảng.
- `PUT /users/profile` — Sửa, cập nhật tên hoặc avatar...

## Cấu hình chạy và Môi trường (.properties)

Xác định biến ở root (`.env` trên dev):

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (mặc định trỏ đến PostgeSQL: `jdbc:postgresql://localhost:5432/hotel_auth` hoặc database độc lập của User).
- Thiết lập JWT Secrets trùng khớp hệ thống.

## Lệnh Start

Sử dụng Docker compose cho đồng bộ hạ tầng:

```bash
docker compose -f docker-compose.dev.yml up -d user-service
```
