# Security Implementation Guide

## Overview

This guide documents all security measures implemented in the Maritime Onboarding System, providing comprehensive information about security configurations, best practices, and compliance requirements.

## Table of Contents

1. [Architecture Security](#architecture-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Security Configurations](#security-configurations)
7. [Security Best Practices](#security-best-practices)
8. [Security Checklist](#security-checklist)

## Architecture Security

### Defense in Depth Strategy

The system implements multiple layers of security:

1. **Network Layer**: Cloudflare DDoS protection and WAF
2. **Application Layer**: Input validation, XSS protection, CSRF tokens
3. **Data Layer**: Encryption at rest and in transit
4. **Access Layer**: Role-based access control (RBAC) and Row Level Security (RLS)

### Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare WAF/DDoS                      │
├─────────────────────────────────────────────────────────────┤
│                    Vercel Edge Network                      │
├─────────────────────────────────────────────────────────────┤
│              Serverless Functions (API Layer)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Auth Middleware│  │Rate Limiter │  │Input Valid. │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                  Supabase (Data Layer)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │     RLS     │  │  Encryption │  │   Backups   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### JWT Implementation

The system uses JWT tokens with the following security measures:

```javascript
// Token Configuration
const JWT_CONFIG = {
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'maritime-onboarding',
  audience: 'maritime-users'
};

// Token Structure
{
  "sub": "user_id",
  "role": "crew|manager|admin",
  "company_id": "company_uuid",
  "permissions": ["read", "write", "delete"],
  "iat": 1234567890,
  "exp": 1234654290,
  "iss": "maritime-onboarding",
  "aud": "maritime-users"
}
```

### Magic Link Authentication

Magic links are implemented with:
- 15-minute expiration
- Single-use tokens
- Secure random token generation (32 bytes)
- Rate limiting (3 requests per hour)

### Role-Based Access Control (RBAC)

Three-tier permission system:

| Role | Permissions | Access Scope |
|------|------------|--------------|
| Admin | Full system access | All companies, all data |
| Manager | Company management | Own company data only |
| Crew | Personal access | Own training data only |

### Session Management

- Tokens expire after 24 hours
- No automatic token refresh (security over convenience)
- Secure cookie storage with httpOnly, secure, sameSite flags
- Session invalidation on logout

## Data Protection

### Encryption

#### At Rest
- Database: AES-256 encryption (Supabase managed)
- File storage: AES-256 encryption for all uploaded files
- Backups: Encrypted with separate keys

#### In Transit
- TLS 1.3 for all connections
- Certificate pinning for mobile apps (future)
- Strict Transport Security (HSTS) headers

### Data Sanitization

```javascript
// Input Sanitization Example
const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .slice(0, MAX_INPUT_LENGTH);
};

// SQL Injection Prevention
// Always use parameterized queries
const { data, error } = await supabase
  .from('crew_members')
  .select('*')
  .eq('id', sanitizedId); // Parameterized
```

### Personal Data Protection

- PII is encrypted at the field level
- Data minimization principles applied
- Automatic data retention policies
- Right to deletion implemented

## API Security

### Rate Limiting

Implemented at multiple levels:

```javascript
// Rate Limit Configuration
const RATE_LIMITS = {
  auth: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 attempts
  },
  api: {
    window: 60 * 1000, // 1 minute
    max: 100 // 100 requests
  },
  upload: {
    window: 60 * 60 * 1000, // 1 hour
    max: 10 // 10 uploads
  }
};
```

### Request Validation

All API requests are validated:

```javascript
// Request Validation Middleware
const validateRequest = (schema) => async (req, res) => {
  try {
    await schema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
};
```

### CORS Configuration

```javascript
const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://onboarding.burando.online'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};
```

## Infrastructure Security

### Environment Variables

Critical secrets management:

```bash
# Required Security Environment Variables
SUPABASE_URL=                  # Public URL (safe to expose)
SUPABASE_ANON_KEY=            # Public key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=    # SECRET - Never expose
JWT_SECRET=                   # SECRET - Strong random string
MAILERSEND_API_KEY=          # SECRET - Email service key
SMTP_PASSWORD=               # SECRET - SMTP credentials
```

### Vercel Security Features

- Automatic HTTPS enforcement
- DDoS protection at edge
- Serverless function isolation
- Environment variable encryption

### Supabase Security Features

- Row Level Security (RLS) policies
- Automatic SQL injection prevention
- Built-in authentication
- Encrypted connections

## Security Configurations

### Content Security Policy (CSP)

```javascript
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "https://vercel.live"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:"],
  'connect-src': ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};
```

### Security Headers

```javascript
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
```

### Database Security Policies

```sql
-- Example RLS Policy for crew_members
CREATE POLICY "Crew members can view own data" ON crew_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view company crew" ON crew_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers 
      WHERE managers.user_id = auth.uid() 
      AND managers.company_id = crew_members.company_id
    )
  );

CREATE POLICY "Admins can view all" ON crew_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );
```

## Security Best Practices

### Development Practices

1. **Code Reviews**: All code must be reviewed for security vulnerabilities
2. **Dependency Management**: Regular updates and vulnerability scanning
3. **Secret Management**: Never commit secrets to version control
4. **Testing**: Include security tests in CI/CD pipeline

### Operational Practices

1. **Monitoring**: Real-time security event monitoring
2. **Logging**: Comprehensive audit trails
3. **Incident Response**: Defined procedures for security incidents
4. **Training**: Regular security awareness training

### Data Handling Practices

1. **Principle of Least Privilege**: Users only access what they need
2. **Data Minimization**: Only collect necessary data
3. **Secure Deletion**: Proper data destruction procedures
4. **Backup Security**: Encrypted, tested backups

## Security Checklist

### Pre-Deployment Checklist

- [ ] All environment variables configured correctly
- [ ] SSL/TLS certificates valid and not expiring soon
- [ ] Database RLS policies tested and active
- [ ] Rate limiting configured and tested
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured without sensitive data
- [ ] Security headers properly set
- [ ] CORS configuration restrictive
- [ ] Dependencies updated and scanned

### Post-Deployment Checklist

- [ ] SSL Labs test passed (A+ rating)
- [ ] Security headers verified (securityheaders.com)
- [ ] Penetration testing completed
- [ ] Load testing shows no security degradation
- [ ] Monitoring alerts configured
- [ ] Incident response team notified
- [ ] Documentation updated
- [ ] Security training completed
- [ ] Compliance requirements verified
- [ ] Backup restoration tested

### Monthly Security Review

- [ ] Review access logs for anomalies
- [ ] Update dependencies
- [ ] Review and rotate API keys
- [ ] Test backup restoration
- [ ] Review security policies
- [ ] Update security documentation
- [ ] Conduct security training
- [ ] Review incident reports
- [ ] Test incident response procedures
- [ ] Verify compliance status

### Incident Response Checklist

- [ ] Isolate affected systems
- [ ] Preserve evidence
- [ ] Notify security team
- [ ] Begin investigation
- [ ] Document timeline
- [ ] Implement fixes
- [ ] Test remediation
- [ ] Update documentation
- [ ] Conduct post-mortem
- [ ] Implement preventive measures

## Security Contact Information

**Security Team Email**: security@burando.online  
**Emergency Contact**: +31 (0) 20 123 4567  
**Bug Bounty Program**: security.burando.online/bugbounty  

## Compliance

The system is designed to comply with:
- GDPR (General Data Protection Regulation)
- ISO 27001 Information Security Standards
- Maritime Industry Security Requirements
- Dutch Data Protection Laws

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-02 | Initial security implementation |
| 1.1 | 2025-01-02 | Added comprehensive security measures |

---

**Last Updated**: January 2, 2025  
**Next Review**: February 2, 2025  
**Document Owner**: Security Team