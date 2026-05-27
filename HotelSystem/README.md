# 💻 HotelSystem Frontend (React Client)

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

Giao diện người dùng web (Frontend client) của hệ thống quản lý khách sạn. Hỗ trợ đầy đủ luồng tác vụ của **Khách hàng** (Đọc thông tin phòng, đặt phòng linh hoạt, thanh toán trực tuyến qua VNPAY/MoMo) và **Nhân viên/Quản lý** (Quản lý tình trạng phòng trống, thực hiện check-in sớm, phụ thu check-out trễ, kiểm soát tiến trình hoàn tiền).

---

## 🚀 Tính năng nổi bật

- **Đặt phòng trực tuyến**: Tìm kiếm phòng trống thông minh theo thời gian thực.
- **Thanh toán trực tiếp**: Tích hợp luồng thanh toán VNPAY/MoMo linh hoạt (hỗ trợ cọc 30%, 50% hoặc thanh toán 100%).
- **Trang Dashboard nhân viên (Staff Dashboard)**:
  - Hiển thị trực quan danh sách check-in/check-out trong ngày.
  - Tự động phân loại trạng thái: Đặt trước (Confirmed), Đã nhận phòng (Checked In), Quá hạn Check-in (Overdue).
  - Tính toán tự động các phụ thu check-in sớm và check-out trễ trước khi hoàn tất thủ tục.
  - Sinh mã QR giao dịch động để nhân viên cho khách quét thanh toán tại quầy qua Mobile App.
- **Quản lý Hoàn tiền (Refund Operations)**: Giao diện quản trị viên phân bổ tác vụ xử lý hoàn tiền, theo dõi SLA 48h trực quan.
- **Hiệu ứng & Trải nghiệm premium**: Sử dụng Framer Motion cho các chuyển động trượt, mờ và chuyển trang mượt mà.

---

## 🛠️ Công nghệ cốt lõi

- **Core**: React 19, TypeScript
- **Styling**: Tailwind CSS, CSS Variables cho Dark Mode/Light Mode.
- **State Management**: React Context API (`AuthContext`, `UIContext`).
- **Routing**: React Router Dom v6
- **Icons**: React Icons (Heroicons, Lucide Icons)
- **API Client**: Axios với Interceptors tự động đính kèm `Bearer JWT` và xử lý silent refresh token khi Access Token hết hạn.

---

## 📦 Hướng dẫn khởi chạy

### 1) Chạy thông qua Docker Compose (Khuyến nghị)
Khi chạy ở thư mục gốc qua Docker compose, frontend sẽ tự động cài đặt node modules và khởi động trên cổng `3000` với cơ chế hot-reload:
```bash
docker compose -f docker-compose.dev.yml up -d frontend
```
* Truy cập: [http://localhost:3000](http://localhost:3000)

### 2) Khởi chạy Standalone (Local Node)
Nếu bạn muốn chạy trực tiếp bằng môi trường Node cục bộ:
```bash
# Di chuyển vào thư mục frontend
cd HotelSystem

# Cài đặt thư viện
npm install

# Khởi chạy dev server
npm run dev
```

---

## 🏗️ Cấu trúc thư mục mã nguồn

```
src/
├── features/         # Các module nghiệp vụ chính
│   ├── auth/         # Đăng nhập, đăng ký, OTP
│   ├── booking/      # Đặt phòng, tính giá, lịch sử đặt
│   ├── room/         # Xem chi tiết hạng phòng, tình trạng trống
│   ├── dashboard/    # Giao diện dành cho nhân viên khách sạn
│   └── refund/       # Giao diện quản lý SLA hoàn tiền
├── shared/           # Component, layout và custom hooks dùng chung
│   ├── components/   # Button, Modal, Inputs
│   ├── hooks/        # useAuth, useTheme
│   └── layouts/      # Navbar, Sidebar, Footer
├── services/         # Cấu hình API và Axios
│   └── api.ts        # Axios client cấu hình Gateway base URL
└── types/            # Khai báo kiểu TypeScript toàn cục
```

---

## 🚪 Định tuyến qua API Gateway

Toàn bộ các yêu cầu API từ client được định tuyến tập trung qua cổng `8080` của API Gateway:

- `/auth-api/*` ➔ AUTH Service (Xác thực, OTP)
- `/user-api/*` ➔ USER Service (Thông tin cá nhân, vai trò)
- `/room-api/*` ➔ ROOM Service (Danh sách phòng, ảnh hạng phòng)
- `/booking-api/*` ➔ BOOKING Service (Tạo booking, Check-in/Check-out)
- `/payment-api/*` ➔ PAYMENT Service (VNPAY, MoMo, QR Code, WebSocket)

Cấu hình proxy cho môi trường Dev nằm ở `vite.config.ts`.
Cấu hình proxy cho môi trường Production (Nginx) nằm ở `nginx.conf`.
