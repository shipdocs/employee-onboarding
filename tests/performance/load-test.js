/**
 * K6 Load Testing Script
 * Tests API performance under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 }, // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    // Performance targets
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
    errors: ['rate<0.01'],
    response_time: ['p(95)<500'],
  },
};

// Base URL - adjust for your environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

const testManagers = [
  { email: 'manager1@example.com', password: 'password123' },
  { email: 'manager2@example.com', password: 'password123' },
];

export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Verify the application is running
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'Health check successful': (r) => r.status === 200,
  });
  
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  
  // Simulate different user behaviors
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Manager authentication flow
    testManagerAuth(baseUrl);
  } else if (scenario < 0.6) {
    // 30% - Crew magic link flow
    testCrewMagicLink(baseUrl);
  } else if (scenario < 0.8) {
    // 20% - API endpoint testing
    testApiEndpoints(baseUrl);
  } else {
    // 20% - Static resource loading
    testStaticResources(baseUrl);
  }
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

function testManagerAuth(baseUrl) {
  const manager = testManagers[Math.floor(Math.random() * testManagers.length)];
  
  // Test manager login
  const loginResponse = http.post(`${baseUrl}/api/auth/manager/login`, 
    JSON.stringify({
      email: manager.email,
      password: manager.password
    }), 
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  const loginSuccess = check(loginResponse, {
    'Manager login status is 200': (r) => r.status === 200,
    'Manager login response time < 500ms': (r) => r.timings.duration < 500,
    'Manager login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!loginSuccess);
  responseTime.add(loginResponse.timings.duration);
  
  if (loginSuccess && loginResponse.status === 200) {
    const token = JSON.parse(loginResponse.body).token;
    
    // Test authenticated endpoints
    const dashboardResponse = http.get(`${baseUrl}/api/manager/dashboard`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    check(dashboardResponse, {
      'Dashboard access successful': (r) => r.status === 200,
      'Dashboard response time < 300ms': (r) => r.timings.duration < 300,
    });
    
    responseTime.add(dashboardResponse.timings.duration);
  }
}

function testCrewMagicLink(baseUrl) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test magic link request
  const magicLinkResponse = http.post(`${baseUrl}/api/auth/magic-link`, 
    JSON.stringify({
      email: user.email
    }), 
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  const magicLinkSuccess = check(magicLinkResponse, {
    'Magic link request status is 200': (r) => r.status === 200,
    'Magic link response time < 1000ms': (r) => r.timings.duration < 1000,
    'Magic link response contains success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!magicLinkSuccess);
  responseTime.add(magicLinkResponse.timings.duration);
}

function testApiEndpoints(baseUrl) {
  // Test various API endpoints
  const endpoints = [
    '/api/health',
    '/api/training/modules',
    '/api/system-settings',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`${baseUrl}${endpoint}`);
  
  const success = check(response, {
    [`${endpoint} status is 200`]: (r) => r.status === 200,
    [`${endpoint} response time < 300ms`]: (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testStaticResources(baseUrl) {
  // Test static resource loading
  const staticResources = [
    '/',
    '/manager/login',
    '/crew/onboarding',
  ];
  
  const resource = staticResources[Math.floor(Math.random() * staticResources.length)];
  
  const response = http.get(`${baseUrl}${resource}`);
  
  const success = check(response, {
    [`${resource} status is 200`]: (r) => r.status === 200,
    [`${resource} response time < 2000ms`]: (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

export function teardown(data) {
  console.log('Load test completed');
  console.log('Check the results for performance metrics');
}

// Stress test configuration
export const stressOptions = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // More lenient for stress test
    http_req_failed: ['rate<0.05'], // Allow 5% error rate under stress
  },
};

// Spike test configuration
export const spikeOptions = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 1000 }, // Sudden spike
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 10 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};
