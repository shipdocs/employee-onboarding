# Email Security Controls Documentation

## Overview

This document describes the comprehensive email security controls implemented in the Maritime Onboarding System. These controls protect against abuse, ensure compliance, and maintain service reliability.

## Security Features Implemented

### 1. Domain Security Controls

#### Domain Whitelisting
- **Purpose**: Ensure emails are only sent to legitimate domains
- **Location**: `/lib/email-security.js`
- **Configuration**:
  ```javascript
  whitelist: [
    'shipdocs.app',
    'burando.online',
    'gmail.com',
    'outlook.com',
    // ... other trusted domains
  ]
  ```

#### Domain Blacklisting
- **Purpose**: Prevent emails to temporary/disposable email services
- **Location**: `/lib/email-security.js`
- **Configuration**:
  ```javascript
  blacklist: [
    'tempmail.com',
    'guerrillamail.com',
    'mailinator.com',
    // ... other blocked domains
  ]
  ```

#### Protected Organizations
- **Purpose**: Prevent test emails to real maritime organizations
- **Location**: `/lib/email-security.js`
- **Protected Domains**:
  - `imo.org` - International Maritime Organization
  - `mardep.gov.hk` - Marine Department Hong Kong
  - `mpa.gov.sg` - Maritime and Port Authority Singapore
  - Major classification societies (DNV, Lloyd's Register, etc.)
  - Maritime news and technology sites

### 2. Rate Limiting

#### Per-Recipient Limits
- **Hourly Limit**: 5 emails per recipient
- **Daily Limit**: 20 emails per recipient
- **Purpose**: Prevent spam and abuse of individual recipients

#### Global Limits
- **Per Minute**: 30 emails
- **Per Hour**: 500 emails
- **Per Day**: 2000 emails
- **Purpose**: Protect email service provider reputation

#### Burst Protection
- **Window**: 60 seconds
- **Max Burst**: 10 emails
- **Purpose**: Prevent sudden spikes that could trigger provider limits

### 3. Content Security

#### HTML Sanitization
- **Library**: isomorphic-dompurify
- **Allowed Tags**: Safe HTML tags only (p, br, strong, em, h1-h6, etc.)
- **Forbidden Tags**: script, iframe, object, embed, form
- **Event Handlers**: All JavaScript event handlers removed

#### Subject Line Validation
- **Max Length**: 200 characters
- **Header Injection Protection**: Removes newlines and control characters
- **XSS Prevention**: Strips HTML and script tags

#### Attachment Security
- **Max Size**: 10MB per attachment
- **Max Count**: 5 attachments per email
- **Allowed Types**:
  - PDF documents
  - Images (JPEG, PNG, GIF)
  - Word documents (DOC, DOCX)
- **Filename Sanitization**: Removes special characters

### 4. Environment-Specific Controls

#### Development Environment
- **Email Interception**: All emails redirected to `dev-team@shipdocs.app`
- **Subject Prefix**: `[DEV]` added to all subjects
- **Domain Restriction**: Only `shipdocs.app` and `localhost` allowed

#### Staging Environment
- **Email Interception**: All emails redirected to `staging-team@shipdocs.app`
- **Subject Prefix**: `[STAGING]` added to all subjects
- **Domain Restriction**: Only `shipdocs.app` allowed

#### Production Environment
- **Email Interception**: Disabled
- **Subject Prefix**: None
- **Domain Restriction**: Full whitelist applies

### 5. API Key Security

#### Rotation Schedule
- **Interval**: 90 days
- **Warning Period**: 14 days before expiration
- **Grace Period**: 24 hours for old key deactivation

#### Key Management
- **Max Active Keys**: 3 per provider
- **Storage**: Hashed in database
- **Usage Tracking**: All key usage logged

### 6. Security Monitoring

#### Event Logging
All security events are logged to the `email_security_logs` table:
- Invalid email formats
- Blacklisted domains
- Protected organization attempts
- Rate limit violations
- Content sanitization actions
- API key rotations

#### Critical Events
The following events trigger immediate alerts:
- Rate limit burst violations
- Injection attempts detected
- API key compromise suspected
- Mass email attempts
- Protected organization access

#### Security Metrics
Available metrics include:
- Total security events
- Events by type
- Critical event count
- Blocked emails
- Rate limit hits

## Configuration

### Environment Variables

```bash
# Email Service Configuration
EMAIL_SERVICE_PROVIDER=mailersend
MAILERSEND_API_KEY=your-api-key
EMAIL_FROM=noreply@shipdocs.app
EMAIL_FROM_NAME=Burando Maritime Services

# Environment
NODE_ENV=development|staging|production

# Security Overrides (optional)
EMAIL_SECURITY_BYPASS=false
EMAIL_RATE_LIMIT_DISABLE=false
```

### Database Tables

The security system creates and uses these tables:
- `email_security_logs` - Security event logging
- `email_rate_limits` - Rate limit tracking
- `email_api_keys` - API key management
- `email_security_rules` - Custom security rules

### Custom Security Rules

Administrators can add custom rules via the database:

```sql
-- Add a custom whitelisted domain
INSERT INTO email_security_rules (rule_type, rule_value, action, reason)
VALUES ('domain_whitelist', 'partner-company.com', 'allow', 'Business partner');

-- Add a custom blacklisted domain
INSERT INTO email_security_rules (rule_type, rule_value, action, reason)
VALUES ('domain_blacklist', 'spam-domain.com', 'block', 'Known spam source');
```

## Usage

### Basic Usage

The security controls are automatically applied to all emails sent through the system:

```javascript
// Security checks are performed automatically
await sendEmailWithAttachments({
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  subject: 'Welcome',
  htmlContent: '<p>Welcome aboard!</p>',
  attachments: []
});
```

### Security Options

For special cases, you can pass security options:

```javascript
await sendEmailWithAttachments({
  recipientEmail: 'vip@maritime-org.com',
  recipientName: 'VIP User',
  subject: 'Important',
  htmlContent: '<p>Important message</p>',
  attachments: [],
  securityOptions: {
    allowProtected: true,      // Allow protected organizations
    requireWhitelist: false,   // Don't require whitelist
    skipRateLimit: false      // Apply rate limits
  }
});
```

## Monitoring

### View Security Logs

```sql
-- Recent security events
SELECT * FROM email_security_logs 
ORDER BY timestamp DESC 
LIMIT 100;

-- Events by type
SELECT event_type, COUNT(*) as count 
FROM email_security_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

### Check Rate Limits

```sql
-- Current rate limits
SELECT * FROM email_rate_limits 
WHERE window_end > NOW()
ORDER BY last_attempt DESC;
```

### API Key Status

```sql
-- Active API keys
SELECT provider, created_at, expires_at, usage_count 
FROM email_api_keys 
WHERE is_active = true;
```

## Best Practices

### 1. Regular Monitoring
- Check security logs daily
- Review blocked emails weekly
- Monitor rate limit hits

### 2. API Key Management
- Rotate keys before expiration
- Keep backup keys ready
- Monitor key usage patterns

### 3. Content Guidelines
- Always use HTML templates
- Avoid user-generated content in subjects
- Validate all dynamic content

### 4. Testing
- Test in development environment first
- Verify email interception works
- Check security logs after testing

### 5. Incident Response
- Monitor critical events
- Have rollback procedures ready
- Document all security incidents

## Troubleshooting

### Email Blocked

1. Check security logs for the reason
2. Verify recipient domain is allowed
3. Check rate limits haven't been exceeded
4. Ensure content passes validation

### Rate Limit Exceeded

1. Wait for the window to reset
2. Check logs for unusual activity
3. Consider increasing limits if legitimate
4. Implement queuing for bulk sends

### API Key Issues

1. Check key expiration date
2. Verify key is active
3. Test with backup key
4. Rotate if compromised

## Security Alerts

Critical security events are logged with high priority. Set up monitoring for:

```sql
-- Critical security events
SELECT * FROM email_security_logs 
WHERE event_type IN (
  'rate_limit_burst',
  'injection_attempt',
  'api_key_compromised',
  'mass_email_attempt',
  'protected_organization'
)
AND timestamp > NOW() - INTERVAL '1 hour';
```

## Compliance

The email security system helps ensure compliance with:
- GDPR (data protection)
- CAN-SPAM (commercial email)
- Industry best practices
- Maritime organization policies

## Updates and Maintenance

### Weekly Tasks
- Review security logs
- Check rate limit effectiveness
- Monitor email delivery rates

### Monthly Tasks
- Audit whitelisted domains
- Review protected organizations list
- Update security rules as needed

### Quarterly Tasks
- Rotate API keys
- Security system audit
- Update documentation

## Contact

For security issues or questions:
- Development Team: dev-team@shipdocs.app
- Security Team: security@shipdocs.app
- Emergency: Use critical incident procedures