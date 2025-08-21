# External Logging Configuration Guide

## Overview

The Maritime Onboarding Platform supports external logging to services like Grafana Cloud for enhanced security monitoring, compliance, and incident response. This feature runs parallel to existing logging and can be configured through the admin UI or environment variables.

## Features

- **Parallel Operation**: External logging runs alongside existing logging without replacing it
- **Admin Configurable**: Enable/disable and configure through the admin dashboard
- **Encrypted Storage**: API keys are encrypted at rest in the database
- **Rate Limiting**: Prevents excessive API usage and costs
- **Selective Logging**: Filter what gets sent based on severity, type, or custom rules
- **Batch Processing**: Efficient batching of logs to reduce API calls
- **Graceful Fallback**: Never affects main application if external logging fails

## Quick Start

### Option 1: Environment Variables (Recommended for Initial Setup)

1. **Set environment variables**:
```bash
# Required settings
export EXTERNAL_LOGGING_ENABLED=true
export GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net
export GRAFANA_CLOUD_USER=123456  # Your Grafana Cloud user ID
export GRAFANA_CLOUD_API_KEY=glc_eyJvIjoiMTIzNDU2IiwibiI6InN0YWNrLTEyMzQ1Ni1obS1yZWFkLXdyaXRlIiwiayI6IjEyMzQ1Njc4OTAiLCJtIjp7InIiOiJ1cyJ9fQ==

# Optional settings
export EXTERNAL_LOGGING_LEVEL=warn  # error, warn, info, debug
export EXTERNAL_LOGGING_SECURITY=true  # Log security events
export EXTERNAL_LOGGING_AUTH=true  # Log authentication events
export EXTERNAL_LOGGING_ERRORS=true  # Log application errors
export EXTERNAL_LOGGING_AUDIT=false  # Log audit events (compliance consideration)
export EXTERNAL_LOGGING_RATE_LIMIT=100  # Max logs per minute
```

2. **Run setup script**:
```bash
npm run external-logging:setup
```

3. **Test connection**:
```bash
npm run external-logging:test
```

### Option 2: Admin UI Configuration

1. Navigate to Admin Dashboard → Settings → External Logging
2. Enter your Grafana Cloud credentials
3. Configure logging preferences
4. Click "Test Connection" to verify
5. Click "Save & Enable" to activate

## Grafana Cloud Setup

### 1. Create Free Account

1. Go to [grafana.com/products/cloud/](https://grafana.com/products/cloud/)
2. Sign up for free account (no credit card required)
3. Choose your stack region (closest to your servers)

### 2. Get API Credentials

1. In Grafana Cloud portal, go to **My Account**
2. Navigate to **Access Policies**
3. Click **Create access policy**
4. Name it: "Maritime Onboarding Logs"
5. Add scope:
   - **logs:write** (Write access to Loki logs)
6. Click **Create**
7. Generate token and save it securely

### 3. Find Your Stack Details

1. Go to **My Account** → **Grafana Cloud Portal**
2. Find your stack name and region
3. Click on **Details** for your Loki stack
4. Copy the Push endpoint URL (e.g., `https://logs-prod-us-central1.grafana.net`)
5. Note your User ID (numeric value)

## Configuration Options

### Core Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable/disable external logging | `false` |
| `endpoint_url` | Grafana Cloud Loki endpoint | - |
| `api_user` | Grafana Cloud user ID | - |
| `api_key` | Grafana Cloud API key (encrypted) | - |
| `log_level` | Minimum log level to send | `warn` |

### Event Type Filters

| Setting | Description | Default |
|---------|-------------|---------|
| `include_security_events` | Send security threat detections | `true` |
| `include_auth_events` | Send authentication events | `true` |
| `include_error_logs` | Send application errors | `true` |
| `include_audit_logs` | Send audit trail events | `false` |

### Performance Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `max_logs_per_minute` | Rate limiting threshold | `100` |
| `batch_size` | Logs per batch | `10` |
| `flush_interval_ms` | Batch send interval | `5000` |

## What Gets Logged

### Security Events (High Priority)
- SQL injection attempts
- XSS attempts
- Directory traversal attempts
- Command injection attempts
- CORS violations
- Suspicious user agents

### Authentication Events
- Failed login attempts
- Successful logins
- MFA challenges
- Password resets
- Blacklisted token usage
- Session timeouts

### Application Errors
- Unhandled exceptions
- Database connection failures
- API errors
- Integration failures

### Audit Events (Optional)
- User management changes
- Permission modifications
- Configuration changes
- Data exports

## Data Sanitization

The following data is automatically redacted before sending:
- Passwords and password hashes
- JWT tokens and API keys
- Session tokens
- Credit card numbers
- Social security numbers
- Any field containing: `password`, `token`, `secret`, `key`, `api_key`

## Custom Filters

### Adding Include Filters

Include filters ensure only specific events are logged:

```javascript
// Via API
POST /api/admin/external-logging/filters
{
  "filter_type": "include",
  "field_name": "severity",
  "operator": "equals",
  "value": "critical",
  "enabled": true
}
```

### Adding Exclude Filters

Exclude filters prevent specific data from being logged:

```javascript
// Via API
POST /api/admin/external-logging/filters
{
  "filter_type": "exclude",
  "field_name": "user_email",
  "operator": "contains",
  "value": "@test.com",
  "enabled": true
}
```

### Filter Operators

- `equals`: Exact match
- `contains`: Substring match
- `regex`: Regular expression match
- `greater_than`: Numeric comparison

## API Endpoints

### Configuration Management

```bash
# Get current configuration
GET /api/admin/external-logging/config

# Update configuration
PUT /api/admin/external-logging/config
{
  "enabled": true,
  "endpoint_url": "https://logs-prod-us-central1.grafana.net",
  "api_user": "123456",
  "api_key": "glc_...",
  "log_level": "warn"
}

# Test connection
POST /api/admin/external-logging/test
```

### Statistics & Monitoring

```bash
# Get logging statistics
GET /api/admin/external-logging/stats

# Get audit trail
GET /api/admin/external-logging/audit?limit=50&offset=0
```

### Filter Management

```bash
# List filters
GET /api/admin/external-logging/filters

# Add filter
POST /api/admin/external-logging/filters

# Delete filter
DELETE /api/admin/external-logging/filters/:id
```

## Grafana Dashboards

### Creating Security Dashboard

1. In Grafana, create new dashboard
2. Add panel with LogQL query:

```logql
{app="maritime-onboarding"} 
  |= "security_event" 
  | json 
  | severity="high"
```

### Useful Queries

**Failed login attempts**:
```logql
{app="maritime-onboarding"} 
  |= "auth_event" 
  | json 
  | action="failed_login"
```

**SQL injection attempts**:
```logql
{app="maritime-onboarding"} 
  |= "sql_injection_attempt"
```

**Error rate**:
```logql
rate({app="maritime-onboarding"} |= "error" [5m])
```

### Alert Rules

Create alerts for critical events:

1. Go to Alerting → Alert rules
2. Create new alert rule
3. Set query and threshold
4. Configure notification channel

Example alert for multiple failed logins:
```logql
count_over_time({app="maritime-onboarding"} 
  |= "failed_login" 
  | json 
  | ip_address="$IP" [5m]) > 5
```

## Security Considerations

### 1. API Key Security
- Never commit API keys to version control
- Use environment variables or secure vaults
- Rotate API keys quarterly
- Use write-only API keys (no read permissions)

### 2. Data Privacy
- No PII in logs (GDPR compliance)
- Automatic sanitization of sensitive fields
- Configure audit log exclusion if needed
- Review filters regularly

### 3. Network Security
- Always use HTTPS/TLS for transmission
- Logs flow one-way only (app → Grafana)
- No reverse access from Grafana to application
- Configure firewall rules if needed

### 4. Cost Management
- Monitor usage against free tier limits (10GB/month)
- Use rate limiting to prevent overages
- Configure appropriate log levels
- Use filters to reduce unnecessary logs

## Troubleshooting

### Connection Failed

1. **Check credentials**:
```bash
npm run external-logging:test
```

2. **Verify network access**:
```bash
curl -X POST https://logs-prod-us-central1.grafana.net/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -u "USER:API_KEY" \
  -d '{"streams":[{"stream":{"test":"true"},"values":[["1234567890000000000","test"]]}]}'
```

3. **Check logs**:
```bash
docker compose logs backend | grep ExternalLogging
```

### Logs Not Appearing

1. Check if enabled in configuration
2. Verify log level settings
3. Check filters aren't too restrictive
4. Review rate limiting settings
5. Check Grafana Cloud ingestion limits

### High API Usage

1. Reduce log level (e.g., error only)
2. Increase batch size
3. Lower rate limit
4. Add exclude filters
5. Disable audit logs if not needed

## Monitoring & Maintenance

### Daily Tasks
- Review security event dashboard
- Check for failed connection alerts
- Monitor usage against limits

### Weekly Tasks
- Review and tune filters
- Check for new security patterns
- Analyze trends and patterns

### Monthly Tasks
- Rotate API keys if needed
- Review retention policies
- Audit log configuration
- Performance optimization

## Migration Path

### From Local Logging Only

1. Set up Grafana Cloud account
2. Configure via environment variables
3. Run in parallel for testing period
4. Gradually increase log levels
5. Create dashboards and alerts
6. Document runbooks

### Changing Providers

The system is designed to support multiple providers. To add a new provider:

1. Extend `externalLoggingService.js`
2. Add provider-specific transport
3. Update configuration schema
4. Test thoroughly

## Support

For issues or questions:
- Check application logs: `grep ExternalLogging`
- Review audit trail in admin UI
- Test connection manually
- Contact support with configuration details (never share API keys)

## Best Practices

1. **Start Conservative**: Begin with error-level only
2. **Test Thoroughly**: Use test environment first
3. **Monitor Costs**: Track usage against limits
4. **Regular Reviews**: Audit configuration monthly
5. **Document Changes**: Log all configuration modifications
6. **Security First**: Never log sensitive data
7. **Performance**: Use batching and rate limiting
8. **Compliance**: Ensure GDPR/regulatory compliance