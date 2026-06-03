import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Setup K6 configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 users
    { duration: '1m', target: 150 },  // Spike to 150 concurrent users
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    // 95% of requests must complete below 300ms
    http_req_duration: ['p(95)<300'], 
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],   
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '1'; // Default ID for testing

// 2. Scenario execution
export default function () {
  // Simulate a user hitting the public menu
  const menuRes = http.get(`${BASE_URL}/api/restaurants/${RESTAURANT_ID}/public-menu`);
  
  check(menuRes, {
    'Menu loaded successfully': (r) => r.status === 200,
  });

  // Extract a dish ID dynamically if possible, otherwise use a fallback
  let dishId = 1;
  if (menuRes.status === 200) {
    try {
      const menuData = JSON.parse(menuRes.body);
      if (menuData.categories && menuData.categories.length > 0) {
        dishId = menuData.categories[0].dishes[0].id;
      }
    } catch (e) {
      // Ignored for testing
    }
  }

  // Simulate user opening AR dish view
  const dishRes = http.get(`${BASE_URL}/api/dishes/${dishId}`);
  
  check(dishRes, {
    'Dish loaded successfully': (r) => r.status === 200,
  });

  // Think time (simulating real user reading the menu)
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}
