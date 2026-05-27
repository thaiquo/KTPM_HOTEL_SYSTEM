# 🏨 QLKSV2 Hotel System — Microservices Architecture Transformation

## Phân tích hiện trạng

### Kiến trúc hiện tại
- **6 microservices**: AUTH(:8081), USER(:8082), ROOM(:8083), BOOKING(:8084), PAYMENT(:8085), NOTIFICATION(:8086)
- **Spring Boot versions không đồng nhất**: AUTH/USER dùng `3.5.10`, BOOKING/PAYMENT/ROOM dùng `4.0.2`, NOTIFICATION dùng `4.0.3`
- **Giao tiếp**: RabbitMQ (async) + RestTemplate (sync, hardcoded URLs)
- **Database**: PostgreSQL riêng cho Room/Booking/Payment/Notification, nhưng **AUTH và USER dùng chung `hotel_auth`** ❌

### Các vấn đề cần giải quyết

| Vấn đề | Vị trí | Mức độ |
|--------|--------|--------|
| Frontend gọi trực tiếp 6 port khác nhau | `vite.config.ts` proxy | 🔴 Critical |
| Hardcoded URLs (`http://payment-service:8085`) | BookingService, PaymentService, RefundService, AuthService, RoomService | 🔴 Critical |
| `RestTemplate` tạo `new` trực tiếp (không injectable) | BookingService:56, PaymentService:59, RefundService:41 | 🔴 Critical |
| USER + AUTH dùng chung DB `hotel_auth` | docker-compose, application.properties | 🔴 Critical |
| Không có Circuit Breaker | Booking→Payment REST calls | 🔴 Critical |
| Không có DLQ cho RabbitMQ | Tất cả queues | 🟡 Important |
| JWT secret hardcode trong mỗi service | application.properties (5 services) | 🟡 Important |
| Không có Distributed Tracing | Toàn hệ thống | 🔵 Standard |

---

## 🔴 Giai đoạn 1: Kiến trúc cốt lõi (Critical)

> [!IMPORTANT]
> Giai đoạn này ảnh hưởng đến toàn bộ hệ thống. Cần backup trước khi thực hiện.

### 1.1 Eureka Server (Service Discovery)

#### [NEW] HotelSystem_Backend/HotelSystem_EUREKA/

Tạo service mới `HotelSystem_EUREKA` — Spring Boot project đơn giản:

**pom.xml** — Spring Boot 3.5.10 + `spring-cloud-starter-netflix-eureka-server`

**application.yml**:
```yaml
server:
  port: 8761
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
spring:
  application:
    name: eureka-server
```

**Main class**: `@EnableEurekaServer`

#### Đăng ký tất cả services làm Eureka Client

Mỗi service (AUTH, USER, ROOM, BOOKING, PAYMENT, NOTIFICATION) thêm dependency:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

Thêm vào `application.properties` mỗi service:
```properties
eureka.client.service-url.defaultZone=http://eureka-server:8761/eureka/
spring.application.name=auth-service  # tên tương ứng
```

#### [MODIFY] docker-compose.dev.yml
Thêm eureka-server container, tất cả services `depends_on: eureka-server`.

---

### 1.2 API Gateway (Spring Cloud Gateway)

#### [NEW] HotelSystem_Backend/HotelSystem_GATEWAY/

**pom.xml** — Spring Boot 3.5.10 + `spring-cloud-starter-gateway` + `eureka-client` + `jjwt`

**application.yml**:
```yaml
server:
  port: 8080
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: lb://auth-service
          predicates:
            - Path=/auth-api/**
          filters:
            - RewritePath=/auth-api(?<segment>/?.*), ${segment}
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/user-api/**
          filters:
            - RewritePath=/user-api(?<segment>/?.*), ${segment}
        - id: room-service
          uri: lb://room-service
          predicates:
            - Path=/room-api/**
          filters:
            - RewritePath=/room-api(?<segment>/?.*), ${segment}
        - id: booking-service
          uri: lb://booking-service
          predicates:
            - Path=/booking-api/**
          filters:
            - RewritePath=/booking-api(?<segment>/?.*), ${segment}
        - id: payment-service
          uri: lb://payment-service
          predicates:
            - Path=/payment-api/**
          filters:
            - RewritePath=/payment-api(?<segment>/?.*), ${segment}
        - id: notification-service
          uri: lb://notification-service
          predicates:
            - Path=/notification-api/**
          filters:
            - RewritePath=/notification-api(?<segment>/?.*), ${segment}
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
jwt:
  secret: iJXVUFK+5ccfmPvUHI8lY5CcSql77pZUS4gnf887kbM=
```

**JwtAuthFilter.java** — GlobalFilter validate JWT, skip cho `/auth-api/auth/login`, `/auth-api/auth/register/**`, public endpoints.

#### [MODIFY] HotelSystem/vite.config.ts
Frontend chỉ còn 1 proxy duy nhất trỏ đến Gateway:
```typescript
proxy: {
  '/api': {
    target: isDocker ? 'http://api-gateway:8080' : 'http://localhost:8080',
    changeOrigin: true,
  }
}
```

> [!WARNING]
> Frontend cần refactor tất cả API calls từ `/auth-api`, `/user-api`... sang qua Gateway prefix. Tuy nhiên Gateway routes giữ nguyên prefix nên impact nhỏ.

---

### 1.3 Circuit Breaker (Resilience4j)

#### [MODIFY] HotelSystem_BOOKING/pom.xml
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
```

#### [MODIFY] BookingService.java — Bọc REST calls
```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
private PaymentStatusResponse getPaymentStatus(Long bookingId) { ... }

private PaymentStatusResponse paymentFallback(Long bookingId, Throwable t) {
    log.warn("Payment service unavailable, fallback for bookingId={}", bookingId, t);
    PaymentStatusResponse fallback = new PaymentStatusResponse();
    fallback.setStatus("SERVICE_UNAVAILABLE");
    fallback.setPaidAmount(0.0);
    fallback.setRemainingAmount(0.0);
    return fallback;
}
```

Cấu hình trong `application.properties`:
```properties
resilience4j.circuitbreaker.instances.paymentService.sliding-window-size=10
resilience4j.circuitbreaker.instances.paymentService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.paymentService.wait-duration-in-open-state=30s
resilience4j.circuitbreaker.instances.paymentService.permitted-number-of-calls-in-half-open-state=3
```

Tương tự cho `PaymentService.java` khi gọi booking-service, `AuthService.java` khi gọi user-service.

---

### 1.4 Tách Database USER khỏi AUTH

#### [MODIFY] docker-compose.dev.yml
Thêm `postgres-user` container riêng:
```yaml
postgres-user:
  image: postgres:15
  ports:
    - "55422:5432"
  environment:
    POSTGRES_DB: hotel_user
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: quocthai
  volumes:
    - user_data:/var/lib/postgresql/data
```

#### [MODIFY] HotelSystem_USER/application.properties
```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/hotel_user}
spring.jpa.hibernate.ddl-auto=update  # thay vì validate
```

#### [NEW] Data migration script
Script SQL migrate bảng `users`, `roles` từ `hotel_auth` → `hotel_user`.

---

## 🟡 Giai đoạn 2: Nâng cao chất lượng Code (Important)

### 2.1 OpenFeign thay RestTemplate

#### Thêm dependency cho BOOKING, PAYMENT, AUTH, ROOM
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

#### [NEW] HotelSystem_BOOKING/client/PaymentServiceClient.java
```java
@FeignClient(name = "payment-service", fallbackFactory = PaymentServiceFallbackFactory.class)
public interface PaymentServiceClient {
    @GetMapping("/payments/invoices/booking/{bookingId}/status")
    PaymentStatusResponse getInvoiceStatus(@PathVariable Long bookingId);
    
    @PostMapping("/payments/bookings/{bookingId}/remaining-payment")
    Object collectRemainingPayment(@PathVariable Long bookingId, @RequestBody RemainingPaymentRequest request);
    
    @GetMapping("/payments/bookings/{bookingId}/early-checkin-fee/status")
    PaymentStatusResponse getEarlyCheckinFeeStatus(@PathVariable Long bookingId);
    
    @PostMapping("/payments/bookings/{bookingId}/early-checkin-fee")
    Object createEarlyCheckinFee(@PathVariable Long bookingId, @RequestBody LateCheckoutPaymentRequest request);
}
```

#### [NEW] PaymentServiceFallbackFactory.java — Circuit breaker fallback tích hợp

#### [MODIFY] BookingService.java — Thay `restTemplate` → `paymentServiceClient`

#### Tương tự cho:
- **AuthService.java** → `UserServiceClient` (thay RestTemplate gọi user-service)
- **PaymentService.java** → `BookingServiceClient` (thay RestTemplate gọi booking-service)
- **RoomService.java** → `BookingServiceClient`

#### [DELETE] Xóa tất cả `private final RestTemplate restTemplate = new RestTemplate();`

---

### 2.2 RabbitMQ DLQ (Dead Letter Queue)

#### [MODIFY] Tất cả RabbitConfig
Cấu hình DLQ cho mỗi queue quan trọng:
```java
@Bean
public Queue paymentRequestQueue() {
    return QueueBuilder.durable(PAYMENT_REQUEST_QUEUE)
        .deadLetterExchange(EXCHANGE + ".dlx")
        .deadLetterRoutingKey("payment.request.dlq")
        .build();
}

@Bean
public Queue paymentRequestDLQ() {
    return new Queue(PAYMENT_REQUEST_QUEUE + ".dlq", true);
}
```

Áp dụng cho: `payment.request.queue`, `room.hold.queue`, `notification.booking.queue`, `notification.payment.queue`.

---

### 2.3 Idempotency

#### [MODIFY] PaymentListener.java
```java
@RabbitListener(queues = RabbitConfig.PAYMENT_REQUEST_QUEUE)
public void processPayment(PaymentMessage msg) {
    String idempotencyKey = "payment:" + msg.getBookingId() + ":" + msg.getAmount();
    if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
        log.info("Duplicate payment request ignored: {}", idempotencyKey);
        return;
    }
    // ... existing logic
    payment.setIdempotencyKey(idempotencyKey);
}
```

#### [MODIFY] Payment.java entity — thêm `idempotencyKey` column + unique index

---

### 2.4 Refactor BookingService (đã phần nào được tách)

Hiện tại BookingService đã được tách khá tốt (`PricingService`, `BookingValidator`, `CheckInOutService`, `BookingGuestService`, `CheckoutService`). Cần thêm:

#### [NEW] InventoryService.java — Quản lý tình trạng phòng
Tách logic kiểm tra room availability và hold/release ra khỏi BookingService.

---

## 🔵 Giai đoạn 3: Observability

### 3.1 Distributed Tracing (Micrometer Tracing + Zipkin)

#### Thêm dependency cho TẤT CẢ services (bao gồm Gateway)
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

#### [MODIFY] docker-compose.dev.yml — thêm Zipkin container
```yaml
zipkin:
  image: openzipkin/zipkin
  ports:
    - "9411:9411"
```

#### Thêm vào application.properties mỗi service
```properties
management.tracing.sampling.probability=1.0
management.zipkin.tracing.endpoint=http://zipkin:9411/api/v2/spans
```

---

### 3.2 Spring Cloud Config Server

#### [NEW] HotelSystem_Backend/HotelSystem_CONFIG/
Config server quản lý tập trung cấu hình: JWT secret, DB passwords, VNPay/MoMo credentials, RabbitMQ credentials.

Mỗi service sẽ thêm `spring-cloud-starter-config` dependency và bootstrap từ config server.

---

### 3.3 Monitoring (Prometheus + Grafana)

#### Thêm dependency cho tất cả services
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

#### [MODIFY] docker-compose.dev.yml
```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
```

---

### 3.4 Centralized Logging (ELK Stack)

#### [MODIFY] docker-compose.dev.yml
Thêm Elasticsearch + Logstash + Kibana containers. Cấu hình logback-spring.xml cho mỗi service đẩy log về Logstash.

---

## 🟢 Giai đoạn 4: Bảo mật & Hoàn thiện

### 4.1 Docker Network Isolation

#### [MODIFY] docker-compose.dev.yml
```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # không expose ra ngoài
  data:
    driver: bridge
    internal: true
```

Chỉ `api-gateway` và `frontend` ở network `frontend`. Tất cả services ở `backend`. Databases ở `data`.

### 4.2 Redis Caching

#### Thêm Redis container + `spring-boot-starter-data-redis` cho ROOM và USER services
Cache: danh sách phòng, room types, user profiles.

### 4.3 Unit & Integration Tests
Target coverage 60-70% cho: PricingService, BookingValidator, CheckInOutService, PaymentService.

---

## User Review Required

> [!IMPORTANT]
> **Thống nhất Spring Boot version**: Hiện tại có 3 versions khác nhau (3.5.10, 4.0.2, 4.0.3). Tôi đề xuất **thống nhất về 3.5.10** vì stable hơn và Spring Cloud hỗ trợ tốt hơn. Bạn muốn giữ 4.x hay downgrade về 3.5.x?

> [!WARNING]
> **Database migration USER**: Tách USER ra DB riêng sẽ cần migrate data. Nếu hệ thống đang có data production, cần cẩn thận. Với đồ án thì có thể reset data.

## Open Questions

1. **Ưu tiên thực hiện**: Bạn muốn tôi bắt đầu từ đâu? Tôi đề xuất thứ tự: **Eureka → Gateway → Circuit Breaker → Tracing (Zipkin)** — đây là 4 thứ "ăn điểm" nhất.

2. **Spring Boot version**: Thống nhất về version nào? `3.5.10` (stable) hay `4.0.x` (mới)?

3. **Frontend refactor scope**: Gateway sẽ giữ nguyên prefix (`/auth-api`, `/user-api`...) nên frontend impact tối thiểu. Confirm?

4. **Config Server**: Dùng Git repo hay native file system cho config?

---

## Verification Plan

### Automated Tests
```bash
# Build tất cả services
docker-compose -f docker-compose.dev.yml build

# Start hệ thống
docker-compose -f docker-compose.dev.yml up -d

# Verify Eureka dashboard
curl http://localhost:8761

# Verify Gateway routing
curl http://localhost:8080/auth-api/auth/login -X POST -H "Content-Type: application/json"
curl http://localhost:8080/room-api/rooms

# Verify Zipkin traces
# Mở http://localhost:9411 → tìm traces

# Verify Circuit Breaker
# Stop payment-service → gọi booking check-in → verify fallback response
docker-compose stop payment-service
curl http://localhost:8080/booking-api/bookings/1 # should return fallback
```

### Manual Verification
- Eureka Dashboard hiển thị tất cả services registered
- Zipkin Dashboard hiển thị full request trace qua nhiều services
- Frontend hoạt động bình thường qua Gateway (chỉ port 8080)
- Circuit breaker kích hoạt khi service down
