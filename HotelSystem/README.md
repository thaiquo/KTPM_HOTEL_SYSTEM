# 💻 HotelSystem Frontend

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

Giao diện người dùng của hệ thống quản lý khách sạn. Được thiết kế với phong cách hiện đại, trải nghiệm mượt mà và tối ưu trên mọi thiết bị.

## 🚀 Tính năng chính
- **Đặt phòng trực tuyến**: Tìm kiếm phòng, xem chi tiết và thực hiện đặt phòng với luồng thanh toán VNPAY.
- **Quản lý đặt phòng**: Theo dõi lịch sử, trạng thái thanh toán và thực hiện hủy phòng.
- **Dashboard Nhân viên**: Xử lý Check-in/Check-out chuyên nghiệp với giao diện tối ưu.
- **Quản lý hồ sơ**: Cập nhật thông tin cá nhân và xem lịch sử tích lũy.
- **Hiệu ứng mượt mà**: Sử dụng Framer Motion cho các chuyển động premium.

## 🛠️ Công nghệ sử dụng
- **Core**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (Context API)
- **Routing**: React Router Dom
- **Icons**: React Icons (Hi, Lu)
- **API Client**: Axios với Interceptors cho Auth/Refresh Token.

## 📦 Hướng dẫn cài đặt

### 1) Chạy bằng Docker (Khuyến nghị)
Chạy stack dev từ thư mục gốc của project:
```bash
docker compose -f docker-compose.dev.yml up -d
```
Truy cập: `http://localhost:3000`

### 2) Chạy Standalone
```bash
cd HotelSystem
npm install
npm run dev
```

## 🏗️ Cấu trúc thư mục
- `src/features/`: Chứa các module nghiệp vụ chính (room, booking, auth, dashboard).
- `src/shared/`: Các component, layout và hook dùng chung.
- `src/services/`: Cấu hình API và các hàm gọi backend.
- `src/types/`: Định nghĩa kiểu dữ liệu TypeScript.
