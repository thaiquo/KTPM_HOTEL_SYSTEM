# 👤 HotelSystem_USER (User Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Service **quản lý người dùng**. Lưu trữ và quản lý thông tin hồ sơ, phân quyền và lịch sử hoạt động.

## 🚀 Tính năng chính
- Quản lý thông tin hồ sơ (Profile Management).
- Đăng ký tài khoản mới (Registration).
- Phân quyền người dùng (Role Management: ADMIN, STAFF, USER).
- Quản lý thông tin khách hàng cho mục đích Check-in.

## 🔌 Cấu hình kết nối
- **Port**: `8082`
- **Base Path**: `/users`

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/me` | Lấy thông tin cá nhân |
| `PUT` | `/users/profile` | Cập nhật hồ sơ |
| `GET` | `/users/{id}` | Lấy thông tin user theo ID (Staff/Admin) |
| `POST` | `/users` | Tạo user mới |
