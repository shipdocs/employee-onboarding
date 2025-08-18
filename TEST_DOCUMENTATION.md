# 🧪 Maritime Onboarding System - Test Suite Documentation

## Overview
Comprehensive test suite for the Docker-migrated Maritime Onboarding System, covering unit, integration, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                 # Unit tests for individual modules
│   ├── lib/             # Library module tests
│   │   ├── database-direct.test.js    # PostgreSQL client tests
│   │   └── storage-minio.test.js      # MinIO storage tests
│   └── api/             # API endpoint tests
├── integration/         # Integration tests
│   ├── docker-migration.test.js       # Docker migration validation
│   ├── auth/           # Authentication flow tests
│   └── database/       # Database integration tests
├── e2e/                # End-to-end tests
│   ├── docker-system.test.js         # Complete system E2E tests
│   └── onboarding/     # User onboarding flow tests
├── security/           # Security-focused tests
├── performance/        # Performance tests
└── jest.config.js     # Jest configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

## Docker Migration Tests

### Prerequisites
Ensure all Docker services are running:
```bash
docker-compose up -d
```

### Running Docker-Specific Tests

#### Unit Tests for Docker Components
```bash
jest tests/unit/lib/database-direct.test.js
jest tests/unit/lib/storage-minio.test.js
```

#### Integration Tests for Docker Migration
```bash
jest tests/integration/docker-migration.test.js
```

#### E2E Tests for Complete System
```bash
jest tests/e2e/docker-system.test.js
```

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Database Layer | 90% | - |
| Storage Layer | 90% | - |
| API Endpoints | 80% | - |
| Authentication | 95% | - |
| Error Handling | 85% | - |

## Key Test Scenarios

### Database Tests (database-direct.test.js)
- ✅ Connection pooling configuration
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Transaction handling with commit/rollback
- ✅ Error handling and recovery
- ✅ Supabase compatibility layer
- ✅ Query performance logging
- ✅ Connection pool events
- ✅ Helper functions (select, insert, update, delete)

### Storage Tests (storage-minio.test.js)
- ✅ MinIO client configuration
- ✅ Bucket operations (create, exists, delete)
- ✅ File upload with metadata
- ✅ File download and streaming
- ✅ File deletion (single and multiple)
- ✅ File listing with prefixes
- ✅ Presigned URL generation (GET and PUT)
- ✅ Supabase Storage compatibility layer
- ✅ File metadata operations
- ✅ File copy operations

### Integration Tests (docker-migration.test.js)
- ✅ Service health checks (PostgreSQL, MinIO, API, PostgREST, Redis)
- ✅ Database CRUD operations
- ✅ Transaction handling
- ✅ Storage operations (upload, download, list, delete)
- ✅ Presigned URL functionality
- ✅ API endpoint connectivity
- ✅ Rate limiting verification
- ✅ Supabase compatibility layers
- ✅ Docker network communication
- ✅ Environment configuration validation

### E2E Tests (docker-system.test.js)
- ✅ Application loading and React mounting
- ✅ Authentication flow (login form, submission)
- ✅ Database integration (user creation, retrieval)
- ✅ Storage integration (file upload/download)
- ✅ API integration with CORS
- ✅ Performance metrics
- ✅ Concurrent user simulation
- ✅ Error handling (404, API errors, network failures)
- ✅ Security headers and XSS prevention

## Environment Variables for Testing

Create a `.env.test` file:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maritime_test
DB_USER=postgres
DB_PASSWORD=postgres

# Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# API
API_URL=http://localhost:3000
BASE_URL=http://localhost

# Testing
NODE_ENV=test
LOG_LEVEL=error
```

## Mocking Guidelines

### Database Mocking
```javascript
jest.mock('pg');
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};
Pool.mockImplementation(() => mockPool);
```

### Storage Mocking
```javascript
jest.mock('minio');
const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  removeObject: jest.fn(),
  listObjects: jest.fn(),
  presignedGetUrl: jest.fn(),
  presignedPutUrl: jest.fn(),
};
Minio.Client = jest.fn(() => mockMinioClient);
```

### API Mocking
```javascript
jest.mock('node-fetch');
fetch.mockResolvedValue({
  json: async () => ({ data: 'mocked' }),
  status: 200,
  ok: true,
});
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      minio:
        image: minio/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        options: >-
          --health-cmd "curl -f http://localhost:9000/minio/health/live"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

### Docker Test Environment
```dockerfile
# Dockerfile.test
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]
```

Run tests in Docker:
```bash
docker build -t maritime-tests -f Dockerfile.test .
docker run --rm --network maritime_network maritime-tests
```

## Debugging Tests

### Run Single Test
```bash
jest tests/unit/lib/database-direct.test.js --verbose
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/jest tests/unit/lib/database-direct.test.js
```

### With Logs
```bash
DEBUG=* npm test
```

### VSCode Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Performance Testing

### Load Testing
```bash
npm run test:performance
```

### Stress Testing
```bash
jest tests/performance/loadTesting.test.js --testTimeout=60000
```

### Benchmarking
```javascript
console.time('operation');
// ... operation to test
console.timeEnd('operation');
```

## Security Testing

### All Security Tests
```bash
npm run test:security:all
```

### Specific Security Tests
```bash
npm run test:security:xss
npm run test:security:rate-limit
npm run test:security:jwt
npm run test:security:file-upload
npm run test:security:auth
```

## Test Data Management

### Seed Test Data
```javascript
// scripts/seed-test-data.js
const { Pool } = require('pg');
const pool = new Pool(/* config */);

async function seed() {
  await pool.query(`
    INSERT INTO users (email, name, role)
    VALUES 
      ('test1@example.com', 'Test User 1', 'crew'),
      ('test2@example.com', 'Test User 2', 'manager')
  `);
}
```

### Clean Test Data
```javascript
// scripts/clean-test-data.js
async function clean() {
  await pool.query(`
    DELETE FROM users WHERE email LIKE 'test%@example.com'
  `);
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors
```bash
# Check if PostgreSQL is running
docker ps | grep database

# Test connection
docker exec maritime_database psql -U postgres -c "SELECT 1"

# View logs
docker logs maritime_database
```

#### 2. MinIO Connection Errors
```bash
# Check if MinIO is running
docker ps | grep minio

# Test MinIO health
curl http://localhost:9000/minio/health/live

# Access MinIO console
open http://localhost:9001
```

#### 3. Port Conflicts
```bash
# Find process using port
lsof -i :3000
lsof -i :5432
lsof -i :9000

# Kill process
kill -9 <PID>
```

#### 4. Test Timeouts
```javascript
// Increase timeout for specific test
test('long running test', async () => {
  // test code
}, 30000);

// Increase global timeout
jest.setTimeout(30000);
```

#### 5. Memory Issues
```bash
# Run with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run tests sequentially
jest --runInBand
```

## Test Metrics and Reporting

### Coverage Report
```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Coverage summary
cat coverage/coverage-summary.json | jq
```

### Test Results
```bash
# Generate JUnit report
jest --reporters=default --reporters=jest-junit

# Generate HTML report
jest --reporters=default --reporters=jest-html-reporters
```

### Performance Metrics
```javascript
const metrics = {
  duration: Date.now() - startTime,
  memory: process.memoryUsage(),
  cpu: process.cpuUsage(),
};
console.table(metrics);
```

## Best Practices

### 1. Test Naming
```javascript
// Good
it('should return user data when valid ID is provided', ...);

// Bad
it('test user', ...);
```

### 2. Test Isolation
```javascript
beforeEach(() => {
  // Reset state
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup
});
```

### 3. Assertions
```javascript
// Specific assertions
expect(result.status).toBe(200);
expect(result.data.name).toBe('John');

// Not just truthy
expect(result).toBeTruthy(); // Avoid
```

### 4. Async Testing
```javascript
// Proper async handling
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});
```

### 5. Error Testing
```javascript
it('should throw error for invalid input', async () => {
  await expect(
    functionThatThrows()
  ).rejects.toThrow('Expected error message');
});
```

## Contributing Guidelines

1. **Write tests for new features** - No feature without tests
2. **Maintain coverage** - Don't reduce existing coverage
3. **Follow naming conventions** - Descriptive test names
4. **Clean up after tests** - No test pollution
5. **Document complex tests** - Add comments for clarity
6. **Review test failures** - Don't ignore flaky tests

## Test Checklist

- [ ] Unit tests written for new functions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user flows
- [ ] Mocks properly configured
- [ ] Test data cleaned up
- [ ] Coverage meets thresholds
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] Documentation updated

---

**Created:** 2025-08-18
**Status:** ✅ Test Suite Implemented
**Coverage Target:** 80%
**Next Steps:** Run full test suite and measure coverage