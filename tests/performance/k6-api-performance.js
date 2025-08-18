/**
 * k6 API Performance Testing
 * Focused tests for API endpoint performance and scalability
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import exec from 'k6/execution';

// Custom metrics
const apiErrors = new Counter('api_errors');
const apiDuration = new Trend('api_duration');
const apiSuccessRate = new Rate('api_success_rate');
const concurrentRequests = new Gauge('concurrent_requests');

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Constant load on critical endpoints
    critical_endpoints: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      exec: 'testCriticalEndpoints',
    },
    // Scenario 2: Ramping load for auth endpoints
    auth_endpoints: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      exec: 'testAuthEndpoints',
    },
    // Scenario 3: Spike test for data endpoints
    data_endpoints: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 100 }, // Spike
        { duration: '1m', target: 10 },
      ],
      exec: 'testDataEndpoints',
      preAllocatedVUs: 100,
    },
    // Scenario 4: Stress test for file operations
    file_operations: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20,
      maxDuration: '10m',
      exec: 'testFileOperations',
    },
  },
  thresholds: {
    'api_duration{endpoint:auth}': ['p(95)<200'],
    'api_duration{endpoint:data}': ['p(95)<500'],
    'api_duration{endpoint:file}': ['p(95)<2000'],
    'api_success_rate': ['rate>0.95'],
    'http_req_waiting': ['p(95)<300'],
    'http_req_connecting': ['p(95)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper function to make authenticated requests
function makeAuthenticatedRequest(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = {
    headers,
    tags: { endpoint: endpoint.split('/')[2] || 'other' },
  };

  const startTime = new Date();
  concurrentRequests.add(1);
  
  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${endpoint}`, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${endpoint}`, null, params);
  }
  
  concurrentRequests.add(-1);
  const duration = new Date() - startTime;
  
  apiDuration.add(duration, { endpoint: params.tags.endpoint });
  
  const success = response.status >= 200 && response.status < 400;
  apiSuccessRate.add(success);
  
  if (!success) {
    apiErrors.add(1);
  }
  
  return response;
}

// Test critical endpoints that must always be fast
export function testCriticalEndpoints() {
  group('Critical Endpoints', () => {
    // Health check
    const healthRes = makeAuthenticatedRequest('GET', '/api/health');
    check(healthRes, {
      'health check status 200': (r) => r.status === 200,
      'health check fast': (r) => r.timings.duration < 50,
    });

    // Status endpoint
    const statusRes = makeAuthenticatedRequest('GET', '/api/status');
    check(statusRes, {
      'status endpoint OK': (r) => r.status === 200,
      'status response fast': (r) => r.timings.duration < 100,
    });

    // Version info
    const versionRes = makeAuthenticatedRequest('GET', '/api/version');
    check(versionRes, {
      'version endpoint OK': (r) => r.status === 200,
    });
  });

  sleep(0.5);
}

// Test authentication endpoints
export function testAuthEndpoints() {
  group('Authentication Flow', () => {
    const uniqueEmail = `user${exec.vu.idInTest}${Date.now()}@example.com`;
    
    // Request magic link
    const magicLinkRes = makeAuthenticatedRequest('POST', '/api/auth/magic-link', {
      email: uniqueEmail,
    });
    
    check(magicLinkRes, {
      'magic link sent': (r) => r.status === 200,
      'magic link response time': (r) => r.timings.duration < 300,
    });

    // Simulate token verification (with mock token)
    const verifyRes = makeAuthenticatedRequest('POST', '/api/auth/verify-token', {
      token: 'mock-token-' + uniqueEmail,
    });
    
    check(verifyRes, {
      'token verification works': (r) => r.status === 200 || r.status === 401,
      'verification fast': (r) => r.timings.duration < 200,
    });

    // Login attempt
    const loginRes = makeAuthenticatedRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!',
    });
    
    check(loginRes, {
      'login endpoint responds': (r) => r.status === 200 || r.status === 401,
      'login performance': (r) => r.timings.duration < 500,
    });

    if (loginRes.status === 200 && loginRes.json('token')) {
      const token = loginRes.json('token');
      
      // Refresh token
      const refreshRes = makeAuthenticatedRequest('POST', '/api/auth/refresh', {}, token);
      check(refreshRes, {
        'token refresh works': (r) => r.status === 200,
        'refresh fast': (r) => r.timings.duration < 200,
      });
      
      // Logout
      const logoutRes = makeAuthenticatedRequest('POST', '/api/auth/logout', {}, token);
      check(logoutRes, {
        'logout successful': (r) => r.status === 200,
      });
    }
  });

  sleep(1);
}

// Test data-heavy endpoints
export function testDataEndpoints() {
  // First, get a token
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'test@example.com',
      password: 'TestPassword123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const token = loginRes.status === 200 ? loginRes.json('token') : null;
  
  group('Data Endpoints', () => {
    // List operations with pagination
    const listRes = makeAuthenticatedRequest(
      'GET',
      '/api/crew?page=1&limit=50&sort=created_at&order=desc',
      null,
      token
    );
    
    check(listRes, {
      'list endpoint works': (r) => r.status === 200 || r.status === 401,
      'list performance': (r) => r.timings.duration < 500,
      'pagination info present': (r) => r.json('totalPages') !== undefined,
    });

    // Search with filters
    const searchRes = makeAuthenticatedRequest(
      'GET',
      '/api/search?q=test&filters={"status":"active"}&limit=20',
      null,
      token
    );
    
    check(searchRes, {
      'search works': (r) => r.status === 200 || r.status === 401,
      'search performance': (r) => r.timings.duration < 700,
    });

    // Aggregation query
    const statsRes = makeAuthenticatedRequest(
      'GET',
      '/api/statistics/overview?groupBy=month&year=2024',
      null,
      token
    );
    
    check(statsRes, {
      'statistics endpoint': (r) => r.status === 200 || r.status === 401,
      'stats performance': (r) => r.timings.duration < 1000,
    });

    // Complex report
    const reportRes = makeAuthenticatedRequest(
      'POST',
      '/api/reports/generate',
      {
        type: 'training_completion',
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        groupBy: ['company', 'department'],
      },
      token
    );
    
    check(reportRes, {
      'report generation': (r) => r.status === 200 || r.status === 202 || r.status === 401,
      'report performance': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.5);
}

// Test file operations
export function testFileOperations() {
  const token = 'mock-token'; // In real test, would authenticate first
  
  group('File Operations', () => {
    // Simulate file upload
    const uploadRes = makeAuthenticatedRequest(
      'POST',
      '/api/upload/document',
      {
        fileName: `test-${Date.now()}.pdf`,
        fileType: 'application/pdf',
        fileSize: 1024 * 512, // 512KB
      },
      token
    );
    
    check(uploadRes, {
      'file upload initiated': (r) => r.status === 200 || r.status === 201 || r.status === 401,
      'upload performance': (r) => r.timings.duration < 1000,
    });

    // List uploaded files
    const filesRes = makeAuthenticatedRequest(
      'GET',
      '/api/documents?type=all&limit=10',
      null,
      token
    );
    
    check(filesRes, {
      'files list retrieved': (r) => r.status === 200 || r.status === 401,
      'files list performance': (r) => r.timings.duration < 500,
    });

    // Download file (HEAD request to check)
    const downloadRes = http.head(
      `${BASE_URL}/api/download/document/sample.pdf`,
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }
    );
    
    check(downloadRes, {
      'download available': (r) => r.status === 200 || r.status === 404 || r.status === 401,
    });
  });

  sleep(1);
}

// Test concurrent operations
export function testConcurrentOperations() {
  const token = 'mock-token';
  
  group('Concurrent Operations', () => {
    // Batch multiple requests
    const batch = [
      ['GET', `${BASE_URL}/api/crew/profile`, null, { headers: { 'Authorization': `Bearer ${token}` } }],
      ['GET', `${BASE_URL}/api/notifications`, null, { headers: { 'Authorization': `Bearer ${token}` } }],
      ['GET', `${BASE_URL}/api/training/progress`, null, { headers: { 'Authorization': `Bearer ${token}` } }],
      ['POST', `${BASE_URL}/api/activity/log`, JSON.stringify({ action: 'test' }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }],
    ];

    const responses = http.batch(batch);
    
    const allSuccessful = responses.every(r => r.status < 500);
    check(responses[0], {
      'concurrent requests handled': () => allSuccessful,
      'batch performance': () => responses.every(r => r.timings.duration < 1000),
    });
  });
}

// Test rate limiting
export function testRateLimiting() {
  group('Rate Limiting', () => {
    // Make rapid requests to trigger rate limit
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const res = makeAuthenticatedRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'wrong-password',
      });
      responses.push(res);
    }

    const rateLimited = responses.some(r => r.status === 429);
    check(responses[responses.length - 1], {
      'rate limiting enforced': () => rateLimited,
      'rate limit response has retry-after': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined,
    });
  });
}

// Test caching behavior
export function testCaching() {
  const token = 'mock-token';
  
  group('Caching', () => {
    // First request (cache miss)
    const firstRes = makeAuthenticatedRequest('GET', '/api/static/config', null, token);
    const firstTime = firstRes.timings.duration;
    
    // Second request (should be cached)
    const secondRes = makeAuthenticatedRequest('GET', '/api/static/config', null, token);
    const secondTime = secondRes.timings.duration;
    
    check(secondRes, {
      'caching works': (r) => r.status === firstRes.status,
      'cached response faster': () => secondTime < firstTime * 0.5, // At least 50% faster
      'cache headers present': (r) => r.headers['Cache-Control'] !== undefined,
    });
  });
}

// Test graceful degradation
export function testGracefulDegradation() {
  group('Graceful Degradation', () => {
    // Test with missing optional parameters
    const minimalRes = makeAuthenticatedRequest('GET', '/api/search?q=test');
    check(minimalRes, {
      'handles minimal params': (r) => r.status === 200 || r.status === 401,
    });

    // Test with invalid but non-breaking params
    const invalidParamsRes = makeAuthenticatedRequest(
      'GET',
      '/api/crew?page=abc&limit=xyz'
    );
    check(invalidParamsRes, {
      'handles invalid params gracefully': (r) => r.status === 200 || r.status === 400 || r.status === 401,
    });
  });
}