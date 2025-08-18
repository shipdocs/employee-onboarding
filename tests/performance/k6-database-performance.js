/**
 * k6 Database Performance Testing
 * Tests for database query performance and optimization
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics for database operations
const dbQueryDuration = new Trend('db_query_duration');
const dbConnectionTime = new Trend('db_connection_time');
const dbErrorRate = new Rate('db_error_rate');
const slowQueries = new Counter('slow_queries');
const dbTransactionDuration = new Trend('db_transaction_duration');

// Test configuration
export const options = {
  scenarios: {
    // Test read-heavy operations
    read_operations: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      exec: 'testReadOperations',
    },
    // Test write operations
    write_operations: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '2m', target: 5 },
      ],
      preAllocatedVUs: 50,
      exec: 'testWriteOperations',
    },
    // Test complex queries
    complex_queries: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'testComplexQueries',
    },
    // Test transaction performance
    transactions: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 10,
      exec: 'testTransactions',
    },
  },
  thresholds: {
    'db_query_duration{query_type:simple}': ['p(95)<100', 'p(99)<200'],
    'db_query_duration{query_type:complex}': ['p(95)<1000', 'p(99)<2000'],
    'db_query_duration{query_type:aggregation}': ['p(95)<2000', 'p(99)<5000'],
    'db_transaction_duration': ['p(95)<3000', 'p(99)<5000'],
    'db_error_rate': ['rate<0.01'], // Less than 1% error rate
    'slow_queries': ['count<100'], // Less than 100 slow queries
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper to authenticate and get token
function getAuthToken() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'test@example.com',
      password: 'TestPassword123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  return loginRes.status === 200 ? loginRes.json('token') : null;
}

// Helper to make database query requests
function makeDbRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = { headers };
  
  let response;
  const startTime = new Date();
  
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${endpoint}`, JSON.stringify(body), params);
  }
  
  const duration = new Date() - startTime;
  
  // Extract query type from response headers or endpoint
  const queryType = response.headers['X-Query-Type'] || 'simple';
  dbQueryDuration.add(duration, { query_type: queryType });
  
  // Check for slow queries (>1000ms)
  if (duration > 1000) {
    slowQueries.add(1);
  }
  
  // Track errors
  dbErrorRate.add(response.status >= 500);
  
  return response;
}

// Test read operations
export function testReadOperations() {
  const token = getAuthToken();
  
  group('Database Read Operations', () => {
    // Simple SELECT query
    group('Simple Queries', () => {
      const userRes = makeDbRequest('/api/db-test/user/123', 'GET', null, token);
      check(userRes, {
        'user fetch successful': (r) => r.status === 200,
        'user data returned': (r) => r.json('user') !== undefined,
      });

      // Multiple record fetch
      const usersRes = makeDbRequest('/api/db-test/users?limit=10', 'GET', null, token);
      check(usersRes, {
        'users list successful': (r) => r.status === 200,
        'users array returned': (r) => Array.isArray(r.json('users')),
      });
    });

    // Queries with JOINs
    group('Join Queries', () => {
      const profileRes = makeDbRequest('/api/db-test/user-profile/123', 'GET', null, token);
      check(profileRes, {
        'profile with joins successful': (r) => r.status === 200,
        'joined data present': (r) => r.json('profile.company') !== undefined,
      });

      // Multiple joins
      const fullDataRes = makeDbRequest('/api/db-test/crew-full-data/123', 'GET', null, token);
      check(fullDataRes, {
        'complex joins successful': (r) => r.status === 200,
      });
    });

    // Queries with filtering and sorting
    group('Filtered Queries', () => {
      const filteredRes = makeDbRequest(
        '/api/db-test/crew?status=active&role=officer&sort=created_at&order=desc&limit=20',
        'GET',
        null,
        token
      );
      check(filteredRes, {
        'filtered query successful': (r) => r.status === 200,
        'pagination info present': (r) => r.json('totalCount') !== undefined,
      });
    });

    // Full-text search
    group('Search Queries', () => {
      const searchRes = makeDbRequest(
        '/api/db-test/search?q=maritime+safety&type=all&limit=50',
        'GET',
        null,
        token
      );
      check(searchRes, {
        'search successful': (r) => r.status === 200,
        'search results returned': (r) => r.json('results') !== undefined,
      });
    });
  });
}

// Test write operations
export function testWriteOperations() {
  const token = getAuthToken();
  
  group('Database Write Operations', () => {
    // INSERT operations
    group('Insert Operations', () => {
      const newUser = {
        email: `test${Date.now()}@example.com`,
        name: 'Test User',
        role: 'crew',
      };
      
      const insertRes = makeDbRequest('/api/db-test/user', 'POST', newUser, token);
      check(insertRes, {
        'insert successful': (r) => r.status === 201,
        'new ID returned': (r) => r.json('id') !== undefined,
      });
    });

    // UPDATE operations
    group('Update Operations', () => {
      const updateData = {
        status: 'active',
        lastLogin: new Date().toISOString(),
      };
      
      const updateRes = makeDbRequest('/api/db-test/user/123', 'PUT', updateData, token);
      check(updateRes, {
        'update successful': (r) => r.status === 200,
        'rows affected': (r) => r.json('affected') > 0,
      });

      // Bulk update
      const bulkUpdateRes = makeDbRequest('/api/db-test/bulk-update', 'POST', {
        filter: { status: 'pending' },
        update: { status: 'active' },
      }, token);
      check(bulkUpdateRes, {
        'bulk update successful': (r) => r.status === 200,
      });
    });

    // UPSERT operations
    group('Upsert Operations', () => {
      const upsertData = {
        email: 'upsert@example.com',
        name: 'Upsert Test',
        status: 'active',
      };
      
      const upsertRes = makeDbRequest('/api/db-test/user/upsert', 'POST', upsertData, token);
      check(upsertRes, {
        'upsert successful': (r) => r.status === 200 || r.status === 201,
      });
    });
  });
}

// Test complex queries
export function testComplexQueries() {
  const token = getAuthToken();
  
  group('Complex Database Queries', () => {
    // Aggregation queries
    group('Aggregation Queries', () => {
      const statsRes = makeDbRequest(
        '/api/db-test/statistics/training-completion?groupBy=company,month',
        'GET',
        null,
        token
      );
      check(statsRes, {
        'aggregation successful': (r) => r.status === 200,
        'statistics returned': (r) => r.json('stats') !== undefined,
      });

      // Complex aggregation with multiple metrics
      const metricsRes = makeDbRequest(
        '/api/db-test/metrics/overview?metrics=avg_score,completion_rate,time_to_complete',
        'GET',
        null,
        token
      );
      check(metricsRes, {
        'metrics calculation successful': (r) => r.status === 200,
      });
    });

    // Recursive queries (e.g., organizational hierarchy)
    group('Recursive Queries', () => {
      const hierarchyRes = makeDbRequest(
        '/api/db-test/organization/hierarchy?rootId=1',
        'GET',
        null,
        token
      );
      check(hierarchyRes, {
        'recursive query successful': (r) => r.status === 200,
        'hierarchy structure returned': (r) => r.json('hierarchy') !== undefined,
      });
    });

    // Window functions
    group('Window Function Queries', () => {
      const rankingRes = makeDbRequest(
        '/api/db-test/rankings/crew-performance?period=month',
        'GET',
        null,
        token
      );
      check(rankingRes, {
        'window function successful': (r) => r.status === 200,
        'rankings returned': (r) => Array.isArray(r.json('rankings')),
      });
    });

    // Geospatial queries (if applicable)
    group('Geospatial Queries', () => {
      const nearbyRes = makeDbRequest(
        '/api/db-test/ports/nearby?lat=51.5074&lng=-0.1278&radius=100',
        'GET',
        null,
        token
      );
      check(nearbyRes, {
        'geospatial query successful': (r) => r.status === 200,
      });
    });
  });
}

// Test transaction performance
export function testTransactions() {
  const token = getAuthToken();
  
  group('Database Transactions', () => {
    // Simple transaction
    group('Simple Transaction', () => {
      const startTime = new Date();
      
      const transactionRes = makeDbRequest('/api/db-test/transaction/simple', 'POST', {
        operations: [
          { type: 'insert', table: 'users', data: { email: `tx${Date.now()}@example.com` } },
          { type: 'update', table: 'statistics', data: { userCount: '+1' } },
        ],
      }, token);
      
      const duration = new Date() - startTime;
      dbTransactionDuration.add(duration);
      
      check(transactionRes, {
        'transaction successful': (r) => r.status === 200,
        'transaction committed': (r) => r.json('committed') === true,
      });
    });

    // Complex transaction with multiple operations
    group('Complex Transaction', () => {
      const startTime = new Date();
      
      const complexTxRes = makeDbRequest('/api/db-test/transaction/onboarding', 'POST', {
        userId: '123',
        operations: [
          'create_training_records',
          'assign_default_permissions',
          'send_welcome_notification',
          'update_company_stats',
        ],
      }, token);
      
      const duration = new Date() - startTime;
      dbTransactionDuration.add(duration);
      
      check(complexTxRes, {
        'complex transaction successful': (r) => r.status === 200,
        'all operations completed': (r) => r.json('completedOperations') === 4,
      });
    });

    // Transaction with rollback scenario
    group('Transaction Rollback', () => {
      const rollbackRes = makeDbRequest('/api/db-test/transaction/with-error', 'POST', {
        simulateError: true,
      }, token);
      
      check(rollbackRes, {
        'rollback handled correctly': (r) => r.status === 400 || r.status === 500,
        'rollback message present': (r) => r.json('error').includes('rolled back'),
      });
    });
  });
}

// Test connection pooling
export function testConnectionPooling() {
  const token = getAuthToken();
  
  group('Connection Pool Performance', () => {
    // Burst of concurrent requests
    const batch = [];
    for (let i = 0; i < 50; i++) {
      batch.push(['GET', `${BASE_URL}/api/db-test/connection-test`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      }]);
    }
    
    const startTime = new Date();
    const responses = http.batch(batch);
    const totalTime = new Date() - startTime;
    
    const avgConnectionTime = totalTime / responses.length;
    dbConnectionTime.add(avgConnectionTime);
    
    const allSuccessful = responses.every(r => r.status === 200);
    check(responses[0], {
      'connection pool handles burst': () => allSuccessful,
      'average connection time acceptable': () => avgConnectionTime < 100,
    });
  });
}

// Test query optimization
export function testQueryOptimization() {
  const token = getAuthToken();
  
  group('Query Optimization Tests', () => {
    // Test indexed vs non-indexed queries
    group('Index Performance', () => {
      // Query using index
      const indexedRes = makeDbRequest(
        '/api/db-test/user-by-email?email=test@example.com',
        'GET',
        null,
        token
      );
      
      // Query without index (simulated)
      const nonIndexedRes = makeDbRequest(
        '/api/db-test/user-by-metadata?key=custom_field&value=test',
        'GET',
        null,
        token
      );
      
      check(indexedRes, {
        'indexed query fast': (r) => r.timings.duration < 50,
      });
      
      check(nonIndexedRes, {
        'non-indexed query slower': (r) => r.timings.duration > indexedRes.timings.duration,
      });
    });

    // Test N+1 query problem
    group('N+1 Query Prevention', () => {
      // Bad: N+1 queries
      const n1Res = makeDbRequest(
        '/api/db-test/users-with-details?method=n1',
        'GET',
        null,
        token
      );
      
      // Good: Optimized with joins
      const optimizedRes = makeDbRequest(
        '/api/db-test/users-with-details?method=optimized',
        'GET',
        null,
        token
      );
      
      check(optimizedRes, {
        'optimized query faster': (r) => r.timings.duration < n1Res.timings.duration * 0.5,
      });
    });

    // Test query plan effectiveness
    group('Query Plan Analysis', () => {
      const explainRes = makeDbRequest(
        '/api/db-test/explain?query=complex_report',
        'GET',
        null,
        token
      );
      
      check(explainRes, {
        'query plan available': (r) => r.status === 200,
        'using indexes': (r) => r.json('plan').includes('Index Scan'),
        'no sequential scans': (r) => !r.json('plan').includes('Seq Scan'),
      });
    });
  });
}

// Test database under load
export function testDatabaseLoad() {
  const token = getAuthToken();
  
  group('Database Load Testing', () => {
    // Simulate realistic mixed workload
    const operations = [
      { weight: 0.7, fn: () => makeDbRequest('/api/db-test/random-read', 'GET', null, token) },
      { weight: 0.2, fn: () => makeDbRequest('/api/db-test/random-write', 'POST', { data: 'test' }, token) },
      { weight: 0.1, fn: () => makeDbRequest('/api/db-test/complex-query', 'GET', null, token) },
    ];
    
    // Select operation based on weight
    const random = Math.random();
    let cumWeight = 0;
    for (const op of operations) {
      cumWeight += op.weight;
      if (random <= cumWeight) {
        const res = op.fn();
        check(res, {
          'operation successful under load': (r) => r.status < 500,
        });
        break;
      }
    }
  });
}