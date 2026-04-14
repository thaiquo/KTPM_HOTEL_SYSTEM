import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const roomId = Number(__ENV.ROOM_ID || 1);
const userId = Number(__ENV.USER_ID || 1);

export const options = {
  vus: Number(__ENV.K6_VUS || 50),
  duration: __ENV.K6_DURATION || '20s',
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const today = new Date();
  const checkIn = today.toISOString().slice(0, 10);
  const checkOut = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const payload = JSON.stringify({
    roomId,
    userId,
    checkIn,
    checkOut,
  });

  const res = http.post(`${baseUrl}/booking-api/bookings`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });

  // Under contention, some may fail due to room not available (expected).
  check(res, {
    'status 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
  });

  sleep(0.2);
}
