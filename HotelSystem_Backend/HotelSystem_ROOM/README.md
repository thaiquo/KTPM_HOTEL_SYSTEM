# 🏨 HotelSystem_ROOM (Room Inventory & Status Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Redis](https://img.shields.io/badge/Redis-Caching-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

Service **Quản lý Hạng phòng & Trạng thái phòng** (Room Inventory & Status) đóng vai trò quản lý kho tài nguyên của khách sạn. Service xử lý mọi nghiệp vụ liên quan đến việc tìm kiếm phòng trống theo thời gian, kiểm soát vòng đời trạng thái của phòng, lưu trữ hình ảnh vật lý, và đồng bộ bất đồng bộ với hệ thống đặt phòng (`booking-service`).

---

## 🚀 Tính năng cốt lõi

1. **Quản lý danh mục hạng phòng (Room Types & S3 Integration)**:
   - Quản lý thông tin chi tiết các hạng phòng (Standard, Deluxe, Suite, Family).
   - Tích hợp **AWS S3** để lưu trữ và phân phối hình ảnh chất lượng cao của từng hạng phòng.
2. **Quản lý trạng thái phòng động (Room Lifecycle)**:
   - Định nghĩa chặt chẽ 4 trạng thái phòng:
     - `AVAILABLE`: Phòng trống, sẵn sàng cho thuê.
     - `HELD`: Phòng đang được giữ chỗ tạm thời (khi khách đang thực hiện thanh toán).
     - `OCCUPIED`: Phòng đã có khách check-in đang lưu trú.
     - `CLEANING`: Phòng đang được dọn dẹp sau khi check-out, chưa thể đặt tiếp.
3. **Đồng bộ trạng thái bất đồng bộ qua RabbitMQ**:
   - Lắng nghe sự kiện `room.hold`: Chuyển trạng thái phòng sang `HELD` trong 11 phút.
   - Lắng nghe sự kiện `room.release`: Giải phóng phòng về `AVAILABLE` nếu khách hủy hoặc hết hạn 11 phút chưa thanh toán.
   - Lắng nghe sự kiện `room.confirm`: Chuyển phòng sang trạng thái đã đặt chắc chắn.
4. **Tối ưu hóa hiệu năng bằng Redis Caching**:
   - Tích hợp bộ nhớ đệm **Redis Cache** để lưu trữ danh sách phòng trống và thông tin hạng phòng, giảm thiểu tối đa các truy vấn trực tiếp vào PostgreSQL để tăng tốc độ phản hồi trang chủ khách hàng.
5. **Cấu hình Seeding dữ liệu (Data Seeding)**:
   - Hỗ trợ seeder dữ liệu phòng và hạng phòng tự động khi khởi động nếu bật biến môi trường `SEED_ENABLED=true` (chỉ chạy lần đầu, sau đó chuyển sang `false` để tránh trùng lặp).

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8083`
- **Tên đăng ký Eureka**: `room-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_room` trên cổng `55423` (Dev container: `postgres-room`)
- **Bộ nhớ đệm**: Redis chạy trên cổng `6379` (Dev container: `redis`)
- **Hàng đợi tin nhắn**: RabbitMQ (Dev container: `rabbitmq`)
- **Gateway Path**: `/room-api/**`

---

## 📡 Danh sách REST API Endpoints (Gọi qua Gateway:8080)

Mọi yêu cầu API từ client được định tuyến tập trung qua tiền tố `/room-api`:

| Method | Endpoint | Yêu cầu JWT | Quyền hạn truy cập | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/room-api/rooms/available` | Không | Công khai | Tìm kiếm phòng trống theo khoảng thời gian Check-in & Check-out. |
| `GET` | `/room-api/room-types` | Không | Công khai | Lấy danh sách thông tin chi tiết các hạng phòng (Giá, Tiện ích, Ảnh). |
| `GET` | `/room-api/rooms/{id}` | Không | Công khai | Lấy chi tiết thông tin và trạng thái của một phòng cụ thể. |
| `PUT` | `/room-api/rooms/{id}/status` | Có | `STAFF`, `ADMIN` | Nhân viên cập nhật trạng thái phòng thủ công (ví dụ: chuyển từ `CLEANING` sang `AVAILABLE`). |
| `POST` | `/room-api/room-types` | Có | `ADMIN` | Quản trị viên thêm hạng phòng mới và tải ảnh lên S3. |
| `POST` | `/room-api/rooms` | Có | `ADMIN` | Quản trị viên tạo phòng mới gán vào hạng phòng có sẵn. |
