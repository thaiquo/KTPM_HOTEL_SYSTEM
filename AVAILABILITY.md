# Availability

This project improves availability at demo/report level through three mechanisms:

- Automatic container restart.
- Health checks for infrastructure and Spring Boot services.
- Multiple replicas for important backend services through Eureka and API Gateway.

## 1. Automatic restart

`docker-compose.dev.yml` uses:

```yaml
restart: unless-stopped
```

This is applied to the main infrastructure and application containers:

- `eureka-server`
- `redis`
- `rabbitmq`
- all PostgreSQL containers
- `auth-service`
- `user-service`
- `room-service`
- `booking-service`
- `payment-service`
- `notification-service`
- `ai-service`
- `api-gateway`
- `frontend`

If a container crashes, Docker restarts it automatically unless the developer explicitly stops it.

## 2. Health checks

Infrastructure health checks:

- Redis: `redis-cli ping`
- RabbitMQ: `rabbitmq-diagnostics -q ping`
- PostgreSQL: `pg_isready`
- Eureka: `/actuator/health`

Spring service health checks:

- `auth-service`: `http://localhost:8081/actuator/health`
- `user-service`: `http://localhost:8082/actuator/health`
- `room-service`: `http://localhost:8083/actuator/health`
- `booking-service`: `http://localhost:8084/actuator/health`
- `payment-service`: `http://localhost:8085/actuator/health`
- `notification-service`: `http://localhost:8086/actuator/health`
- `ai-service`: `http://localhost:8087/actuator/health`
- `api-gateway`: `http://localhost:8080/actuator/health`

The Spring services use a longer `start_period` because the dev containers build the Maven project before starting the application.

## 3. Multiple service instances

Important services can run with multiple replicas:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.scale.yml up -d --scale room-service=2 --scale booking-service=2 --scale user-service=2
```

The API Gateway routes to logical service names such as `lb://room-service`, and Eureka registers all running replicas. If one replica is unavailable, traffic can continue through another registered replica.

## Recommended demo

Start the scaled stack:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.scale.yml up -d --scale room-service=2 --scale booking-service=2 --scale user-service=2
```

Check container status:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.scale.yml ps
```

Open Eureka:

```text
http://localhost:8761
```

Expected result:

- Scaled services show multiple instances.
- Containers expose health status.
- Docker restarts crashed containers according to `restart: unless-stopped`.

## Current limitation

This is availability at service-demo level, not full production high availability. PostgreSQL, Redis, RabbitMQ, Eureka, and the API Gateway are still single-instance in the local demo. Full 24/7 production availability would require clustering or managed HA versions of these infrastructure components.
