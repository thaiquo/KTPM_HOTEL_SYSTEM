# 💳 HotelSystem_PAYMENT (Payment Gateway Service)

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![VNPAY](https://img.shields.io/badge/Payment-VNPAY-003399?style=for-the-badge)](https://sandbox.vnpayment.vn/)
[![MoMo](https://img.shields.io/badge/Payment-MoMo-A50064?style=for-the-badge)](https://developers.momo.vn/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Enabled-brightgreen?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message_Broker-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

Service **Cổng Thanh toán** (Payment Gateway) chịu trách nhiệm tích hợp và kiểm soát tất cả các giao dịch thanh toán trực tuyến của hệ thống qua cổng **VNPAY Sandbox** và **MoMo Sandbox**. Service hỗ trợ cả thanh toán tại quầy (tiền mặt/chuyển khoản), quản lý hoàn tiền tự động (Refund APIs), và đồng bộ hóa tức thì kết quả giao dịch tới Web/Mobile qua WebSocket thời gian thực.

---

## 🚀 Tính năng nổi bật

1. **Tích hợp Cổng thanh toán Quốc gia VNPAY**:
   - Sinh link thanh toán động tương thích Web & Mobile dựa trên mã hóa chữ ký số HmacSHA512 để chống giả mạo giao dịch.
   - Xử lý hai kênh phản hồi:
     - **VNPAY Return**: Nhận điều hướng trực quan của người dùng trên trình duyệt để đưa về trang kết quả Frontend.
     - **VNPAY IPN (Instant Payment Notification)**: Nhận phản hồi ngầm server-to-server để cập nhật trạng thái cơ sở dữ liệu và kích hoạt RabbitMQ thông báo ngay cả khi khách đóng trình duyệt đột ngột.
2. **Tích hợp Cổng thanh toán MoMo (Napas/ATM flow)**:
   - Sinh luồng MoMo ATM (`payWithATM`) cho phép khách hàng thanh toán trực tiếp bằng thẻ Napas kiểm thử, đồng bộ hóa các luồng IPN và Return tương tự VNPAY.
3. **Thanh toán thời gian thực qua WebSocket**:
   - Khởi chạy WebSocket Server tại đường dẫn `/ws/payments`.
   - Khi có kết quả thanh toán từ VNPAY/MoMo IPN, server sẽ phát đi thông điệp `payment:success` tới tất cả các Web Client và Mobile App đang kết nối để tự động chuyển hướng màn hình, tăng cường độ mượt mà cho trải nghiệm người dùng.
4. **Idempotency (Chống trùng lặp giao dịch)**:
   - Áp dụng cơ chế khóa Idempotency Key (`payment:bookingId:amount`) để chặn đứng hiện tượng Double-payment (khách bấm thanh toán 2 lần hoặc IPN bắn về nhiều lần gây trùng lặp hóa đơn).
5. **Ghi nhận thanh toán tại quầy & Hoàn tiền (Refund)**:
   - API cho phép nhân viên khách sạn xác nhận thanh toán ngoại tuyến (Offline Confirm) bằng tiền mặt thông qua Web Dashboard hoặc quét mã QR qua Mobile App.
   - Hỗ trợ API xử lý hoàn tiền tự động hoàn trả ngân quỹ qua cổng kiểm thử VNPAY.

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8085`
- **Tên đăng ký Eureka**: `payment-service`
- **Cơ sở dữ liệu**: PostgreSQL riêng biệt `hotel_payment` trên cổng `55425` (Dev container: `postgres-payment`)
- **Đường dẫn WebSocket Server**: `ws://localhost:8080/payment-api/ws/payments` (Đi qua Gateway)
- **Gateway Path**: `/payment-api/**`

---

## 📡 Danh sách REST API Endpoints (Gọi qua Gateway:8080)

| Method | Endpoint | Yêu cầu JWT | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :--- |
| `POST` | `/payment-api/payments/vnpay/create` | Có | Sinh link URL thanh toán VNPAY SandBox (hỗ trợ loại `DEPOSIT`, `FULL`, `REMAINING`). |
| `POST` | `/payment-api/payments/momo/create` | Có | Sinh link URL thanh toán MoMo SandBox (hỗ trợ loại `DEPOSIT`, `FULL`, `REMAINING`). |
| `GET` | `/payment-api/payments/vnpay-return` | Không | Điểm nhận điều hướng của người dùng sau khi thanh toán xong từ VNPAY. |
| `GET` | `/payment-api/payments/vnpay-ipn` | Không | Điểm nhận phản hồi ngầm đáng tin cậy từ máy chủ VNPAY gửi về. |
| `GET` | `/payment-api/payments/checkin-qr` | Không | Tra cứu nhanh thông tin hóa đơn khi quét QR (dành cho Mobile App). |
| `POST` | `/payment-api/payments/{code}/confirm` | Không | Xác nhận đã thanh toán tiền mặt/ngoại tuyến tại quầy (từ Web/Mobile). |

---

## 🛠️ Cấu hình Biến môi trường cổng thanh toán

Tất cả các tham số kết nối được nạp động từ file `.env` ở root hệ thống vào container để đảm bảo tính bảo mật:

```properties
# VNPAY Credentials
VNP_TMN_CODE=E6BOARWZ
VNP_HASH_SECRET=O6OOMFFZPBLYQM9EGHLRTZEJUMPGCQZJ
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:8085/payments/vnpay-return
VNP_FRONTEND_RETURN_URL=http://localhost:3000/payment-result

# MoMo Credentials
MOMO_PARTNER_CODE=MOMOLRDO20220304
MOMO_ACCESS_KEY=F8B3Ytz123456
MOMO_SECRET_KEY=v73bZtf123456
MOMO_PAY_URL=https://test-payment.momo.vn/v2/gateway/api/create
```

---

## 🔄 Phân loại Giao dịch thanh toán (Payment Types)

Hệ thống phân biệt rõ các loại giao dịch dựa trên quy tắc đặt phòng:
* `DEPOSIT`: Thanh toán tiền đặt cọc (thường là 30% ngày thường hoặc 50% ngày lễ).
* `FULL`: Thanh toán trả trước toàn bộ 100% tiền phòng.
* `REMAINING`: Thanh toán phần tiền còn lại (ví dụ cọc trước 30% thì trả nốt 70% khi nhận phòng).

Khi thanh toán bất kỳ loại nào thành công, PAYMENT service sẽ xuất bản sự kiện tương ứng lên RabbitMQ (`FULL_PAID`, `DEPOSIT_PAID`, `REMAINING_PAID`) để BOOKING service tự động đồng bộ hóa trạng thái tức thì.
