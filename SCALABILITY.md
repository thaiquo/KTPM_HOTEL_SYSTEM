# Scalability

This project supports horizontal scaling for the application services through:

- API Gateway routes that use `lb://service-name`.
- Eureka service discovery for registering multiple instances of the same service.
- Stateless Spring Boot service containers that can be replicated by Docker Compose.
- Shared infrastructure services such as PostgreSQL, Redis, and RabbitMQ used outside the application replicas.

## Services that should be scaled

The scalability characteristic applies to the whole PMS system architecture, but it is most useful for services that receive user/API traffic:

| Service | Why it needs scaling |
| --- | --- |
| `room-service` | Room listing/search and room status reads can receive high traffic from customers and staff. |
| `booking-service` | Booking creation, check-in/check-out, invoice, refund, and staff operations are core workflows. |
| `user-service` | Staff/customer management, profile APIs, and staff shift APIs are shared by admin and staff flows. |
| `payment-service` | Payment creation/callback/status APIs can spike during checkout/payment flows. |
| `auth-service` | Login/register/OTP traffic can spike and should not block the whole system. |
| `notification-service` | Async notification handling can be scaled when queue volume increases. |
| `ai-service` | Chatbot traffic can be scaled separately from core PMS functions. |

The API Gateway can also be scaled, but then an external load balancer is needed in front of multiple Gateway instances. In the current local demo, one Gateway is enough because it load-balances traffic to replicated backend services.

Infrastructure services are not treated as horizontally scalable in this project demo:

- PostgreSQL databases are single-instance per service database.
- Redis is single-instance for cache/rate limiting.
- RabbitMQ is single-instance.
- Eureka is single-instance.

That means this project demonstrates service-level scalability, not full production high availability.

## Demo command

Start the stack with the scaling override:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.scale.yml up -d --scale room-service=2 --scale booking-service=2 --scale user-service=2
```

The override file removes direct host port bindings from scalable backend services. This avoids port conflicts when multiple containers run the same internal port.

Check running replicas:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.scale.yml ps
```

Open Eureka Dashboard:

```text
http://localhost:8761
```

Expected result: Eureka shows multiple instances for the scaled services, for example `ROOM-SERVICE`, `BOOKING-SERVICE`, and `USER-SERVICE`.

The frontend and API Gateway remain the public entry points:

```text
http://localhost:3000
http://localhost:8080
```

## Why this satisfies scalability

The Gateway routes requests through Eureka using logical service names such as `lb://room-service`, `lb://booking-service`, and `lb://user-service`. When multiple containers register under the same service name, Spring Cloud Gateway can distribute requests across those instances.

Relevant code:

- `HotelSystem_Backend/HotelSystem_GATEWAY/src/main/resources/application.yml`
- `HotelSystem_Backend/HotelSystem_EUREKA/src/main/java/iuh/fit/hotelsystem_eureka/HotelSystemEurekaApplication.java`
- `docker-compose.scale.yml`
