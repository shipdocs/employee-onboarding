/**
@page admin-security-config-guide Admin Security Configuration Guide

@tableofcontents

# 👑 Security Alert Configuration - Admin Guide

This guide covers the complete configuration and management of the security alert system for administrators and managers.

## 🔧 System Overview

### Database-Driven Configuration

The security alert system uses a database-driven approach for maximum flexibility:
- **GUI-configurable settings** via admin interface
- **Real-time configuration updates** without system restart
- **Persistent alert storage** with resolution tracking
- **Role-based access control** for configuration management

### Key Components

- **SecurityConfigService**: Database configuration management
- **SecurityAlertNotifier**: Email notification system
- **SecurityMonitoringService**: Real-time monitoring and detection
- **Admin API**: RESTful configuration endpoints

## 🚀 Getting Started

### Prerequisites

1. **Admin Access**: You need admin role to configure security settings
2. **Database Migration**: Ensure security alert tables are created
3. **Email Service**: Configure SMTP for email notifications

### Initial Setup

```bash
# Run database migration
npm run migrate:security-alerts

# Verify tables are created
psql -d your_database -c "\dt security_*"
```

## ⚙️ Configuration Management

### Accessing Configuration

Navigate to **Admin** → **Security Settings** → **Alert Configuration**

### General Settings

#### Rate Limiting Configuration
```javascript
// API: PUT /api/admin/security-config/rate_limiting
{
  "configValue": {
    "maxEmailsPerHour": 10,
    "cooldownMinutes": 15,
    "maxAlertsPerMetric": 5
  },
  "description": "Email rate limiting to prevent spam"
}
```

#### Email Templates
```javascript
// API: PUT /api/admin/security-config/email_templates
{
  "configValue": {
    "critical": "🚨 CRITICAL Security Alert - Maritime Onboarding",
    "warning": "⚠️ Security Warning - Maritime Onboarding",
    "info": "ℹ️ Security Info - Maritime Onboarding"
  },
  "description": "Email subject templates for different alert types"
}
```

## 📧 Email Recipients Management

### Adding Recipients

#### Via Admin Interface
1. Go to **Security Settings** → **Recipients**
2. Click **Add Recipient**
3. Configure:
   - **Alert Type**: critical, warning, info
   - **Recipient Type**: email, slack, webhook
   - **Recipient Value**: email address or endpoint URL

#### Via API
```javascript
// POST /api/admin/security-config/recipients
{
  "alertType": "critical",
  "recipientType": "email", 
  "recipientValue": "security@company.com"
}
```

### Recipient Types

#### Email Recipients
```javascript
// Critical alerts
{
  "alertType": "critical",
  "recipientType": "email",
  "recipientValue": "security@company.com"
}

// Warning alerts  
{
  "alertType": "warning",
  "recipientType": "email",
  "recipientValue": "devops@company.com"
}
```

#### Slack Integration (Future)
```javascript
{
  "alertType": "critical",
  "recipientType": "slack",
  "recipientValue": "#security-alerts"
}
```

#### Webhook Notifications (Future)
```javascript
{
  "alertType": "critical", 
  "recipientType": "webhook",
  "recipientValue": "https://your-webhook.com/security-alerts"
}
```

### Managing Recipients

#### List Recipients
```bash
# API: GET /api/admin/security-config/recipients
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/admin/security-config/recipients"
```

#### Remove Recipients
```bash
# API: DELETE /api/admin/security-config/recipients/:id
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/admin/security-config/recipients/123"
```

## 📊 Alert Thresholds Configuration

### Security Metrics

The system monitors these security metrics:

#### Authentication Metrics
- **authFailures**: Failed login attempts
- **suspiciousSessions**: Unusual session patterns
- **mfaFailures**: Multi-factor authentication failures

#### Network Security
- **rateLimitViolations**: Excessive request rates
- **ipBlacklist**: Blocked IP address attempts
- **geoAnomalies**: Unusual geographic access patterns

#### Application Security  
- **xssAttempts**: Cross-site scripting attempts
- **sqlInjection**: SQL injection attempts
- **malwareDetections**: Malicious file uploads

### Setting Thresholds

#### Via Admin Interface
1. Navigate to **Security Settings** → **Thresholds**
2. Select a metric (e.g., "authFailures")
3. Configure:
   - **Warning Threshold**: 5 (triggers warning alert)
   - **Critical Threshold**: 10 (triggers critical alert)

#### Via API
```javascript
// PUT /api/admin/security-config/thresholds/authFailures
{
  "warningThreshold": 5,
  "criticalThreshold": 10
}
```

### Recommended Thresholds

```javascript
// Production environment recommendations
const recommendedThresholds = {
  authFailures: { warning: 5, critical: 10 },
  rateLimitViolations: { warning: 100, critical: 500 },
  xssAttempts: { warning: 1, critical: 5 },
  malwareDetections: { warning: 1, critical: 3 },
  suspiciousSessions: { warning: 3, critical: 10 }
};
```

## 📈 Alert Management

### Viewing Alerts

#### Dashboard Access
- **URL**: `/admin/security-dashboard`
- **Permissions**: Admin or Manager role required

#### Alert List
```bash
# API: GET /api/admin/security-config/alerts
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/admin/security-config/alerts?page=1&limit=50"
```

#### Filtering Alerts
```javascript
// Filter by alert type
GET /api/admin/security-config/alerts?alertType=critical

// Filter by metric
GET /api/admin/security-config/alerts?metricName=authFailures

// Filter by date range
GET /api/admin/security-config/alerts?startDate=2024-01-01&endDate=2024-01-31

// Filter by resolution status
GET /api/admin/security-config/alerts?isResolved=false
```

### Resolving Alerts

#### Mark as Resolved
```javascript
// PUT /api/admin/security-config/alerts/:alertId/resolve
{
  "resolutionNotes": "Investigated - false positive from legitimate user testing"
}
```

#### Bulk Resolution
```bash
# Resolve multiple alerts (custom script)
for alertId in 123 124 125; do
  curl -X PUT -H "Authorization: Bearer $TOKEN" \
    -d '{"resolutionNotes": "Bulk resolved after investigation"}' \
    "https://your-domain.com/api/admin/security-config/alerts/$alertId/resolve"
done
```

## 🔍 Monitoring & Analytics

### Dashboard Metrics

The security dashboard displays:
- **Total alerts** in selected time period
- **Critical vs warning** alert breakdown
- **Unresolved alerts** requiring attention
- **Alert trends** over time
- **Top security metrics** by alert count

### Real-time Monitoring

```javascript
// Get dashboard statistics
// GET /api/admin/security-config/dashboard-stats?timeRange=24h
{
  "totalAlerts": 45,
  "criticalAlerts": 3,
  "warningAlerts": 42,
  "resolvedAlerts": 40,
  "unresolvedAlerts": 5,
  "alertsByMetric": {
    "authFailures": 15,
    "rateLimitViolations": 20,
    "xssAttempts": 10
  }
}
```

### Email Statistics

Monitor email notification performance:
```javascript
// Check email sending statistics
const stats = await alertNotifier.getEmailStats();
console.log(stats);
// {
//   emailsSentLastHour: 5,
//   maxEmailsPerHour: 10,
//   remainingEmails: 5,
//   lastAlertTimes: { authFailures: 1642234567890 }
// }
```

## 🛠️ Advanced Configuration

### Environment Variables

Fallback configuration via environment variables:
```bash
# Email recipients (fallback)
SECURITY_EMAIL=security@company.com
DEVOPS_EMAIL=devops@company.com

# Dashboard URL
GRAFANA_DASHBOARD_URL=https://grafana.company.com/security-dashboard

# Rate limiting (fallback)
SECURITY_MAX_EMAILS_PER_HOUR=10
SECURITY_COOLDOWN_MINUTES=15
```

### Database Direct Access

For advanced configuration, you can directly modify the database:

```sql
-- View current configuration
SELECT * FROM security_alert_config;

-- Update configuration
UPDATE security_alert_config 
SET config_value = '{"maxEmailsPerHour": 20}'
WHERE config_key = 'rate_limiting';

-- View recipients
SELECT * FROM security_alert_recipients WHERE is_active = true;

-- View thresholds
SELECT * FROM security_alert_thresholds WHERE is_active = true;
```

## 🔒 Security Considerations

### Access Control

- **Admin-only configuration**: Only users with admin role can modify settings
- **Manager view access**: Managers can view alerts but not modify configuration
- **Audit logging**: All configuration changes are logged with user ID and timestamp

### Data Protection

- **Encrypted storage**: Sensitive configuration data is encrypted at rest
- **Secure transmission**: All API communications use HTTPS
- **Rate limiting**: API endpoints have rate limiting to prevent abuse

## 🚨 Troubleshooting

### Common Issues

#### Emails Not Sending
1. **Check SMTP configuration** in environment variables
2. **Verify recipients** are configured for alert type
3. **Check rate limiting** - may be suppressed due to limits
4. **Review logs** for email service errors

#### Alerts Not Triggering
1. **Verify thresholds** are set correctly
2. **Check monitoring service** is running
3. **Review metric collection** in SecurityMonitoringService
4. **Validate database connectivity**

#### Database Connection Issues
1. **Check database migration** has been run
2. **Verify table permissions** for application user
3. **Test Supabase connection** (if using Supabase)
4. **Review RLS policies** if using Row Level Security

### Debug Commands

```bash
# Check service status
npm run status:security

# Test email configuration
npm run test:email-alerts

# Validate database schema
npm run validate:security-schema

# Generate test alert
npm run test:generate-alert
```

## 📚 API Reference

### Configuration Endpoints

- `GET /api/admin/security-config` - Get all configuration
- `PUT /api/admin/security-config/:key` - Update configuration setting

### Recipients Endpoints

- `GET /api/admin/security-config/recipients` - List recipients
- `POST /api/admin/security-config/recipients` - Add recipient
- `DELETE /api/admin/security-config/recipients/:id` - Remove recipient

### Thresholds Endpoints

- `GET /api/admin/security-config/thresholds` - List thresholds
- `PUT /api/admin/security-config/thresholds/:metric` - Update threshold

### Alerts Endpoints

- `GET /api/admin/security-config/alerts` - List alerts with pagination
- `PUT /api/admin/security-config/alerts/:id/resolve` - Mark alert as resolved

## 🔄 Backup and Recovery

### Configuration Backup

```bash
# Export security configuration
npm run export:security-config > security-config-backup.json

# Import security configuration
npm run import:security-config < security-config-backup.json
```

### Database Backup

```sql
-- Backup security tables
pg_dump -t security_alert_config -t security_alert_recipients \
        -t security_alert_thresholds -t security_alerts \
        your_database > security_tables_backup.sql

-- Restore security tables
psql your_database < security_tables_backup.sql
```

## 📋 Best Practices

### Configuration Management

1. **Regular Reviews**: Review alert thresholds monthly
2. **Documentation**: Document all configuration changes
3. **Testing**: Test email notifications after configuration changes
4. **Monitoring**: Monitor alert volume and adjust thresholds as needed

### Incident Response

1. **Escalation Procedures**: Define clear escalation paths
2. **Response Times**: Set target response times for different alert types
3. **Communication**: Establish communication channels for security incidents
4. **Post-Incident**: Conduct post-incident reviews and update procedures

### Performance Optimization

1. **Alert Fatigue**: Avoid too many low-priority alerts
2. **Threshold Tuning**: Adjust thresholds based on historical data
3. **Batch Processing**: Use batch operations for bulk changes
4. **Caching**: Leverage configuration caching for performance

## 🔗 Related Documentation

- [User Security Guide](user-security-guide.md)
- [Developer Security API Guide](developer-security-api-guide.md)
- [Security Implementation Guide](security-guide.md)
- [System Administration Guide](admin-guide.md)

*/
