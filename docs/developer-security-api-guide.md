/**
@page developer-security-api-guide Developer Security API Guide

@tableofcontents

# 🔧 Security Alert System - Developer Guide

Technical documentation for developers working with the security alert system architecture, APIs, and integration.

## 🏗️ System Architecture

### Core Components

```mermaid
graph TB
    A[SecurityMonitoringService] --> B[SecurityAlertNotifier]
    A --> C[SecurityConfigService]
    B --> C
    C --> D[Database Tables]
    B --> E[Email Service]
    F[Admin API] --> C
    G[Frontend] --> F
```

#### SecurityMonitoringService
- **Purpose**: Real-time security metric collection and analysis
- **Location**: `lib/security/SecurityMonitoringService.js`
- **Responsibilities**:
  - Collect security metrics every 60 seconds
  - Compare metrics against configurable thresholds
  - Generate alerts when thresholds are exceeded
  - Emit security events for external integrations

#### SecurityConfigService
- **Purpose**: Database-driven configuration management
- **Location**: `lib/security/SecurityConfigService.js`
- **Responsibilities**:
  - Manage alert configuration (rate limits, templates)
  - Handle alert recipients and notification preferences
  - Store and retrieve alert thresholds
  - Persist alert history with resolution tracking

#### SecurityAlertNotifier
- **Purpose**: Multi-channel alert notification system
- **Location**: `lib/security/SecurityAlertNotifier.js`
- **Responsibilities**:
  - Send email notifications with rate limiting
  - Generate HTML and text email content
  - Manage notification history and cooldowns
  - Provide fallback notification mechanisms

## 📊 Database Schema

### Tables Overview

```sql
-- Configuration storage
security_alert_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE,
    config_value JSONB,
    description TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Notification recipients
security_alert_recipients (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50), -- 'critical', 'warning', 'info'
    recipient_type VARCHAR(50), -- 'email', 'slack', 'webhook'
    recipient_value TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Alert thresholds
security_alert_thresholds (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) UNIQUE,
    warning_threshold INTEGER,
    critical_threshold INTEGER,
    is_active BOOLEAN DEFAULT true,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Alert history
security_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) UNIQUE,
    alert_type VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value INTEGER,
    threshold_value INTEGER,
    message TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)

```sql
-- Admin-only access to configuration
CREATE POLICY security_alert_config_admin_only ON security_alert_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admin and manager access to alerts
CREATE POLICY security_alerts_admin_manager_view ON security_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );
```

## 🔌 API Endpoints

### Authentication

All admin endpoints require authentication and admin role:

```javascript
// Middleware validation
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### Configuration Management

#### Get All Configuration
```http
GET /api/admin/security-config
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "rate_limiting": {
        "maxEmailsPerHour": 10,
        "cooldownMinutes": 15
      },
      "email_templates": {
        "critical": "🚨 CRITICAL Security Alert",
        "warning": "⚠️ Security Warning"
      }
    },
    "recipients": {
      "critical": {
        "email": ["security@company.com", "devops@company.com"]
      }
    },
    "thresholds": {
      "authFailures": {
        "warning": 5,
        "critical": 10
      }
    },
    "stats": {
      "totalAlerts": 45,
      "criticalAlerts": 3,
      "unresolvedAlerts": 5
    }
  }
}
```

#### Update Configuration
```http
PUT /api/admin/security-config/:configKey
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "configValue": {
    "maxEmailsPerHour": 20,
    "cooldownMinutes": 10
  },
  "description": "Increased email limits for high-traffic periods"
}
```

### Recipients Management

#### Add Alert Recipient
```http
POST /api/admin/security-config/recipients
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "alertType": "critical",
  "recipientType": "email",
  "recipientValue": "security@company.com"
}
```

#### Remove Alert Recipient
```http
DELETE /api/admin/security-config/recipients/:id
Authorization: Bearer <jwt_token>
```

### Threshold Management

#### Update Alert Threshold
```http
PUT /api/admin/security-config/thresholds/:metricName
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "warningThreshold": 5,
  "criticalThreshold": 10
}
```

### Alert Management

#### List Alerts with Filtering
```http
GET /api/admin/security-config/alerts?page=1&limit=50&alertType=critical&isResolved=false
Authorization: Bearer <jwt_token>
```

#### Resolve Alert
```http
PUT /api/admin/security-config/alerts/:alertId/resolve
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "resolutionNotes": "Investigated - false positive from load testing"
}
```

## 🔧 Integration Guide

### Adding New Security Metrics

1. **Define the metric** in SecurityMonitoringService:

```javascript
// lib/security/SecurityMonitoringService.js
collectMetrics() {
  const metrics = {
    // Existing metrics...
    newSecurityMetric: this.calculateNewMetric(),
  };
  
  this.metrics.set(Date.now(), metrics);
}

calculateNewMetric() {
  // Your metric calculation logic
  return metricValue;
}
```

2. **Add threshold configuration**:

```sql
INSERT INTO security_alert_thresholds (metric_name, warning_threshold, critical_threshold)
VALUES ('newSecurityMetric', 5, 10);
```

3. **Update email templates** (optional):

```javascript
// Add to SecurityAlertNotifier.js
getRecommendedActions(metric) {
  const actions = {
    // Existing actions...
    newSecurityMetric: [
      'Check new security metric logs',
      'Verify system configuration',
      'Contact security team if issues persist'
    ]
  };
  
  return actions[metric] || defaultActions;
}
```

### Custom Notification Channels

#### Slack Integration Example

```javascript
// lib/security/SlackNotifier.js
class SlackNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendAlert(alert) {
    const payload = {
      text: `🚨 Security Alert: ${alert.message}`,
      attachments: [{
        color: alert.type === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Value', value: alert.value, short: true },
          { title: 'Threshold', value: alert.threshold, short: true }
        ]
      }]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}
```

#### Webhook Integration

```javascript
// lib/security/WebhookNotifier.js
class WebhookNotifier {
  async sendAlert(alert, webhookUrl) {
    const payload = {
      event: 'security_alert',
      alert: {
        id: alert.id,
        type: alert.type,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        message: alert.message,
        timestamp: alert.timestamp
      },
      metadata: {
        source: 'maritime-onboarding-system',
        version: '2.0.1'
      }
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Security-Alert': 'true'
      },
      body: JSON.stringify(payload)
    });
  }
}
```

### Event-Driven Integration

#### Listening to Security Events

```javascript
// Your integration code
const { SecurityMonitoringService } = require('./lib/security/SecurityMonitoringService');

const securityMonitor = new SecurityMonitoringService();

// Listen for security alerts
securityMonitor.on('security-alert', async (alert) => {
  console.log('Security alert received:', alert);
  
  // Custom handling
  if (alert.type === 'critical') {
    await notifySecurityTeam(alert);
    await createIncidentTicket(alert);
  }
});

// Listen for trend analysis
securityMonitor.on('trends-analyzed', (trends) => {
  console.log('Security trends:', trends);
  
  // Update dashboards, send reports, etc.
});
```

## 🧪 Testing

### Unit Tests

```javascript
// tests/security/SecurityConfigService.test.js
const { SecurityConfigService } = require('../../lib/security/SecurityConfigService');

describe('SecurityConfigService', () => {
  let service;

  beforeEach(() => {
    service = new SecurityConfigService();
  });

  test('should update configuration', async () => {
    const result = await service.updateConfig(
      'test_key',
      { value: 'test' },
      1,
      'Test configuration'
    );
    
    expect(result.success).toBe(true);
  });

  test('should get alert recipients', async () => {
    const result = await service.getAlertRecipients('critical');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

### Integration Tests

```javascript
// tests/integration/security-alerts.test.js
const request = require('supertest');
const app = require('../../app');

describe('Security Alert API', () => {
  test('should create alert recipient', async () => {
    const response = await request(app)
      .post('/api/admin/security-config/recipients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        alertType: 'critical',
        recipientType: 'email',
        recipientValue: 'test@example.com'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Load Testing

```javascript
// tests/load/security-monitoring.test.js
const { SecurityMonitoringService } = require('../../lib/security/SecurityMonitoringService');

describe('Security Monitoring Load Test', () => {
  test('should handle high metric volume', async () => {
    const service = new SecurityMonitoringService();
    
    // Simulate high load
    for (let i = 0; i < 1000; i++) {
      service.recordMetric('testMetric', Math.random() * 100);
    }
    
    const metrics = service.getLatestMetrics();
    expect(metrics).toBeDefined();
  });
});
```

## 🔍 Debugging

### Logging Configuration

```javascript
// lib/security/SecurityMonitoringService.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security-alerts.log' }),
    new winston.transports.Console()
  ]
});

// Usage in security services
logger.info('Security alert generated', { alert });
logger.error('Failed to send email notification', { error, alert });
```

### Debug Endpoints

```javascript
// Debug endpoints (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/security/metrics', (req, res) => {
    res.json(securityMonitor.getLatestMetrics());
  });

  app.post('/debug/security/test-alert', async (req, res) => {
    const testAlert = {
      id: `test-${Date.now()}`,
      type: 'warning',
      metric: 'testMetric',
      value: 100,
      threshold: 50,
      message: 'Test alert for debugging',
      timestamp: new Date().toISOString()
    };

    await alertNotifier.sendAlertEmail(testAlert);
    res.json({ success: true, alert: testAlert });
  });
}
```

## 📈 Performance Optimization

### Caching Strategy

```javascript
// lib/security/SecurityConfigService.js
class SecurityConfigService {
  constructor() {
    this.configCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  async getConfig(configKey = null) {
    await this.refreshCacheIfNeeded();
    
    if (configKey) {
      return this.configCache.get(configKey);
    }
    
    return Object.fromEntries(this.configCache);
  }
}
```

### Database Optimization

```sql
-- Indexes for performance
CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(is_resolved);
CREATE INDEX idx_security_alert_recipients_type ON security_alert_recipients(alert_type);
```

## 🚀 Deployment Considerations

### Environment Variables

```bash
# Required for email notifications
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=alerts@company.com
SMTP_PASSWORD=secure_password

# Security configuration
SECURITY_EMAIL=security@company.com
DEVOPS_EMAIL=devops@company.com
GRAFANA_DASHBOARD_URL=https://grafana.company.com/security

# Database configuration (if not using Supabase)
DATABASE_URL=postgresql://user:pass@localhost:5432/maritime_db

# Supabase configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Docker Configuration

```dockerfile
# Dockerfile additions for security monitoring
FROM node:18-alpine

# Install security scanning tools
RUN apk add --no-cache \
    clamav \
    clamav-daemon \
    freshclam

# Copy security configuration
COPY lib/security/ /app/lib/security/
COPY database/migrations/add-security-alert-config.sql /app/database/migrations/

# Set up security monitoring
RUN npm install --production
EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# k8s/security-monitoring.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maritime-security-monitor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: maritime-security-monitor
  template:
    metadata:
      labels:
        app: maritime-security-monitor
    spec:
      containers:
      - name: security-monitor
        image: maritime-onboarding:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: SECURITY_MONITORING_ENABLED
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 🔧 Advanced Customization

### Custom Alert Processors

```javascript
// lib/security/processors/CustomAlertProcessor.js
class CustomAlertProcessor {
  constructor(config) {
    this.config = config;
  }

  async processAlert(alert) {
    // Custom processing logic
    if (alert.metric === 'customMetric') {
      return this.handleCustomMetric(alert);
    }

    return this.defaultProcessing(alert);
  }

  async handleCustomMetric(alert) {
    // Specific handling for custom metrics
    const enrichedAlert = {
      ...alert,
      customData: await this.enrichAlertData(alert),
      priority: this.calculatePriority(alert)
    };

    return enrichedAlert;
  }
}
```

### Plugin Architecture

```javascript
// lib/security/plugins/SecurityPlugin.js
class SecurityPlugin {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.enabled = config.enabled || false;
  }

  async initialize() {
    // Plugin initialization
  }

  async processAlert(alert) {
    // Plugin-specific alert processing
    throw new Error('processAlert must be implemented by plugin');
  }

  async cleanup() {
    // Plugin cleanup
  }
}

// Example plugin implementation
class SIEMIntegrationPlugin extends SecurityPlugin {
  async processAlert(alert) {
    if (this.enabled) {
      await this.sendToSIEM(alert);
    }
  }

  async sendToSIEM(alert) {
    // Send alert to SIEM system
    await fetch(this.config.siemEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: alert.timestamp,
        severity: alert.type,
        source: 'maritime-onboarding',
        event: alert
      })
    });
  }
}
```

## 📊 Monitoring and Observability

### Prometheus Metrics

```javascript
// lib/security/metrics/PrometheusMetrics.js
const prometheus = require('prom-client');

class SecurityMetrics {
  constructor() {
    this.alertsTotal = new prometheus.Counter({
      name: 'security_alerts_total',
      help: 'Total number of security alerts',
      labelNames: ['type', 'metric']
    });

    this.alertsResolutionTime = new prometheus.Histogram({
      name: 'security_alerts_resolution_time_seconds',
      help: 'Time to resolve security alerts',
      labelNames: ['type']
    });

    this.emailsSent = new prometheus.Counter({
      name: 'security_emails_sent_total',
      help: 'Total number of security alert emails sent',
      labelNames: ['type', 'status']
    });
  }

  recordAlert(alert) {
    this.alertsTotal.inc({ type: alert.type, metric: alert.metric });
  }

  recordEmailSent(alert, status) {
    this.emailsSent.inc({ type: alert.type, status });
  }
}
```

### Health Checks

```javascript
// lib/security/health/SecurityHealthCheck.js
class SecurityHealthCheck {
  constructor(services) {
    this.services = services;
  }

  async checkHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkEmailService(),
      this.checkMonitoringService(),
      this.checkConfigService()
    ]);

    const results = checks.map((check, index) => ({
      service: ['database', 'email', 'monitoring', 'config'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason.message
    }));

    const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      services: results
    };
  }

  async checkDatabase() {
    // Test database connectivity
    const result = await this.services.configService.getConfig('health_check');
    return { connected: true, latency: Date.now() };
  }

  async checkEmailService() {
    // Test email service
    return { configured: !!process.env.SMTP_HOST };
  }
}
```

## 🔒 Security Best Practices

### Input Validation

```javascript
// lib/security/validation/SecurityValidation.js
const Joi = require('joi');

const alertRecipientSchema = Joi.object({
  alertType: Joi.string().valid('critical', 'warning', 'info').required(),
  recipientType: Joi.string().valid('email', 'slack', 'webhook').required(),
  recipientValue: Joi.alternatives().conditional('recipientType', {
    is: 'email',
    then: Joi.string().email().required(),
    otherwise: Joi.string().uri().required()
  })
});

const thresholdSchema = Joi.object({
  warningThreshold: Joi.number().integer().min(0).required(),
  criticalThreshold: Joi.number().integer().min(0).required()
}).custom((value, helpers) => {
  if (value.warningThreshold >= value.criticalThreshold) {
    return helpers.error('custom.thresholdOrder');
  }
  return value;
}, 'Threshold validation');
```

### Rate Limiting

```javascript
// lib/security/middleware/RateLimiting.js
const rateLimit = require('express-rate-limit');

const securityConfigRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many security configuration requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user?.id || req.ip;
  }
});

module.exports = { securityConfigRateLimit };
```

## 🔗 Related Documentation

- [User Security Guide](user-security-guide.md)
- [Admin Security Configuration Guide](admin-security-config-guide.md)
- [Security Implementation Guide](security-guide.md)
- [API Documentation](api-documentation.md)
- [Deployment Guide](deployment-guide.md)

*/
