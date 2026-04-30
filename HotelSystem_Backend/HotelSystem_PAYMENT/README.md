# HotelSystem_PAYMENT (Payment Service)

Service quản lý và xử lý giao dịch thanh toán qua cổng VNPAY (sandbox).

## Port

- `8085`

## API endpoints chính

- `POST /payments/vnpay/create`
  - Sinh URL thanh toán động VNPAY dựa trên đơn hàng.
  - Tham số: `bookingId`, `userId`, `totalAmount`, `paymentType` (hỗ trợ `DEPOSIT`, `FULL`, `REMAINING`), `bankCode` (tùy chọn), `locale` (tùy chọn).
- `GET /payments/vnpay-return`
  - Nhận luồng điều hướng của Front-end sau khi thanh toán xong từ server VNPAY. Endpoint này sẽ kiểm tra checksum tạm thời và chuyển thiết bị người dùng về giao diện kết quả giao dịch frontend.
- `GET /payments/vnpay-ipn`
  - Nhận luồng Instant Payment Notification (IPN) ngầm từ máy chủ VNPAY gửi về máy chủ.
  - Verify cấu trúc chữ ký checksum HmacSHA512. Tránh làm giả giao dịch.
  - Cập nhật database và publish message (như `payment.result`) lên RabbitMQ để điều phối trạng thái sang Notification / Booking service.

## Body mẫu tạo thanh toán

```json
{
  "bookingId": 1,
  "userId": 10,
  "totalAmount": 1000000,
  "paymentType": "DEPOSIT",
  "bankCode": "NCB",
  "locale": "vn"
}
```

Các loại `paymentType` hỗ trợ:

- `DEPOSIT` (Thường là 50% tiền cọc)
- `FULL` (Thanh toán 100%)
- `REMAINING` (Thanh toán nốt 50% tiền còn lại của đơn hàng - Phải có `DEPOSIT` thành công trước đó)

## Quy trình gọi và Callback

1. Gửi request sinh URL => Trả về `"paymentUrl"`.
2. Hệ thống khách ở giao diện Frontend chuyển hướng trình duyệt theo `"paymentUrl"`.
3. Khách nhập thẻ/app trên VNPAY (Sandbox dùng thẻ NCB mặc định).
4. VNPAY bắn tín hiệu Server-to-Server ngầm (IPN) tới `/payments/vnpay-ipn`. Hệ thống backend PAYMENT verify và lưu trạng thái thành công, thông báo tới các service khác bằng RabbitMQ.
5. VNPAY cũng trả trình duyệt user về URL điều hướng `/payments/vnpay-return` (Return), endpoint này lại trỏ user về trang frontend thành công/thất bại để xem nhanh kết quả.

## Dữ liệu Publish RabbitMQ

- Nếu `vnp_ResponseCode == 00` (Giao dịch thành công):
  - `FULL` => publish sự kiện: `FULL_PAID`
  - `DEPOSIT` => publish sự kiện: `DEPOSIT_PAID`
  - `REMAINING` => publish sự kiện: `REMAINING_PAID`
- Nếu lỗi/không thành công => publish: `FAILED`

## ENV / File cấu hình (.properties / docker-compose)

- Cấu hình chung của ứng dụng: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `RABBIT_HOST`, `RABBIT_USERNAME`, `RABBIT_PASSWORD`
- Thông số kết nối cổng tích hợp VNPAY (đã được expose khai báo bằng `.env` ở root hệ thống):
  - `VNP_TMN_CODE` (Mã website Merchant API sandbox)
  - `VNP_HASH_SECRET` (Mã bí mật tạo chữ ký bằng quy tắc checksum)
  - `VNP_PAY_URL` (URL server vnpay `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`)
  - `VNP_RETURN_URL` (Domain URL callback frontend/backend Return)
  - `VNP_FRONTEND_RETURN_URL` (Domain UI sau Return)

## Cách khởi động nhanh

Nên nạp biến sandbox từ file `.env` mẫu, sau đó khởi chạy:

```bash
docker compose -f docker-compose.dev.yml up -d payment-service
```

## MoMo sandbox

- Backend hỗ trợ thêm MoMo theo sample `momo_nodejs/MoMo.js`.
- Mặc định dùng MoMo ATM (`requestType=payWithATM`) để nhập thẻ test/Napas trên web, không cần quét QR bằng app.
- API tạo thanh toán: `POST /payments/momo/create` với `bookingId`, `userId`, `totalAmount`, `paymentType`, `requestType`.
- API thanh toán phần còn lại: `POST /payments/momo/create-remaining`.
- Callback: `GET /payments/momo-return` redirect về frontend và `POST /payments/momo-ipn` để xác nhận server-to-server.
- ENV: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_PAY_URL`, `MOMO_REDIRECT_URL`, `MOMO_IPN_URL`, `MOMO_PARTNER_NAME`, `MOMO_STORE_ID`, `MOMO_FRONTEND_RETURN_URL`, `MOMO_EXPIRE_MINUTES`.
- `MOMO_EXPIRE_MINUTES` mặc định `10`, đồng bộ với `vnpay.expireMinutes`; Booking hold đang dùng buffer thêm 1 phút.
