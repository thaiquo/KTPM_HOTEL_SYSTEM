# 🔍 HotelSystem_EUREKA (Service Discovery)

[![Spring Cloud](https://img.shields.io/badge/Spring_Cloud-Eureka-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud-netflix)

Service **đăng ký và phát hiện dịch vụ**. Giúp các Microservices tìm thấy nhau mà không cần cấu hình IP/Port cứng.

## 🚀 Tính năng chính
- **Service Registration**: Tự động nhận diện khi một service mới khởi tạo.
- **Service Discovery**: Cung cấp danh sách các service đang hoạt động cho API Gateway và OpenFeign.
- **Health Monitoring**: Tự động loại bỏ các service gặp sự cố khỏi danh sách định tuyến.
- **Load Balancing**: Phối hợp với Ribbon/LoadBalancer để điều phối request.

## 🔌 Cấu hình kết nối
- **Port**: `8761`
- **Dashboard**: `http://localhost:8761`

## 🖥️ Giao diện Dashboard
Bạn có thể truy cập vào dashboard để xem:
- Danh sách các instance đang chạy (`AUTH-SERVICE`, `ROOM-SERVICE`, ...).
- Trạng thái RAM/CPU của từng instance.
- IP Address và Port nội bộ của các container.

## 🛠️ Cấu hình Client
Tất cả các Microservices khác phải khai báo `eureka.client.service-url.defaultZone` trỏ về port 8761 để có thể tham gia vào hệ sinh thái.
