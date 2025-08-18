# Performance Benchmarks & Monitoring

## Overview

The Maritime Onboarding System includes comprehensive performance benchmarking and monitoring tools to ensure optimal system performance.

## Tools

### 1. Performance Benchmark Suite (`npm run benchmark`)

A comprehensive benchmark suite that tests:
- **API Performance**: Response times for key endpoints
- **Database Performance**: Query execution times
- **Authentication**: Token verification speed
- **Email Generation**: Template rendering performance
- **File Operations**: Upload/download speeds

#### Running Benchmarks

```bash
npm run benchmark
```

#### Performance Thresholds

| Category | Fast | Acceptable | Slow |
|----------|------|-----------|------|
| API | < 100ms | < 300ms | > 1000ms |
| Database | < 50ms | < 150ms | > 500ms |
| Email | < 500ms | < 2000ms | > 5000ms |
| Auth | < 200ms | < 500ms | > 1500ms |
| File Ops | < 1000ms | < 3000ms | > 10000ms |

#### Output

- Results saved to `.simone/benchmarks/benchmark-{timestamp}.json`
- Latest results always available at `.simone/benchmarks/latest.json`
- Console output shows performance ratings and recommendations

### 2. Real-time Performance Monitor (`npm run monitor`)

Live monitoring dashboard that tracks:
- **System Metrics**: CPU usage, memory usage, uptime
- **API Health**: Endpoint availability and response times
- **Error Tracking**: Real-time error detection
- **Performance Trends**: Historical data analysis

#### Running the Monitor

```bash
npm run monitor
```

#### Features

- Updates every 5 seconds
- Visual indicators for performance status
- Alerts for high resource usage or errors
- Performance grading system (A/B/C)

## Optimization Guidelines

### API Performance

1. **Caching**
   ```javascript
   // Add response caching for frequently accessed data
   const cache = new Map();
   const CACHE_TTL = 60000; // 1 minute
   ```

2. **Query Optimization**
   ```javascript
   // Use select() to limit returned fields
   const users = await supabase
     .from('users')
     .select('id, email, role') // Only needed fields
     .limit(10);
   ```

3. **Pagination**
   ```javascript
   // Implement proper pagination
   const { data, count } = await supabase
     .from('users')
     .select('*', { count: 'exact' })
     .range(offset, offset + limit - 1);
   ```

### Database Performance

1. **Indexes**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_users_role ON users(role);
   CREATE INDEX idx_crew_progress_user_id ON crew_progress(user_id);
   ```

2. **Query Optimization**
   ```javascript
   // Avoid N+1 queries
   const usersWithProgress = await supabase
     .from('users')
     .select(`
       *,
       crew_progress (*)
     `)
     .eq('role', 'crew');
   ```

### Email Performance

1. **Template Caching**
   ```javascript
   const templateCache = new Map();
   
   async function getCachedTemplate(key, generator) {
     if (!templateCache.has(key)) {
       templateCache.set(key, await generator());
     }
     return templateCache.get(key);
   }
   ```

2. **Queue Implementation**
   ```javascript
   // Use email queue for non-critical emails
   await emailQueue.enqueue(emailData, {
     priority: 'low',
     delay: 5000
   });
   ```

## Monitoring Best Practices

### Development

1. Run benchmarks before major changes
2. Use monitor during development to catch performance issues early
3. Set up performance budgets in CI/CD

### Production

1. Set up alerts for performance degradation
2. Monitor trends over time
3. Regular benchmark runs to track performance

### Performance Budgets

```javascript
// Example performance budget configuration
const performanceBudget = {
  api: {
    p95: 300,  // 95th percentile should be under 300ms
    p99: 500   // 99th percentile should be under 500ms
  },
  database: {
    p95: 100,
    p99: 200
  }
};
```

## Troubleshooting

### High Memory Usage

1. Check for memory leaks in long-running processes
2. Implement proper cleanup in API handlers
3. Use streaming for large file operations

### Slow API Response

1. Check database query performance
2. Implement caching where appropriate
3. Use CDN for static assets

### Database Performance

1. Analyze slow queries with EXPLAIN
2. Add appropriate indexes
3. Consider query result caching

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Performance Benchmarks
  run: npm run benchmark
  
- name: Check Performance
  run: |
    node -e "
      const results = require('./.simone/benchmarks/latest.json');
      const slow = results.benchmarks.filter(b => b.rating === 'slow').length;
      if (slow > 3) {
        console.error('Too many slow benchmarks:', slow);
        process.exit(1);
      }
    "
```

## Performance Goals

### Target Metrics

- **API Response Time**: < 200ms average
- **Database Queries**: < 100ms for simple queries
- **Page Load Time**: < 3 seconds
- **Time to Interactive**: < 5 seconds

### Monitoring SLOs

- **Availability**: 99.9% uptime
- **Response Time**: 95% of requests < 300ms
- **Error Rate**: < 1% of requests