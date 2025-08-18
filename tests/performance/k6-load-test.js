/**
 * k6 Load Testing Script
 * Performance testing for the maritime onboarding system
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('errors');
const loginSuccessRate = new Rate('login_success');
const apiResponseTime = new Rate('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 },   // Ramp up to 50 users over 5 minutes
    { duration: '10m', target: 100 }, // Stay at 100 users for 10 minutes
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.1'],                   // Error rate under 10%
    errors: ['rate<0.1'],                             // Custom error rate under 10%
    login_success: ['rate>0.9'],                      // 90% login success rate
  },
};

// Test data
const testUsers = new SharedArray('users', function () {
  return [
    { email: 'test1@example.com', password: 'TestPass123!', role: 'crew' },
    { email: 'test2@example.com', password: 'TestPass123!', role: 'crew' },
    { email: 'manager1@example.com', password: 'TestPass123!', role: 'manager' },
    { email: 'manager2@example.com', password: 'TestPass123!', role: 'manager' },
    { email: 'admin@example.com', password: 'TestPass123!', role: 'admin' },
  ];
});

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper functions
function authenticateUser(user) {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => r.json('token') !== undefined,
  });

  loginSuccessRate.add(success);

  if (success) {
    return loginRes.json('token');
  }
  return null;
}

// Test scenarios
export function setup() {
  // Setup code - create test data if needed
  console.log('Setting up test environment...');
  return { startTime: new Date() };
}

export default function () {
  // Select a random user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Scenario 1: User Authentication Flow
  const token = authenticateUser(user);
  
  if (!token) {
    errorRate.add(1);
    return;
  }

  // Common headers with auth token
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Scenario 2: Dashboard Load
  const dashboardRes = http.get(`${BASE_URL}/api/${user.role}/dashboard`, {
    headers: authHeaders,
  });

  check(dashboardRes, {
    'dashboard loads successfully': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 300,
  });

  apiResponseTime.add(dashboardRes.timings.duration < 300);

  sleep(1); // Think time

  // Scenario 3: Based on user role
  switch (user.role) {
    case 'crew':
      performCrewActions(authHeaders);
      break;
    case 'manager':
      performManagerActions(authHeaders);
      break;
    case 'admin':
      performAdminActions(authHeaders);
      break;
  }

  sleep(Math.random() * 3 + 1); // Random think time between 1-4 seconds
}

function performCrewActions(headers) {
  // Get training progress
  const progressRes = http.get(`${BASE_URL}/api/crew/training/progress`, {
    headers,
  });

  check(progressRes, {
    'training progress loads': (r) => r.status === 200,
  });

  // Submit training completion
  const completeRes = http.post(
    `${BASE_URL}/api/crew/training/complete`,
    JSON.stringify({
      phaseId: Math.floor(Math.random() * 5) + 1,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
    }),
    { headers }
  );

  check(completeRes, {
    'training completion recorded': (r) => r.status === 200 || r.status === 400,
  });

  // Upload document (simulated)
  const uploadRes = http.post(
    `${BASE_URL}/api/crew/documents/upload`,
    JSON.stringify({
      documentType: 'passport',
      fileName: 'passport.pdf',
      fileSize: 1024 * 512, // 512KB
    }),
    { headers }
  );

  check(uploadRes, {
    'document upload successful': (r) => r.status === 200 || r.status === 201,
  });
}

function performManagerActions(headers) {
  // Get crew list
  const crewListRes = http.get(`${BASE_URL}/api/manager/crew`, {
    headers,
  });

  check(crewListRes, {
    'crew list loads': (r) => r.status === 200,
    'crew list not empty': (r) => r.json('crew') !== undefined,
  });

  // Get reports
  const reportsRes = http.get(`${BASE_URL}/api/manager/reports/summary`, {
    headers,
  });

  check(reportsRes, {
    'reports load successfully': (r) => r.status === 200,
  });

  // Send reminder (simulated)
  const reminderRes = http.post(
    `${BASE_URL}/api/manager/crew/reminder`,
    JSON.stringify({
      crewId: 'test-crew-id',
      reminderType: 'training_due',
    }),
    { headers }
  );

  check(reminderRes, {
    'reminder sent': (r) => r.status === 200 || r.status === 201,
  });
}

function performAdminActions(headers) {
  // Get system status
  const statusRes = http.get(`${BASE_URL}/api/admin/system/status`, {
    headers,
  });

  check(statusRes, {
    'system status available': (r) => r.status === 200,
  });

  // Get user list (paginated)
  const usersRes = http.get(`${BASE_URL}/api/admin/users?page=1&limit=50`, {
    headers,
  });

  check(usersRes, {
    'user list loads': (r) => r.status === 200,
    'pagination works': (r) => r.json('totalPages') !== undefined,
  });

  // Get audit logs
  const auditRes = http.get(`${BASE_URL}/api/admin/audit-logs?limit=100`, {
    headers,
  });

  check(auditRes, {
    'audit logs accessible': (r) => r.status === 200,
  });
}

// Stress test scenario - sudden spike
export function stressTest() {
  const user = testUsers[0];
  const token = authenticateUser(user);

  if (!token) return;

  // Rapid fire requests
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/api/crew/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}

// Soak test scenario - sustained load
export function soakTest() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const token = authenticateUser(user);

  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Simulate real user behavior with various actions
  const actions = [
    () => http.get(`${BASE_URL}/api/${user.role}/dashboard`, { headers }),
    () => http.get(`${BASE_URL}/api/${user.role}/profile`, { headers }),
    () => http.get(`${BASE_URL}/api/notifications`, { headers }),
    () => http.post(`${BASE_URL}/api/activity/log`, JSON.stringify({ action: 'page_view' }), { headers }),
  ];

  // Perform random action
  const action = actions[Math.floor(Math.random() * actions.length)];
  const res = action();

  check(res, {
    'request successful': (r) => r.status < 400,
  });

  sleep(Math.random() * 5 + 5); // 5-10 seconds between actions
}

// Spike test scenario
export function spikeTest() {
  // This scenario is used to test how the system handles sudden traffic spikes
  const spikeDuration = '30s';
  const spikeUsers = 500;

  if (__ITER === 0) {
    console.log(`Starting spike test: ${spikeUsers} users for ${spikeDuration}`);
  }

  // Execute default scenario
  exports.default();
}

// Breakpoint test - find the breaking point
export function breakpointTest() {
  // Gradually increase load until system breaks
  const user = testUsers[0];
  const token = authenticateUser(user);

  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  // Heavy operation - multiple concurrent requests
  const batch = [];
  for (let i = 0; i < 5; i++) {
    batch.push(['GET', `${BASE_URL}/api/crew/dashboard`, null, { headers }]);
  }

  const responses = http.batch(batch);
  
  const allSuccessful = responses.every(res => res.status === 200);
  check(responses[0], {
    'batch requests successful': () => allSuccessful,
  });
}

// Database performance test
export function databaseTest() {
  const user = testUsers[0];
  const token = authenticateUser(user);

  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test database-heavy operations
  
  // 1. Complex query
  const searchRes = http.get(
    `${BASE_URL}/api/search?q=test&filters={"status":"active","role":"crew"}&sort=created_at&limit=100`,
    { headers }
  );

  check(searchRes, {
    'complex search completes': (r) => r.status === 200,
    'search response time acceptable': (r) => r.timings.duration < 1000,
  });

  // 2. Aggregation query
  const statsRes = http.get(
    `${BASE_URL}/api/statistics/training?groupBy=company&dateRange=30d`,
    { headers }
  );

  check(statsRes, {
    'statistics query completes': (r) => r.status === 200,
    'stats response time acceptable': (r) => r.timings.duration < 2000,
  });

  // 3. Bulk operation
  const bulkData = Array(50).fill().map((_, i) => ({
    action: 'update_progress',
    userId: `user-${i}`,
    progress: Math.random() * 100,
  }));

  const bulkRes = http.post(
    `${BASE_URL}/api/bulk/operations`,
    JSON.stringify({ operations: bulkData }),
    { headers }
  );

  check(bulkRes, {
    'bulk operation completes': (r) => r.status === 200,
    'bulk operation time reasonable': (r) => r.timings.duration < 5000,
  });
}

// API endpoint performance test
export function apiEndpointTest() {
  const endpoints = [
    { method: 'GET', path: '/api/health', expectedTime: 100 },
    { method: 'GET', path: '/api/status', expectedTime: 100 },
    { method: 'POST', path: '/api/auth/verify-token', expectedTime: 200 },
    { method: 'GET', path: '/api/crew/profile', expectedTime: 300 },
    { method: 'GET', path: '/api/manager/dashboard', expectedTime: 500 },
    { method: 'GET', path: '/api/admin/metrics', expectedTime: 1000 },
  ];

  const user = testUsers[0];
  const token = authenticateUser(user);

  endpoints.forEach(endpoint => {
    const options = endpoint.requiresAuth && token ? {
      headers: { 'Authorization': `Bearer ${token}` }
    } : {};

    const res = http[endpoint.method.toLowerCase()](
      `${BASE_URL}${endpoint.path}`,
      endpoint.method === 'POST' ? '{}' : null,
      options
    );

    check(res, {
      [`${endpoint.path} responds`]: (r) => r.status < 500,
      [`${endpoint.path} performance`]: (r) => r.timings.duration < endpoint.expectedTime,
    });
  });
}

// Teardown function
export function teardown(data) {
  console.log('Test completed. Start time:', data.startTime);
  console.log('End time:', new Date());
}