import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: Number(__ENV.K6_VUS || 50),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get(`${baseUrl}/room-api/rooms`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'json array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(0.1);
}
