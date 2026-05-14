# 🚪 HotelSystem_GATEWAY (API Gateway)

[![Spring Cloud](https://img.shields.io/badge/Spring_Cloud-2025.x-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud-gateway)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)

Service **cửa ngõ duy nhất** của hệ thống. Quản lý định tuyến (Routing), bảo mật (Security), giới hạn băng thông (Rate Limiting) và xử lý CORS.

## 🚀 Tính năng chính
- **Unified Entry Point**: Tập trung tất cả các yêu cầu từ Frontend về port 8080.
- **Dynamic Routing**: Định tuyến yêu cầu đến các microservices thông qua Eureka Service Discovery.
- **JWT Authentication Filter**: Kiểm tra và xác thực token trước khi chuyển tiếp yêu cầu đến các service con.
- **Rate Limiting**: Sử dụng Redis để giới hạn tần suất request theo IP (tránh tấn công DoS).
- **CORS Handling**: Cấu hình tập trung cho toàn bộ hệ thống Web/Mobile.
- **Distributed Tracing**: Tích hợp Zipkin để theo dõi luồng request.

## 🔌 Cấu hình kết nối
- **Port**: `8080` (Công khai cho Frontend)
- **Service ID**: `api-gateway`
- **Eureka Server**: `http://localhost:8761/eureka/`

## 📡 Các Route chính

| Path Prefix | Target Service | Rewrite Rule |
| :--- | :--- | :--- |
| `/auth-api/**` | `auth-service` | `/auth-api/login` → `/login` |
| `/user-api/**` | `user-service` | `/user-api/me` → `/me` |
| `/room-api/**` | `room-service` | `/room-api/rooms` → `/rooms` |
| `/booking-api/**` | `booking-service` | `/booking-api/create` → `/create` |
| `/payment-api/**` | `payment-service` | `/payment-api/vnpay` → `/vnpay` |

## 🛠️ Cấu hình Rate Limiter (Redis)
Service sử dụng `RequestRateLimiter` của Spring Cloud Gateway kết hợp với Redis:
- **Replenish Rate**: 30-50 tokens/sec (tùy service).
- **Burst Capacity**: Gấp đôi Replenish Rate.
- **Key Resolver**: Theo địa chỉ IP của Client.
