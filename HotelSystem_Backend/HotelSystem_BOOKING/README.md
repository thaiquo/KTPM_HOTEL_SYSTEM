# 📑 HotelSystem_BOOKING (Booking & Business Rules Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Feign Client](https://img.shields.io/badge/OpenFeign-REST_Communication-blue?style=for-the-badge)](https://spring.io/projects/spring-cloud-openfeign)

Service **Tạo & Quản lý Đặt phòng** (Booking & Business Rules) là trái tim nghiệp vụ của toàn bộ hệ thống. Service chịu trách nhiệm điều phối vòng đời của đơn đặt phòng, tự động hóa việc tính toán giá cả dựa trên hệ thống quy tắc khách sạn Việt Nam phức tạp, xử lý thủ tục Check-in/Check-out của nhân viên, và phối hợp bất đồng bộ hoặc đồng bộ với các dịch vụ khác qua RabbitMQ và OpenFeign.

---

## 🚀 Tính năng & Quy tắc nghiệp vụ cốt lõi

Tất cả các business rules được quản lý tập trung tại `BookingConstants.java` để dễ dàng bảo trì:

### 1. Phân loại Ngày thường vs Ngày lễ (Holiday Pricing)
* **Ngày lễ**: Tết Nguyên Đán (28/12 - 05/01 Âm lịch), Giỗ Tổ Hùng Vương (10/03 Âm lịch), 01/01, 30/04, 01/05, 02/09.
  * Tự động áp dụng thuật toán chuyển đổi âm lịch sang dương lịch độ chính xác cao (`HolidayService`).
  * **Hệ số nhân giá**: **1.3x** giá phòng tiêu chuẩn.
  * **Tỷ lệ đặt cọc**: Bắt buộc cọc tối thiểu **50%**.
  * **Số đêm tối thiểu**: **2 đêm**.
  * **Hủy phòng miễn phí**: Trước **72 giờ** so với giờ Check-in (14:00).
* **Ngày thường**:
  * **Hệ số nhân giá**: **1.0x**.
  * **Tỷ lệ đặt cọc**: Cọc tối thiểu **30%**.
  * **Số đêm tối thiểu**: **1 đêm**.
  * **Hủy phòng miễn phí**: Trước **24 giờ** so với giờ Check-in (14:00).

### 2. Các gói giá đặt phòng (Rate Plans)
* **Gói Linh hoạt (Flexible)**: Yêu cầu cọc **50%**, giảm giá **0%**, cho phép hủy và hoàn tiền trước 24h, được phép thay đổi thông tin.
* **Gói Không hoàn lại (Non-Refundable)**: Yêu cầu thanh toán **100%** ngay lập tức, được giảm giá trực tiếp **10%** tiền phòng, không hỗ trợ hoàn tiền khi hủy, không được thay đổi thông tin.

### 3. Phụ thu Check-in sớm & Check-out trễ (Staff Dashboard)
* **Check-in sớm**:
  * Nhận phòng **trước 07:00**: Tính thêm **100%** giá 1 đêm phòng.
  * Nhận phòng **từ 07:00 đến 12:00**: Tính thêm **50%** giá 1 đêm phòng.
  * Nhận phòng **từ 12:00 đến 14:00**: **Miễn phí** phụ thu sớm.
* **Check-out trễ**:
  * Trễ **dưới 30 phút**: **Miễn phí**.
  * Trễ **từ 12:00 đến 14:00**: Phụ thu **20%** giá 1 đêm phòng.
  * Trễ **từ 14:00 đến 18:00**: Phụ thu **50%** giá 1 đêm phòng.
  * Trễ **sau 18:00**: Phụ thu **100%** giá 1 đêm phòng.

### 4. Quy định Rời phòng sớm (Early Check-out Policy)
* Khi khách muốn rút ngắn thời gian lưu trú (trả phòng sớm hơn dự kiến):
  * Số đêm tối thiểu bị tính phí: **2 đêm**.
  * Tỷ lệ hoàn trả: Hoàn lại **80%** tiền phòng của các đêm không sử dụng còn lại (sau khi trừ đi số đêm tối thiểu).

### 5. Quản lý Hoàn tiền chuyên nghiệp (Refund Service & SLA)
* Hỗ trợ quy trình hoàn tiền bất đồng bộ khi khách hủy phòng hợp lệ:
  * **Hạn định SLA**: **48 giờ** (`REFUND_SLA_HOURS`).
  * Cơ chế tự động phân bổ công việc công bằng cho nhân viên xử lý hoàn tiền (`RefundAssignmentService`), giới hạn tối đa 5 tác vụ hoạt động cùng lúc trên một nhân viên để tránh quá tải.
  * Bộ giám sát thời gian thực `RefundSLAWatcher` quét định kỳ để cảnh báo trễ hạn SLA.
  * Lưu trữ vết kiểm toán minh bạch (`RefundAuditService`).

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8084`
- **Tên đăng ký Eureka**: `booking-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_booking` trên cổng `55424` (Dev container: `postgres-booking`)
- **Giao tiếp liên service**: Sử dụng **OpenFeign Clients** thay thế hoàn toàn cho RestTemplate cũ để kết nối an toàn với `payment-service` và `room-service`.
- **Gateway Path**: `/booking-api/**`

---

## 📡 Danh sách REST API Endpoints (Gọi qua Gateway:8080)

Tất cả các endpoint gửi từ Client qua Gateway có tiền tố `/booking-api`:

| Method | Endpoint | Yêu cầu JWT | Quyền hạn | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/booking-api/bookings` | Có | `USER` | Khách hàng khởi tạo đặt phòng mới (PENDING_PAYMENT). |
| `POST` | `/booking-api/bookings/pricing` | Không | Công khai | Xem trước (Preview) tính toán giá phòng tổng cộng (bao gồm ngày lễ). |
| `GET` | `/booking-api/bookings/{id}` | Có | Mọi Role | Lấy thông tin chi tiết một booking. |
| `GET` | `/booking-api/bookings/user/{userId}`| Có | Mọi Role | Lấy danh sách lịch sử đặt phòng của một người dùng. |
| `POST` | `/booking-api/bookings/{id}/check-in` | Có | `STAFF`, `ADMIN` | Nhân viên thực hiện check-in cho khách (chỉ khi đã thanh toán đủ). |
| `POST` | `/booking-api/bookings/{id}/check-out`| Có | `STAFF`, `ADMIN` | Nhân viên thực hiện check-out, tính toán phụ thu trễ/sớm tự động. |
| `POST` | `/booking-api/bookings/{id}/cancel` | Có | Mọi Role | Khách hàng hoặc nhân viên thực hiện hủy đặt phòng. |

---

## 🔄 Trạng thái Đặt phòng (Booking Status Lifecycle)

Mỗi đơn đặt phòng trải qua các trạng thái sau:
1. `PENDING_PAYMENT`: Vừa được khởi tạo, giữ chỗ phòng trong 11 phút để đợi thanh toán từ cổng VNPAY/MoMo.
2. `CONFIRMED` hoặc `DEPOSIT_PAID`: Đã thanh toán thành công (đầy đủ hoặc cọc 30%/50%). Phòng được khóa chắc chắn.
3. `CHECKED_IN`: Khách đã hoàn tất thủ tục nhận phòng vật lý tại quầy (và đã hoàn tất thanh toán phần còn lại nếu trước đó chỉ cọc).
4. `CHECKED_OUT`: Khách đã trả phòng, thanh lý toàn bộ phụ thu (nếu có).
5. `CANCELLED`: Giao dịch bị hủy (quá hạn 11 phút không trả tiền, hoặc chủ động hủy).

---

## ⚙️ Hàng đợi Tin nhắn RabbitMQ định tuyến

- **Sự kiện xuất bản (Publish)**:
  - `room.hold`: Phát đi khi tạo booking mới để khóa phòng tạm thời.
  - `room.release`: Phát đi khi hủy đơn hoặc hết hạn thanh toán để trả phòng về trạng thái trống.
  - `room.confirm`: Phát đi khi thanh toán thành công để khóa phòng cứng.
  - `notification.booking.queue`: Gửi yêu cầu đẩy thông báo Email xác nhận/hủy phòng.
- **Sự kiện lắng nghe (Subscribe)**:
  - Lắng nghe kết quả thanh toán từ `payment-service` để cập nhật trạng thái đơn đặt phòng sang `CONFIRMED` hoặc `DEPOSIT_PAID` ngay lập tức.
