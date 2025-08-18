# Performance Testing with k6

This directory contains performance tests for the Maritime Onboarding System using k6.

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows (using Chocolatey)
   choco install k6
   ```

2. Set up test environment variables:
   ```bash
   export K6_BASE_URL=http://localhost:3000
   export K6_TEST_ENV=development
   ```

## Test Suites

### 1. Load Testing (`k6-load-test.js`)
General load testing with various user scenarios.

```bash
# Run default load test
k6 run k6-load-test.js

# Run with custom VUs and duration
k6 run --vus 50 --duration 10m k6-load-test.js

# Run specific scenario
k6 run k6-load-test.js --env SCENARIO=stress
```

### 2. API Performance Testing (`k6-api-performance.js`)
Focused testing on API endpoint performance.

```bash
# Run API performance tests
k6 run k6-api-performance.js

# Test specific endpoints
k6 run k6-api-performance.js --env ENDPOINTS=auth,crew

# With custom thresholds
k6 run k6-api-performance.js --env MAX_DURATION=500
```

### 3. Database Performance Testing (`k6-database-performance.js`)
Tests for database query performance and optimization.

```bash
# Run database performance tests
k6 run k6-database-performance.js

# Test specific query types
k6 run k6-database-performance.js --env QUERY_TYPES=complex,aggregation

# Monitor slow queries
k6 run k6-database-performance.js --env SLOW_QUERY_THRESHOLD=1000
```

## Running Tests

### Development Environment
```bash
# Basic load test
k6 run --env BASE_URL=http://localhost:3000 k6-load-test.js

# With HTML report
k6 run --out html=report.html k6-load-test.js

# With JSON output for analysis
k6 run --out json=results.json k6-load-test.js
```

### Staging Environment
```bash
# Staging load test with higher load
k6 run --env BASE_URL=https://staging.example.com \
       --env TEST_ENV=staging \
       k6-load-test.js
```

### Production Environment (BE CAREFUL!)
```bash
# Light production smoke test
k6 run --env BASE_URL=https://prod.example.com \
       --env TEST_ENV=production \
       --vus 5 \
       --duration 5m \
       k6-load-test.js
```

## Test Scenarios

### Stress Test
Tests system behavior under extreme load:
```bash
k6 run k6-load-test.js --env SCENARIO=stress
```

### Spike Test
Tests system response to sudden traffic spikes:
```bash
k6 run k6-load-test.js --env SCENARIO=spike
```

### Soak Test
Long-running test to identify memory leaks and degradation:
```bash
k6 run k6-load-test.js --env SCENARIO=soak
```

### Breakpoint Test
Gradually increases load to find system breaking point:
```bash
k6 run k6-load-test.js --env SCENARIO=breakpoint
```

## Monitoring and Analysis

### Real-time Monitoring
```bash
# Use k6 cloud for real-time monitoring (requires account)
k6 cloud k6-load-test.js

# Local real-time metrics
k6 run --out influxdb=http://localhost:8086/k6 k6-load-test.js
```

### Generate Reports
```bash
# HTML report
k6 run --out html=test-report.html k6-load-test.js

# JSON for custom analysis
k6 run --out json=test-results.json k6-load-test.js

# CSV for spreadsheet analysis
k6 run --out csv=test-results.csv k6-load-test.js
```

### Analyze Results
```bash
# Convert JSON results to HTML report
k6 convert test-results.json --output test-report.html

# Extract specific metrics
jq '.metrics.http_req_duration' test-results.json
```

## Performance Thresholds

Default thresholds are configured in each test file:
- `http_req_duration`: 95% of requests under 500ms, 99% under 1s
- `http_req_failed`: Error rate under 10%
- `http_req_waiting`: 95% under 300ms

Custom thresholds can be set:
```bash
k6 run --env THRESHOLD_P95=300 --env THRESHOLD_P99=800 k6-load-test.js
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run k6 performance tests
  uses: grafana/k6-action@v0.2.0
  with:
    filename: tests/performance/k6-load-test.js
    flags: --env BASE_URL=${{ secrets.STAGING_URL }}
```

### Jenkins Example
```groovy
stage('Performance Test') {
    steps {
        sh 'k6 run --out json=performance-results.json tests/performance/k6-load-test.js'
        publishHTML([
            reportDir: '.',
            reportFiles: 'performance-results.json',
            reportName: 'k6 Performance Report'
        ])
    }
}
```

## Best Practices

1. **Start Small**: Begin with low VUs and gradually increase
2. **Monitor Resources**: Watch server CPU, memory, and DB connections
3. **Use Think Time**: Add realistic delays between user actions
4. **Test in Isolation**: Run tests from a separate environment
5. **Baseline First**: Establish performance baselines before changes
6. **Regular Testing**: Run performance tests as part of CI/CD

## Troubleshooting

### High Error Rate
- Check server logs for errors
- Verify test data and authentication
- Reduce VUs to identify threshold

### Inconsistent Results
- Ensure consistent test environment
- Check for other processes using resources
- Use longer test duration for stability

### Connection Errors
- Verify firewall rules
- Check rate limiting settings
- Ensure sufficient connection pool

## Interpreting Results

### Key Metrics
- **http_req_duration**: Total request time
- **http_req_waiting**: Time waiting for response
- **http_req_blocked**: Time blocked before sending
- **http_req_connecting**: Connection establishment time
- **iterations**: Total test iterations completed
- **vus**: Virtual users at any point

### Performance Goals
- **Excellent**: p95 < 200ms
- **Good**: p95 < 500ms  
- **Acceptable**: p95 < 1000ms
- **Poor**: p95 > 1000ms

## Additional Resources
- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://github.com/grafana/k6-examples)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)