# 🔍 HotelSystem_EUREKA (Service Discovery Server)

[![Spring Cloud](https://img.shields.io/badge/Spring_Cloud-Eureka-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud-netflix)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.10-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)

Service **đăng ký và phát hiện dịch vụ** (Service Discovery) dựa trên Netflix Eureka. Đây là hạt nhân kết nối mạng của hệ thống Microservices, cho phép các dịch vụ tự động nhận diện và giao tiếp với nhau động mà không cần cấu hình cứng địa chỉ IP và Port.

---

## 🚀 Tính năng cốt lõi

- **Đăng ký dịch vụ (Service Registration)**: Tự động ghi nhận thông tin kết nối (IP, Port, ID) khi bất kỳ dịch vụ nào khởi động.
- **Phát hiện dịch vụ (Service Discovery)**: Cung cấp bản đồ dịch vụ động cho API Gateway định tuyến và OpenFeign thực hiện gọi API đồng bộ liên service.
- **Giám sát sức khỏe (Health Monitoring)**: Kiểm tra nhịp tim (Heartbeat) định kỳ của các client để tự động gỡ bỏ các thực thể (instances) bị lỗi hoặc mất kết nối khỏi hệ thống định tuyến.
- **Cân bằng tải phía Client (Client-side Load Balancing)**: Cung cấp danh sách nhiều instance đang hoạt động của cùng một service để cân bằng tải qua Spring Cloud LoadBalancer.

---

## 🔌 Cấu hình kết nối

- **Cổng chạy nội bộ**: `8761`
- **Địa chỉ Eureka Dashboard (Dev)**: [http://localhost:8761](http://localhost:8761)
- **Tên đăng ký ứng dụng**: `eureka-server`

---

## 🖥️ Eureka Dashboard UI

Truy cập [http://localhost:8761](http://localhost:8761) để xem trực quan:
1. **Instances currently registered with Eureka**: Danh sách các microservices đang chạy và đã đăng ký thành công (ví dụ: `AUTH-SERVICE`, `USER-SERVICE`, `ROOM-SERVICE`, `BOOKING-SERVICE`, `PAYMENT-SERVICE`, `NOTIFICATION-SERVICE`, `API-GATEWAY`).
2. **Trạng thái chi tiết**: Địa chỉ IP mạng Docker, cổng chạy của từng container, bộ nhớ RAM, CPU và các chỉ số vận hành cơ bản.

---

## 🛠️ Cách tích hợp một Service mới làm Eureka Client

Để thêm một dịch vụ Spring Boot mới vào hệ sinh thái:

1. Thêm dependency trong `pom.xml`:
   ```xml
   <dependency>
       <groupId>org.springframework.cloud</groupId>
       <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
   </dependency>
   ```
2. Thêm cấu hình trong `application.properties`:
   ```properties
   spring.application.name=new-service-name
   eureka.client.service-url.defaultZone=http://eureka-server:8761/eureka/
   eureka.instance.prefer-ip-address=true
   ```
3. Đính kèm chú thích `@EnableDiscoveryClient` hoặc `@EnableEurekaClient` tại class chạy chính (Main class) nếu sử dụng các cấu hình tùy biến sâu.
