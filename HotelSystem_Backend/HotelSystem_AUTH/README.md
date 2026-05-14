# 🔐 HotelSystem_AUTH (Authentication Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring_Security-6.x-6DB33F?style=for-the-badge&logo=spring-security&logoColor=white)](https://spring.io/projects/spring-security)
[![JWT](https://img.shields.io/badge/JWT-Tokens-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)

Service **xác thực và bảo mật**. Quản lý đăng nhập, cấp phát JWT và kiểm soát quyền truy cập (RBAC).

## 🚀 Tính năng chính
- Đăng nhập (Login) & Đăng xuất (Logout).
- Cấp phát Access Token và Refresh Token.
- Tự động làm mới Token (Silent Refresh).
- Mã hóa mật khẩu với BCrypt.
- Xác thực Stateless thông qua JWT.

## 🔌 Cấu hình kết nối
- **Internal Port**: `8081`
- **Service ID**: `auth-service` (Đăng ký với Eureka)
- **Gateway Path**: `/auth-api/**`
- **Tracing**: Brave/Zipkin enabled

## 📡 REST API Endpoints (Truy cập qua Gateway:8080)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth-api/auth/login` | Đăng nhập hệ thống |
| `POST` | `/auth-api/auth/refresh` | Làm mới token |
| `POST` | `/auth-api/auth/logout` | Đăng xuất |
| `GET` | `/auth-api/auth/verify` | Kiểm tra token hợp lệ |
