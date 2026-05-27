# 🚪 HotelSystem_GATEWAY (Spring Cloud API Gateway)

[![Spring Cloud](https://img.shields.io/badge/Spring_Cloud-Gateway-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud-gateway)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Redis](https://img.shields.io/badge/Redis-Rate_Limiter-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

Service **API Gateway** là cửa ngõ giao tiếp duy nhất (Unified Entry Point) cho toàn bộ hệ thống Web & Mobile. Gateway chịu trách nhiệm điều phối định tuyến (Routing), bảo mật biên (Security), cấu hình CORS tập trung, giới hạn băng thông chống DoS (Rate Limiting), và làm phong phú dữ liệu header hạ nguồn.

---

## 🚀 Tính năng cốt lõi

1. **Định tuyến động (Dynamic Routing)**:
   - Sử dụng cơ chế cân bằng tải tích hợp Eureka (`lb://`) để phân phối các request đến các microservices đang chạy dưới dạng container.
2. **Bộ lọc bảo mật JWT (`JwtAuthFilter`)**:
   - Tự động chặn và kiểm tra chữ ký token `Bearer JWT` ở mức biên trước khi chuyển tiếp yêu cầu.
   - Trích xuất thông tin người dùng từ JWT và bổ sung vào header để các microservices con đọc trực tiếp:
     - `X-User-Id` (ID người dùng)
     - `X-User-Role` (Vai trò: `ADMIN`, `STAFF`, `USER`)
     - `X-User-Email` (Email người dùng)
   - **Bỏ qua xác thực (JWT Bypass)** cho các endpoint công khai (Login, Register, Send OTP, VNPAY/MoMo Callbacks, và các phương thức đọc `GET` phòng trống).
   - **Bỏ qua xác thực cho WebSocket**: Cho phép các luồng nâng cấp kết nối WebSocket (`Upgrade: websocket`) vượt qua kiểm thử JWT để thiết lập kênh thông báo thời gian thực `/ws/payments`.
3. **Cấu hình CORS tập trung (WebFlux Standard)**:
   - Xử lý triệt để lỗi CORS của trình duyệt bằng cách cấu hình danh sách allowedOrigins cụ thể (`http://localhost:3000`), hỗ trợ đầy đủ các phương thức HTTP và cho phép đính kèm Cookies (`allowCredentials: true`).
4. **Giới hạn băng thông (Rate Limiter)**:
   - Sử dụng `RequestRateLimiter` kết hợp với Redis để kiểm soát tần suất request tối đa của từng Client dựa trên địa chỉ IP (`ipKeyResolver`).
   - Ngăn chặn triệt để tấn công từ chối dịch vụ (DoS) hoặc càn quét API (Web scraping).
5. **Giám sát Distributed Tracing**:
   - Tích hợp Micrometer Tracing và Zipkin để đánh dấu vết request (Span ID, Trace ID) đi qua Gateway sang các service sâu hơn.

---

## 🔌 Cấu hình kết nối

- **Cổng công khai**: `8080` (Mọi truy cập bên ngoài trỏ vào đây)
- **Tên đăng ký ứng dụng**: `api-gateway`
- **Địa chỉ Eureka Discovery**: `http://localhost:8761/eureka/`
- **Cấu hình Redis kết nối**: Port `6379` (Dev container: `redis`)

---

## 📡 Chi tiết các Route định tuyến

Tất cả các endpoint gửi từ Frontend Web/Mobile bắt buộc có tiền tố tương ứng để Gateway điều phối chính xác và loại bỏ tiền tố trước khi gửi đến Service con:

| Cổng định tuyến | Đích đến (Eureka Service ID) | Tiền tố Gateway | Ví dụ viết lại đường dẫn (Rewrite Path) |
| :--- | :--- | :--- | :--- |
| **AUTH** | `auth-service` | `/auth-api/**` | `/auth-api/auth/login` ➔ `/auth/login` |
| **USER** | `user-service` | `/user-api/**` | `/user-api/users/me` ➔ `/users/me` |
| **ROOM** | `room-service` | `/room-api/**` | `/room-api/rooms/available` ➔ `/rooms/available` |
| **BOOKING** | `booking-service`| `/booking-api/**` | `/booking-api/bookings` ➔ `/bookings` |
| **PAYMENT** | `payment-service`| `/payment-api/**` | `/payment-api/payments/vnpay/create` ➔ `/payments/vnpay/create` |
| **NOTIF** | `notification-service` | `/notification-api/**`| `/notification-api/notifications` ➔ `/notifications` |

---

## 🛡️ Cấu hình Giới hạn băng thông (Rate Limiting)

Thiết lập trong tệp `application.yml` cho từng Route:
```yaml
filters:
  - name: RequestRateLimiter
    args:
      redis-rate-limiter.replenishRate: 20      # Tốc độ nạp lại: 20 token/giây
      redis-rate-limiter.burstCapacity: 40      # Dung lượng tối đa: 40 token
      redis-rate-limiter.requestedTokens: 1
      key-resolver: "#{@ipKeyResolver}"        # Phân loại theo địa chỉ IP của Client
```
