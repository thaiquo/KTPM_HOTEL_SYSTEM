# Load/Perf Tests (k6 + JMeter)

Mục tiêu: chạy ra số liệu **RPS / latency (p95) / error rate** để đánh giá cache, rate limit, retry/timeout.

> Khuyến nghị chạy khi stack đang up bằng `docker-compose.dev.yml`.

## 0) Start system

```bash
docker compose -f docker-compose.dev.yml up -d
```

Các URL sử dụng trong test:

- Frontend proxy (giống browser): `http://localhost:3000`
- Room API trực tiếp: `http://localhost:8083`
- Booking API trực tiếp: `http://localhost:8084`

---

## 1) k6 (không cần cài k6)

### 1.1 Test ROOM list (đo cache trước/sau)

File: [k6/rooms-list.js](k6/rooms-list.js)

Chạy bằng Docker:

```bash
docker run --rm -i grafana/k6 run - < load-tests/k6/rooms-list.js
```

Tuỳ biến:

```bash
# ví dụ 200 virtual users trong 60s
set K6_VUS=200
set K6_DURATION=60s
set BASE_URL=http://localhost:3000

docker run --rm -i -e K6_VUS=%K6_VUS% -e K6_DURATION=%K6_DURATION% -e BASE_URL=%BASE_URL% grafana/k6 run - < load-tests/k6/rooms-list.js
```

### 1.2 Test tranh chấp đặt cùng 1 phòng

File: [k6/booking-contention.js](k6/booking-contention.js)

```bash
set BASE_URL=http://localhost:3000
set ROOM_ID=1
set USER_ID=1

docker run --rm -i -e BASE_URL=%BASE_URL% -e ROOM_ID=%ROOM_ID% -e USER_ID=%USER_ID% grafana/k6 run - < load-tests/k6/booking-contention.js
```

---

## 2) JMeter (tuỳ chọn, chạy bằng Docker)

### 2.1 Room list plan

File: [jmeter/rooms-list.jmx](jmeter/rooms-list.jmx)

```bash
docker run --rm -v %cd%/load-tests/jmeter:/tests justb4/jmeter -n -t /tests/rooms-list.jmx -l /tests/results.jtl
```

---

## 3) Cách đo “trước/sau cache”

Room service dùng Redis cache cho:

- `GET /rooms` (cache key `all`)
- `GET /rooms/available` (cache key `available`)

### Trước (tắt cache)

Tắt cache bằng env `CACHE_TYPE=none` cho `room-service`.

- Cách nhanh: sửa `docker-compose.dev.yml` (room-service env) thành `CACHE_TYPE: none` rồi:

```bash
docker compose -f docker-compose.dev.yml up -d --force-recreate room-service
```

Chạy test `k6/rooms-list.js` và lưu kết quả.

### Sau (bật cache lại)

Đổi lại `CACHE_TYPE: redis` rồi recreate `room-service`, chạy test lần 2.

So sánh các chỉ số chính:

- `http_req_duration{p(95)}` (ms)
- `http_reqs` (RPS)
- `http_req_failed` (%)
