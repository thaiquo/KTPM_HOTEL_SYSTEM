# 🔐 HotelSystem_AUTH (Authentication & Security Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring_Security-6.x-6DB33F?style=for-the-badge&logo=spring-security&logoColor=white)](https://spring.io/projects/spring-security)
[![JWT](https://img.shields.io/badge/JWT-Tokens-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)

Service **Xác thực và Bảo mật** (Authentication & Security) đóng vai trò lá chắn và bộ não kiểm soát quyền truy cập của toàn hệ thống. Service chịu trách nhiệm xử lý đăng nhập, quản lý cấp phát và kiểm tra thẻ JWT (Stateless Authentication), phân quyền dựa trên vai trò (RBAC), và bảo vệ an toàn thông tin mật khẩu.

---

## 🚀 Tính năng cốt lõi

1. **Xác thực Stateless qua mã JWT (JSON Web Tokens)**:
   - Phát hành cặp khóa **Access Token** (thời hạn ngắn, dùng để gọi API bảo mật) và **Refresh Token** (thời hạn dài, lưu trữ an toàn trong HttpOnly Cookie).
   - Cơ chế tự động làm mới mã (`Silent Refresh`) mà không ngắt quãng trải nghiệm của người dùng.
2. **Mã hóa bảo mật mật khẩu (Password Hashing)**:
   - Sử dụng thuật toán mã hóa mạnh mẽ **BCrypt** của Spring Security để băm mật khẩu trước khi lưu trữ vào cơ sở dữ liệu.
3. **Phân quyền dựa trên vai trò (Role-Based Access Control - RBAC)**:
   - Định nghĩa chặt chẽ 3 vai trò chính:
     - `ADMIN`: Quản lý tối cao, quản trị nhân sự, phòng và cấu hình giá ngày lễ.
     - `STAFF`: Nhân viên vận hành, thực hiện check-in/check-out phụ thu và thanh lý tiền mặt.
     - `USER`: Khách hàng mua sắm đặt phòng trực tuyến.
4. **Tích hợp Phát hiện Dịch vụ (Eureka Client)**:
   - Tự động đăng ký với Eureka dưới tên ứng dụng `auth-service` để Gateway định tuyến qua đường dẫn biên `/auth-api/**`.
5. **Giám sát Phân tích request (Brave/Zipkin)**:
   - Tích hợp Micrometer Tracing truyền thông tin ngữ cảnh Trace ID qua các request xác thực.

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8081`
- **Tên đăng ký Eureka**: `auth-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_auth` trên cổng `55421` (Dev container: `postgres-auth`)
- **Gateway Path**: `/auth-api/**`

---

## 📡 Danh sách REST API Endpoints (Gọi qua Gateway:8080)

Tất cả các API dưới đây đều nằm dưới prefix `/auth-api` khi gọi từ môi trường bên ngoài:

| Method | Endpoint | Yêu cầu JWT | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth-api/auth/login` | Không | Đăng nhập hệ thống bằng Email và Mật khẩu. Trả về JWT. |
| `POST` | `/auth-api/auth/register` | Không | Đăng ký tài khoản khách hàng mới. |
| `POST` | `/auth-api/auth/send-otp` | Không | Gửi mã OTP xác nhận tài khoản/quên mật khẩu qua email. |
| `POST` | `/auth-api/auth/verify-otp` | Không | Kiểm thử và xác thực mã OTP. |
| `POST` | `/auth-api/auth/refresh` | Không | Gửi Refresh Token lên để lấy Access Token mới (Silent Refresh). |
| `POST` | `/auth-api/auth/logout` | Có | Đăng xuất, hủy bỏ hiệu lực của token hiện tại. |
| `GET` | `/auth-api/auth/verify` | Có | Gateway gọi endpoint này để xác nhận tính toàn vẹn của JWT thô. |
