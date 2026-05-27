# 📱 HotelSystem Mobile (React Native Expo App)

[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_51-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-FF6600?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

Ứng dụng di động (Mobile App) được phát triển bằng **React Native (Expo)** dành riêng cho nhân viên khách sạn hoặc thiết bị thử nghiệm quét QR. Ứng dụng tích hợp máy quét camera và cơ chế kết nối thời gian thực bằng WebSocket để tối ưu hóa tốc độ xác nhận thanh toán/check-in tại quầy.

---

## 🚀 Tính năng chính

1. **Quét mã QR giao dịch (QR Code Scanner)**:
   - Sử dụng mô-đun camera chất lượng cao (`expo-camera`) để quét trực tiếp mã QR được tạo từ Web Staff Dashboard.
   - Hỗ trợ phân tích cú pháp mã thanh toán `PAY-YYYYMMDD-XXX` từ link URL VNPAY/MoMo hoặc chuỗi thô.
2. **Xem chi tiết hóa đơn**:
   - Tải động thông tin đặt phòng, số tiền đã thanh toán, trạng thái hiện tại từ `/payment-api/payments/checkin-qr?code=...`.
3. **Lắng nghe sự kiện thời gian thực (WebSocket)**:
   - Kết nối trực tiếp đến kênh WebSocket `/payment-api/ws/payments`.
   - Lắng nghe sự kiện `payment:success` để tự động làm mới giao diện và thông báo thành công tức thì khi khách quét ứng dụng ngân hàng thành công.
4. **Xác nhận thanh toán tại quầy (Confirm Cash Payment)**:
   - Cho phép nhân viên xác nhận thanh toán tiền mặt ngoại tuyến thủ công bằng 1 nút bấm trực tiếp từ điện thoại thông qua endpoint `/payment-api/payments/{code}/confirm`.

---

## 🛠️ Yêu cầu môi trường & Cài đặt

Ứng dụng được xây dựng trên nền tảng **Expo SDK**, giúp dễ dàng kiểm thử trên cả thiết bị thật (Android/iOS) hoặc máy ảo.

### 1) Cài đặt thư viện
Chạy lệnh sau tại thư mục `HotelSystem_Mobile`:
```bash
npm install
```

### 2) Khởi chạy máy chủ Expo
```bash
npx expo start
```

Sau khi chạy lệnh trên, bạn có thể quét mã QR hiển thị trên Terminal bằng:
- **iOS**: Ứng dụng Camera mặc định của iPhone.
- **Android**: Ứng dụng **Expo Go** (tải miễn phí trên CH Play).

---

## 🔌 Cấu hình kết nối mạng (Wi-Fi Cục bộ)

> [!IMPORTANT]  
> Để điện thoại thật có thể gọi API đến backend chạy trên laptop của bạn, hai thiết bị **bắt buộc phải kết nối chung một mạng Wi-Fi**.

1. Tìm địa chỉ IP nội bộ của laptop của bạn (ví dụ: `192.168.1.15`).
   - Windows: Mở Command Prompt chạy `ipconfig` -> Tìm dòng `IPv4 Address`.
2. Trên màn hình ứng dụng di động, nhập địa chỉ IP laptop và cổng frontend vào ô **Máy chủ**:
   - Định dạng: `http://192.168.x.x:3000` (được cấu hình proxy qua Vite cổng `3000`).
3. Ứng dụng di động sẽ tự động tạo kết nối:
   - REST API qua: `http://192.168.x.x:3000/payment-api/*`
   - WebSocket qua: `ws://192.168.x.x:3000/payment-api/ws/payments`

---

## 📁 Cấu trúc thư mục

- `App.tsx` — Chứa toàn bộ giao diện, trình điều khiển camera, kết nối WebSocket và các hàm gọi fetch API.
- `app.json` & `app.config.ts` — Cấu hình Expo, quyền truy cập Camera và biến môi trường mặc định.
- `assets/` — Chứa logo, splash screen và tài nguyên hình ảnh.
- `network.local.env` — Lưu trữ IP cấu hình nhanh môi trường cục bộ.
