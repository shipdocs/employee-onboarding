# Monitoring Guide

This guide provides comprehensive instructions for monitoring the Maritime Onboarding System, including metrics collection, alerting, dashboards, and troubleshooting procedures.

## Monitoring Overview

### Monitoring Stack
- **Application Monitoring**: Vercel Analytics
- **Error Tracking**: Sentry
- **Database Monitoring**: Supabase Dashboard
- **Uptime Monitoring**: Pingdom/UptimeRobot
- **Custom Metrics**: Internal dashboards
- **Log Aggregation**: Vercel Logs

### Key Metrics
- Application performance (Core Web Vitals)
- API response times and error rates
- Database performance and connections
- User activity and business metrics
- Security events and anomalies
- Infrastructure health

## Application Monitoring

### Vercel Analytics

#### Setup
```javascript
// app/layout.js or _app.js
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

#### Key Metrics
- **Page Views**: Track user engagement
- **Unique Visitors**: Monitor user growth
- **Page Load Time**: Ensure fast experience
- **Core Web Vitals**: LCP, FID, CLS scores
- **Browser/Device**: Understand user base

#### Custom Events
```javascript
// Track custom events
import { track } from '@vercel/analytics';

// Track user actions
track('Certificate Generated', {
  userId: user.id,
  certificateType: 'standard',
  vessel: user.vessel_assignment
});

// Track business metrics
track('Training Completed', {
  phase: 3,
  duration: completionTime,
  score: quizScore
});
```

### Performance Monitoring

#### Core Web Vitals
Monitor these key metrics:
- **LCP** (Largest Contentful Paint): < 2.5s (good)
- **FID** (First Input Delay): < 100ms (good)
- **CLS** (Cumulative Layout Shift): < 0.1 (good)

#### Performance Budget
```javascript
// performance.config.js
export const performanceBudget = {
  'bundle-size': {
    main: 200, // KB
    vendor: 300, // KB
  },
  'loading-time': {
    'first-paint': 1000, // ms
    'first-contentful-paint': 1500, // ms
    'largest-contentful-paint': 2500, // ms
  },
  'runtime': {
    'time-to-interactive': 3000, // ms
    'max-fid': 100, // ms
  }
};
```

## Error Tracking

### Sentry Configuration

#### Setup
```javascript
// lib/sentry.js
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter out non-critical errors
    if (event.level === 'warning') {
      return null;
    }
    
    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    
    return event;
  },
});
```

#### Error Capture
```javascript
// Automatic error capture
app.use(Sentry.Handlers.errorHandler());

// Manual error capture
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'certificate-generation',
    },
    extra: {
      userId: user.id,
      attemptNumber: retryCount,
    },
  });
  throw error;
}

// Capture messages
Sentry.captureMessage('Unusual activity detected', 'warning', {
  tags: { type: 'security' },
  extra: { details: suspiciousActivity },
});
```

#### Alert Rules
Configure alerts in Sentry:
- Error rate spike (> 1% in 5 minutes)
- New error types
- High-frequency errors
- Performance regression
- Security-related errors

## Database Monitoring

### Supabase Metrics

#### Key Metrics Dashboard
Monitor via Supabase Dashboard → Reports:
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_database_size(current_database());

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### Custom Monitoring Views
```sql
-- Create monitoring schema
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Training activity monitor
CREATE OR REPLACE VIEW monitoring.training_activity AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as sessions_started,
  COUNT(*) FILTER (WHERE status = 'completed') as sessions_completed,
  AVG(completion_percentage) as avg_completion
FROM training_sessions
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- System health metrics
CREATE OR REPLACE VIEW monitoring.system_health AS
SELECT 
  (SELECT count(*) FROM pg_stat_activity) as active_connections,
  (SELECT count(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  (SELECT count(*) FROM certificates WHERE created_at > NOW() - INTERVAL '24 hours') as certificates_24h,
  (SELECT count(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '1 hour' AND action LIKE '%ERROR%') as errors_last_hour,
  (SELECT pg_database_size(current_database())) as database_size_bytes;
```

### Database Alerts

#### Connection Pool Monitoring
```sql
-- Alert when connections near limit
CREATE OR REPLACE FUNCTION monitoring.check_connection_limit()
RETURNS TABLE(
  current_connections int,
  max_connections int,
  usage_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    count(*)::int as current_connections,
    setting::int as max_connections,
    ROUND((count(*)::numeric / setting::numeric) * 100, 2) as usage_percentage
  FROM pg_stat_activity, pg_settings
  WHERE name = 'max_connections'
  GROUP BY setting;
END;
$$ LANGUAGE plpgsql;
```

#### Table Bloat Monitoring
```sql
-- Monitor table bloat
CREATE OR REPLACE VIEW monitoring.table_bloat AS
SELECT 
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as bloat_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY bloat_percentage DESC;
```

## API Monitoring

### Endpoint Health Checks

#### Health Check Endpoints
```javascript
// api/health/basic.js
export default async function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version
  });
}

// api/health/detailed.js
export default async function handler(req, res) {
  const health = {
    status: 'healthy',
    checks: {},
    timestamp: new Date().toISOString()
  };
  
  // Database check
  try {
    const start = Date.now();
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    health.checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - start,
      error: error?.message
    };
  } catch (e) {
    health.checks.database = {
      status: 'unhealthy',
      error: e.message
    };
  }
  
  // Storage check
  try {
    const start = Date.now();
    const { error } = await supabase.storage
      .from('certificates')
      .list('', { limit: 1 });
    
    health.checks.storage = {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - start
    };
  } catch (e) {
    health.checks.storage = {
      status: 'unhealthy',
      error: e.message
    };
  }
  
  // Determine overall health
  const unhealthyChecks = Object.values(health.checks)
    .filter(check => check.status === 'unhealthy');
  
  if (unhealthyChecks.length > 0) {
    health.status = 'degraded';
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
}
```

### Response Time Monitoring
```javascript
// middleware/responseTime.js
export function responseTimeMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.url.split('?')[0];
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request:', {
        path,
        method: req.method,
        duration,
        status: res.statusCode
      });
    }
    
    // Track metrics
    trackMetric('api.response_time', duration, {
      path,
      method: req.method,
      status: res.statusCode
    });
  });
  
  next();
}
```

### Rate Limit Monitoring
```javascript
// Track rate limit hits
export function rateLimitMonitoring(req, res, next) {
  const rateLimitRemaining = res.getHeader('X-RateLimit-Remaining');
  const rateLimitLimit = res.getHeader('X-RateLimit-Limit');
  
  if (rateLimitRemaining !== undefined) {
    const usage = (rateLimitLimit - rateLimitRemaining) / rateLimitLimit;
    
    if (usage > 0.8) {
      console.warn('High rate limit usage:', {
        ip: req.ip,
        path: req.path,
        usage: `${usage * 100}%`
      });
    }
    
    trackMetric('api.rate_limit_usage', usage, {
      path: req.path
    });
  }
  
  next();
}
```

## Business Metrics

### Custom Metrics Collection

#### Metric Definitions
```javascript
// lib/metrics.js
export const businessMetrics = {
  // User metrics
  'user.registered': 'New user registration',
  'user.activated': 'User activated account',
  'user.login': 'User login event',
  
  // Training metrics
  'training.started': 'Training phase started',
  'training.completed': 'Training phase completed',
  'training.item_completed': 'Training item completed',
  
  // Certificate metrics
  'certificate.generated': 'Certificate generated',
  'certificate.downloaded': 'Certificate downloaded',
  'certificate.regenerated': 'Certificate regenerated',
  
  // Business metrics
  'crew.onboarded': 'Crew member fully onboarded',
  'vessel.compliance': 'Vessel reached compliance',
};

// Track metric
export async function trackBusinessMetric(metric, value = 1, tags = {}) {
  const payload = {
    metric,
    value,
    tags: {
      ...tags,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  };
  
  // Send to metrics endpoint
  await fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  // Also log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Metric tracked:', payload);
  }
}
```

#### Metrics Dashboard
```sql
-- Daily active users
CREATE OR REPLACE VIEW monitoring.daily_active_users AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT user_id) FILTER (WHERE action = 'LOGIN') as logins,
  COUNT(DISTINCT user_id) FILTER (WHERE action LIKE 'TRAINING_%') as training_active
FROM audit_log
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Training funnel
CREATE OR REPLACE VIEW monitoring.training_funnel AS
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE phase >= 1) as started_phase_1,
  COUNT(DISTINCT user_id) FILTER (WHERE phase >= 2) as started_phase_2,
  COUNT(DISTINCT user_id) FILTER (WHERE phase >= 3) as started_phase_3,
  COUNT(DISTINCT user_id) FILTER (WHERE phase = 3 AND status = 'completed') as completed_all
FROM training_sessions;

-- Certificate metrics
CREATE OR REPLACE VIEW monitoring.certificate_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as certificates_issued,
  COUNT(DISTINCT user_id) as unique_recipients,
  COUNT(*) FILTER (WHERE certificate_type = 'standard') as standard_certs,
  COUNT(*) FILTER (WHERE certificate_type = 'intro_kapitein') as kapitein_certs
FROM certificates
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Alerting

### Alert Configuration

#### Alert Channels
```javascript
// lib/alerting.js
export class AlertManager {
  constructor() {
    this.channels = {
      email: new EmailAlertChannel(),
      slack: new SlackAlertChannel(),
      pagerduty: new PagerDutyAlertChannel()
    };
  }
  
  async sendAlert(alert) {
    const channels = this.getChannelsForSeverity(alert.severity);
    
    for (const channel of channels) {
      try {
        await this.channels[channel].send(alert);
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }
  
  getChannelsForSeverity(severity) {
    switch (severity) {
      case 'critical':
        return ['email', 'slack', 'pagerduty'];
      case 'high':
        return ['email', 'slack'];
      case 'medium':
        return ['slack'];
      default:
        return ['slack'];
    }
  }
}
```

#### Alert Rules
```javascript
// config/alerts.js
export const alertRules = [
  {
    name: 'High Error Rate',
    condition: 'error_rate > 0.01', // 1%
    window: '5m',
    severity: 'high',
    message: 'Error rate exceeded 1% in the last 5 minutes'
  },
  {
    name: 'Database Connection Pool Exhausted',
    condition: 'db_connections >= db_max_connections * 0.9',
    window: '1m',
    severity: 'critical',
    message: 'Database connection pool is at 90% capacity'
  },
  {
    name: 'Slow API Response',
    condition: 'p95_response_time > 3000', // 3 seconds
    window: '5m',
    severity: 'medium',
    message: 'API p95 response time exceeded 3 seconds'
  },
  {
    name: 'Certificate Generation Failure',
    condition: 'certificate_generation_errors > 5',
    window: '15m',
    severity: 'high',
    message: 'More than 5 certificate generation failures in 15 minutes'
  },
  {
    name: 'Storage Quota Warning',
    condition: 'storage_usage > storage_limit * 0.8',
    window: '1h',
    severity: 'medium',
    message: 'Storage usage exceeded 80% of quota'
  }
];
```

### Incident Detection

#### Anomaly Detection
```javascript
// lib/anomalyDetection.js
export class AnomalyDetector {
  constructor() {
    this.baselines = new Map();
  }
  
  async checkForAnomalies(metric, currentValue) {
    const baseline = await this.getBaseline(metric);
    
    if (!baseline) {
      return null;
    }
    
    const deviation = Math.abs(currentValue - baseline.mean) / baseline.stddev;
    
    if (deviation > 3) { // 3 standard deviations
      return {
        metric,
        currentValue,
        expectedRange: {
          min: baseline.mean - 3 * baseline.stddev,
          max: baseline.mean + 3 * baseline.stddev
        },
        severity: deviation > 5 ? 'high' : 'medium',
        message: `${metric} is ${deviation.toFixed(1)} standard deviations from normal`
      };
    }
    
    return null;
  }
  
  async getBaseline(metric) {
    // Get historical data for the same time period
    const historicalData = await this.fetchHistoricalData(metric);
    
    if (historicalData.length < 7) {
      return null; // Not enough data
    }
    
    const mean = historicalData.reduce((a, b) => a + b) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stddev = Math.sqrt(variance);
    
    return { mean, stddev };
  }
}
```

## Dashboards

### Operational Dashboard

#### Real-time Metrics
```javascript
// components/OperationalDashboard.js
export function OperationalDashboard() {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('/api/monitoring/metrics');
      const data = await response.json();
      setMetrics(data);
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        change={metrics.activeUsersChange}
        status={metrics.activeUsersStatus}
      />
      
      <MetricCard
        title="API Response Time"
        value={`${metrics.avgResponseTime}ms`}
        change={metrics.responseTimeChange}
        status={metrics.responseTimeStatus}
      />
      
      <MetricCard
        title="Error Rate"
        value={`${metrics.errorRate}%`}
        change={metrics.errorRateChange}
        status={metrics.errorRateStatus}
      />
      
      <MetricCard
        title="System Health"
        value={metrics.systemHealth}
        status={metrics.systemHealthStatus}
      />
      
      <div className="col-span-full">
        <ResponseTimeChart data={metrics.responseTimeHistory} />
      </div>
      
      <div className="col-span-full">
        <ErrorRateChart data={metrics.errorRateHistory} />
      </div>
    </div>
  );
}
```

### Business Dashboard
```javascript
// components/BusinessDashboard.js
export function BusinessDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Crew Members"
          value={metrics.totalCrew}
          target={metrics.crewTarget}
          period="All Time"
        />
        
        <KPICard
          title="Training Completion Rate"
          value={`${metrics.completionRate}%`}
          target="95%"
          period="Last 30 Days"
        />
        
        <KPICard
          title="Average Time to Complete"
          value={`${metrics.avgCompletionTime} days`}
          target="7 days"
          period="Last 30 Days"
        />
      </div>
      
      <TrainingFunnelChart data={metrics.trainingFunnel} />
      
      <CertificateIssuanceChart data={metrics.certificateData} />
      
      <VesselComplianceTable vessels={metrics.vesselCompliance} />
    </div>
  );
}
```

## Log Management

### Structured Logging

#### Log Format
```javascript
// lib/logger.js
export class Logger {
  constructor(context) {
    this.context = context;
  }
  
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...metadata,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version
    };
    
    console.log(JSON.stringify(logEntry));
    
    // Send to log aggregator
    if (process.env.NODE_ENV === 'production') {
      this.sendToAggregator(logEntry);
    }
  }
  
  info(message, metadata) {
    this.log('info', message, metadata);
  }
  
  warn(message, metadata) {
    this.log('warn', message, metadata);
  }
  
  error(message, error, metadata) {
    this.log('error', message, {
      ...metadata,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    });
  }
}

// Usage
const logger = new Logger('api.auth');
logger.info('User login attempt', { email: user.email });
```

### Log Analysis

#### Common Queries
```bash
# View recent errors
vercel logs --filter error --since 1h

# Track specific user activity
vercel logs --filter "userId=xxx"

# Monitor specific endpoint
vercel logs --filter "path=/api/auth/admin-login"

# Export logs for analysis
vercel logs --since 24h > logs_$(date +%Y%m%d).json
```

## Troubleshooting

### Performance Issues

#### Slow Queries
```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  min_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check query plan
EXPLAIN ANALYZE
SELECT /* your slow query here */;
```

#### High Memory Usage
```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  
  if (usage.heapUsed / usage.heapTotal > 0.9) {
    console.warn('High memory usage detected:', {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  }
}, 60000);
```

### Debugging Production Issues

#### Enable Debug Logging
```javascript
// Temporary debug logging
if (req.headers['x-debug-token'] === process.env.DEBUG_TOKEN) {
  console.log('Debug info:', {
    headers: req.headers,
    body: req.body,
    user: req.user,
    timestamp: new Date().toISOString()
  });
}
```

#### Trace Requests
```javascript
// Request tracing
export function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  
  // Log with trace ID
  console.log(`[${traceId}] ${req.method} ${req.path}`);
  
  next();
}
```

## Best Practices

### Monitoring Guidelines
1. **Set meaningful thresholds** based on baselines
2. **Avoid alert fatigue** with proper severity levels
3. **Document alert runbooks** for each alert type
4. **Regular review** of alerts and thresholds
5. **Test alerting** regularly

### Dashboard Design
1. **Focus on actionable metrics**
2. **Use appropriate visualizations**
3. **Provide context** with comparisons
4. **Keep it simple** and focused
5. **Mobile-friendly** layouts

### Incident Response
1. **Clear escalation paths**
2. **Documented procedures**
3. **Regular drills**
4. **Post-mortem culture**
5. **Continuous improvement**

## Related Documentation
- [Production Deployment](../deployment/production.md) - Production environment
- [Incident Response](../INCIDENT_RESPONSE_PROCEDURES.md) - Incident procedures
- [Performance Optimization](../PERFORMANCE.md) - Performance guide
- [Security Monitoring](../architecture/security.md) - Security procedures