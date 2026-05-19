# 👤 HotelSystem_USER (User Profile & Account Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Service **Quản lý Hồ sơ & Tài khoản người dùng** (User Profile & Account) đảm nhiệm lưu trữ, truy vấn, và cập nhật thông tin cá nhân của Khách hàng, Nhân viên, và Quản trị viên. 

---

## 🚀 Tính năng cốt lõi

1. **Quản lý thông tin hồ sơ (Profile Management)**:
   - Lưu trữ chi tiết thông tin cá nhân của người dùng bao gồm: Họ tên, Email, Số điện thoại, Số căn cước công dân (CCCD/CMND - cực kỳ quan trọng cho quy trình khai báo lưu trú khi check-in).
2. **Tách riêng Cơ sở dữ liệu (Database Isolation)**:
   - Dữ liệu người dùng được lưu trữ riêng biệt tại database `hotel_user` chạy trên cổng độc lập `55422`, loại bỏ hoàn toàn việc dùng chung DB với `auth-service` để tuân thủ kiến trúc Microservices chuẩn.
3. **Phân quyền và Vai trò (Role Management)**:
   - Hỗ trợ lưu giữ thông tin định danh phân quyền (`ADMIN`, `STAFF`, `USER`) để chuyển tiếp dữ liệu phân quyền lên Gateway đóng gói header.
4. **Tích hợp Eureka & Gateway**:
   - Tự động đăng ký với Eureka dưới tên ứng dụng `user-service` để Gateway định tuyến qua tiền tố `/user-api/**`.
5. **Đồng bộ hóa dữ liệu Khách hàng**:
   - Hỗ trợ API để `booking-service` và nhân viên tại quầy tra cứu nhanh hồ sơ khách hàng dựa trên CCCD hoặc Email để tiến hành làm thủ tục nhận phòng (Check-in).

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8082`
- **Tên đăng ký Eureka**: `user-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_user` trên cổng `55422` (Dev container: `postgres-user`)
- **Gateway Path**: `/user-api/**`

---

## 📡 Danh sách REST API Endpoints (Gọi qua Gateway:8080)

Mọi yêu cầu API từ client được Gateway định tuyến qua tiền tố `/user-api`:

| Method | Endpoint | Yêu cầu JWT | Quyền hạn truy cập | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/user-api/users/me` | Có | Mọi Role | Khách hàng/Nhân viên lấy chi tiết hồ sơ cá nhân của mình. |
| `PUT` | `/user-api/users/profile` | Có | Mọi Role | Cập nhật thông tin cá nhân (Số điện thoại, CCCD, Họ tên). |
| `GET` | `/user-api/users/{id}` | Có | `STAFF`, `ADMIN` | Nhân viên tra cứu hồ sơ khách hàng theo mã ID định danh. |
| `GET` | `/user-api/users/search` | Có | `STAFF`, `ADMIN` | Tra cứu nhanh tài khoản theo Số điện thoại hoặc Số CCCD. |
| `POST` | `/user-api/users` | Có | `ADMIN` | Quản trị viên khởi tạo tài khoản nhân viên mới (`STAFF`). |
