/**
 * k6 Performance Testing Configuration
 * Central configuration for all k6 performance tests
 */

export const testConfigs = {
  // Development environment testing
  development: {
    baseUrl: 'http://localhost:3000',
    thresholds: {
      http_req_duration: ['p(95)<1000'], // 95% of requests under 1 second
      http_req_failed: ['rate<0.1'],     // Error rate under 10%
    },
    stages: [
      { duration: '1m', target: 10 },   // Ramp up to 10 users
      { duration: '3m', target: 10 },   // Stay at 10 users
      { duration: '1m', target: 0 },    // Ramp down
    ],
  },

  // Staging environment testing
  staging: {
    baseUrl: 'https://staging.maritime-onboarding.com',
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<1000'],
      http_req_failed: ['rate<0.05'],
      http_req_waiting: ['p(95)<400'],
    },
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '10m', target: 100 },
      { duration: '5m', target: 0 },
    ],
  },

  // Production environment testing (careful!)
  production: {
    baseUrl: 'https://onboarding.maritime-system.com',
    thresholds: {
      http_req_duration: ['p(95)<300', 'p(99)<500'],
      http_req_failed: ['rate<0.01'],
      http_req_waiting: ['p(95)<200'],
    },
    stages: [
      { duration: '5m', target: 20 },   // Very gradual ramp-up
      { duration: '10m', target: 50 },
      { duration: '5m', target: 0 },
    ],
  },

  // Stress testing configuration
  stress: {
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.2'],
    },
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 400 },
      { duration: '10m', target: 500 },
      { duration: '5m', target: 0 },
    ],
  },

  // Spike testing configuration
  spike: {
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.3'],
    },
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 500 }, // Sudden spike
      { duration: '3m', target: 500 },  // Sustained high load
      { duration: '30s', target: 10 },  // Quick drop
      { duration: '2m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },

  // Soak testing configuration (long-running)
  soak: {
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.05'],
    },
    stages: [
      { duration: '5m', target: 50 },
      { duration: '4h', target: 50 },  // 4 hours sustained load
      { duration: '5m', target: 0 },
    ],
  },
};

// Test user profiles
export const userProfiles = {
  // Crew member typical behavior
  crew: {
    actions: [
      { name: 'viewDashboard', weight: 0.3 },
      { name: 'viewTraining', weight: 0.25 },
      { name: 'submitProgress', weight: 0.2 },
      { name: 'uploadDocument', weight: 0.15 },
      { name: 'viewProfile', weight: 0.1 },
    ],
    thinkTime: { min: 2, max: 5 }, // seconds between actions
  },

  // Manager typical behavior
  manager: {
    actions: [
      { name: 'viewDashboard', weight: 0.25 },
      { name: 'viewCrewList', weight: 0.3 },
      { name: 'viewReports', weight: 0.2 },
      { name: 'sendReminder', weight: 0.15 },
      { name: 'exportData', weight: 0.1 },
    ],
    thinkTime: { min: 3, max: 8 },
  },

  // Admin typical behavior
  admin: {
    actions: [
      { name: 'viewSystemStatus', weight: 0.3 },
      { name: 'viewAuditLogs', weight: 0.25 },
      { name: 'manageUsers', weight: 0.2 },
      { name: 'viewMetrics', weight: 0.15 },
      { name: 'configureSystem', weight: 0.1 },
    ],
    thinkTime: { min: 5, max: 15 },
  },
};

// API endpoint configurations
export const endpoints = {
  // Authentication endpoints
  auth: {
    login: { method: 'POST', path: '/api/auth/login', rateLimit: 5 },
    logout: { method: 'POST', path: '/api/auth/logout', rateLimit: 10 },
    refresh: { method: 'POST', path: '/api/auth/refresh', rateLimit: 10 },
    magicLink: { method: 'POST', path: '/api/auth/magic-link', rateLimit: 5 },
  },

  // Crew endpoints
  crew: {
    dashboard: { method: 'GET', path: '/api/crew/dashboard', cache: true },
    profile: { method: 'GET', path: '/api/crew/profile', cache: true },
    training: { method: 'GET', path: '/api/crew/training', cache: false },
    documents: { method: 'GET', path: '/api/crew/documents', cache: false },
  },

  // Manager endpoints
  manager: {
    dashboard: { method: 'GET', path: '/api/manager/dashboard', cache: true },
    crew: { method: 'GET', path: '/api/manager/crew', cache: false },
    reports: { method: 'GET', path: '/api/manager/reports', cache: false },
  },

  // Admin endpoints
  admin: {
    dashboard: { method: 'GET', path: '/api/admin/dashboard', cache: true },
    users: { method: 'GET', path: '/api/admin/users', cache: false },
    audit: { method: 'GET', path: '/api/admin/audit-logs', cache: false },
    metrics: { method: 'GET', path: '/api/admin/metrics', cache: true },
  },
};

// Performance budgets
export const performanceBudgets = {
  critical: {
    maxDuration: 200,  // milliseconds
    endpoints: ['/api/health', '/api/status', '/api/auth/verify-token'],
  },
  fast: {
    maxDuration: 500,
    endpoints: ['/api/crew/dashboard', '/api/manager/dashboard', '/api/auth/login'],
  },
  normal: {
    maxDuration: 1000,
    endpoints: ['/api/crew/training', '/api/manager/crew', '/api/search'],
  },
  slow: {
    maxDuration: 3000,
    endpoints: ['/api/reports/generate', '/api/admin/metrics', '/api/bulk/operations'],
  },
};

// Custom metrics configuration
export const customMetrics = {
  // Business metrics
  businessMetrics: [
    'login_success_rate',
    'onboarding_completion_rate',
    'document_upload_success_rate',
    'training_submission_rate',
  ],

  // Technical metrics
  technicalMetrics: [
    'api_response_time',
    'database_query_time',
    'cache_hit_rate',
    'concurrent_users',
  ],

  // Error metrics
  errorMetrics: [
    'api_error_rate',
    'validation_error_rate',
    'auth_failure_rate',
    'timeout_rate',
  ],
};

// Export helper functions
export function getConfig(environment = 'development') {
  return testConfigs[environment] || testConfigs.development;
}

export function getRandomUser() {
  const users = [
    { email: 'crew1@test.com', password: 'Test123!', role: 'crew' },
    { email: 'crew2@test.com', password: 'Test123!', role: 'crew' },
    { email: 'manager1@test.com', password: 'Test123!', role: 'manager' },
    { email: 'admin@test.com', password: 'Test123!', role: 'admin' },
  ];
  return users[Math.floor(Math.random() * users.length)];
}

export function selectActionByWeight(actions) {
  const random = Math.random();
  let cumWeight = 0;
  
  for (const action of actions) {
    cumWeight += action.weight;
    if (random <= cumWeight) {
      return action.name;
    }
  }
  
  return actions[actions.length - 1].name;
}

export function getThinkTime(profile) {
  const { min, max } = profile.thinkTime;
  return Math.random() * (max - min) + min;
}