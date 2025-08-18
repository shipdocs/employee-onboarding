# Maritime Onboarding System - Infrastructure Optimization

This directory contains all infrastructure optimization configurations and services for the maritime onboarding system.

## Overview

The infrastructure optimization setup includes:
1. **Automated Token Cleanup** - Manages expired JWT tokens and sessions
2. **Health Monitoring** - Comprehensive system health checks and uptime monitoring
3. **Automated Backups** - Database and file storage backup procedures
4. **Security Monitoring** - Real-time threat detection and incident response
5. **Maintenance Procedures** - Routine and emergency maintenance scripts

## Directory Structure

```
infrastructure/
├── monitoring/                    # Health monitoring configuration
│   ├── health-monitoring-config.js
│   └── health-monitor.js
├── backup/                       # Backup configuration and services
│   ├── backup-config.js
│   └── backup-service.js
├── security/                     # Security monitoring
│   ├── security-monitoring-config.js
│   └── security-monitor.js
├── maintenance/                  # Maintenance procedures
│   ├── token-cleanup-config.js
│   ├── automated-cleanup.js
│   ├── maintenance-procedures.md
│   └── maintenance-scripts.js
└── README.md                     # This file
```

## Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Cron job security
CRON_SECRET=your-secure-cron-secret

# Backup encryption
BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key

# Alert recipients
ADMIN_EMAIL=admin@maritime-onboarding.com
SECURITY_EMAIL=security@maritime-onboarding.com
TECH_LEAD_EMAIL=tech@maritime-onboarding.com

# External monitoring (optional)
UPTIME_ROBOT_API_KEY=your-uptime-robot-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_API_KEY=your-pagerduty-key

# Backup storage (optional)
BACKUP_S3_BUCKET=maritime-onboarding-backups
AWS_REGION=eu-west-1
BACKUP_AZURE_CONTAINER=backups
```

### 2. Database Migration

Run the infrastructure tables migration:

```bash
npm run db:push
```

### 3. Verify Cron Jobs

Check that cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/automated-cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/backup-database",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Features

### 1. Automated Token Cleanup

**Schedule**: Daily at 3 AM UTC

- Removes expired JWT tokens from blacklist
- Cleans up expired user sessions
- Archives old audit logs
- Cleans orphaned data

**Configuration**: `maintenance/token-cleanup-config.js`

### 2. Health Monitoring

**Endpoints monitored**:
- `/api/health` - General API health (30s interval)
- `/api/health/database` - Database connectivity (1m interval)
- `/api/health/storage` - Storage service (5m interval)
- `/api/health/email` - Email service (10m interval)
- `/api/health/auth` - Authentication service (5m interval)

**Alert channels**:
- Email notifications
- Slack webhooks
- PagerDuty integration (optional)

**Configuration**: `monitoring/health-monitoring-config.js`

### 3. Automated Backups

**Schedule**:
- Full backup: Sundays at 2 AM UTC
- Incremental backup: Daily at 2 AM UTC
- Storage backup: Daily at 3 AM UTC

**Features**:
- Compression and encryption
- Multiple destination support (S3, Azure)
- Automated retention management
- Backup verification

**Configuration**: `backup/backup-config.js`

### 4. Security Monitoring

**Monitored events**:
- Failed login attempts
- Brute force attacks
- SQL injection attempts
- XSS attempts
- Suspicious locations
- API abuse

**Response actions**:
- Automatic IP blocking
- User account lockout
- Real-time alerts
- Forensic data capture

**Configuration**: `security/security-monitoring-config.js`

### 5. Maintenance Scripts

Available maintenance operations:
- `clearExpiredData()` - Clean up expired sessions and tokens
- `optimizeDatabase()` - Run database optimization
- `checkSystemHealth()` - Comprehensive health check
- `resetUserSessions()` - Force logout users
- `archiveOldData()` - Archive historical data
- `updateSystemStatistics()` - Update system metrics
- `verifyDataIntegrity()` - Check for data inconsistencies

## API Endpoints

### Health Check Endpoints

```bash
# General health check
GET /api/health

# Database health
GET /api/health/database

# Storage health
GET /api/health/storage

# Email service health
GET /api/health/email

# Authentication health
GET /api/health/auth
```

### Cron Job Endpoints

```bash
# Automated cleanup (requires cron secret)
GET /api/cron/automated-cleanup
Headers: X-Cron-Secret: your-secret

# Database backup (requires cron secret)
GET /api/cron/backup-database
Headers: X-Cron-Secret: your-secret
```

## Monitoring Dashboard

### Key Metrics

1. **System Health Score**
   - Based on: uptime, response time, error rate, security events
   - Thresholds: Excellent (90+), Good (75+), Fair (60+), Poor (<60)

2. **Performance Metrics**
   - API response time
   - Database query time
   - Active users
   - Request rate

3. **Security Metrics**
   - Failed login attempts
   - Blocked requests
   - Active threats
   - Security incidents

### Database Views

```sql
-- View active security threats
SELECT * FROM active_security_threats;

-- View system health summary
SELECT * FROM system_health_summary;

-- View recent maintenance activities
SELECT * FROM maintenance_logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Alerts and Notifications

### Alert Severity Levels

1. **Critical** (Response: 15 minutes)
   - System down
   - Database unreachable
   - Security breach
   - Data loss risk

2. **High** (Response: 1 hour)
   - Service degradation
   - High error rate
   - Multiple failed logins
   - Backup failure

3. **Medium** (Response: 4 hours)
   - Performance degradation
   - Storage issues
   - Unusual activity

4. **Low** (Response: 24 hours)
   - After-hours access
   - Configuration changes
   - Maintenance reminders

### Notification Channels

- **Email**: All severity levels
- **Slack**: Critical and High severity
- **SMS**: Critical only (if configured)
- **PagerDuty**: Critical incidents

## Troubleshooting

### Common Issues

1. **Cron jobs not running**
   - Verify CRON_SECRET is set
   - Check Vercel function logs
   - Ensure proper schedule format

2. **Backup failures**
   - Check storage permissions
   - Verify backup destination access
   - Review backup size limits

3. **False positive security alerts**
   - Adjust detection thresholds
   - Whitelist known IPs
   - Review detection patterns

4. **High resource usage**
   - Check cleanup job frequency
   - Review retention policies
   - Optimize query performance

### Manual Operations

```bash
# Test health monitoring
curl https://your-domain.com/api/health

# Trigger manual cleanup
curl -H "X-Cron-Secret: your-secret" https://your-domain.com/api/cron/automated-cleanup

# Force backup
curl -H "X-Cron-Secret: your-secret" https://your-domain.com/api/cron/backup-database

# Check security status
npm run security:status

# View maintenance logs
npm run maintenance:logs
```

## Security Considerations

1. **Cron Secret**: Always use a strong, unique secret for cron jobs
2. **Backup Encryption**: Enable encryption for sensitive data backups
3. **Alert Recipients**: Keep recipient lists up to date
4. **Access Control**: Limit infrastructure access to authorized personnel
5. **Audit Trail**: All operations are logged for compliance

## Performance Impact

- Health checks: Minimal (cached for 30 seconds)
- Token cleanup: Low (runs during off-peak hours)
- Backups: Medium (scheduled during low-traffic periods)
- Security monitoring: Low (asynchronous processing)

## Compliance

The infrastructure setup supports:
- GDPR compliance (data retention, right to erasure)
- Maritime industry requirements (7-year audit trail)
- Security best practices (encryption, access control)
- Business continuity (automated backups, monitoring)

## Future Enhancements

1. **Auto-scaling** based on load metrics
2. **Disaster recovery** automation
3. **Cost optimization** recommendations
4. **Predictive maintenance** using ML
5. **Enhanced forensics** capabilities

## Support

For infrastructure issues:
1. Check system health dashboard
2. Review recent alerts
3. Consult maintenance logs
4. Contact technical support

**Emergency contacts**:
- On-call: +XX-XXX-XXXX
- Email: infrastructure@maritime-onboarding.com
- Slack: #infrastructure-alerts