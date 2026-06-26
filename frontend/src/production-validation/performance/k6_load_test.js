import http from 'k6/http';
import { sleep } from 'k6';

// Simulate up to 1000 concurrent users hitting the API
export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  http.get('http://localhost:5000/api/public-menu');
  sleep(1);
}
