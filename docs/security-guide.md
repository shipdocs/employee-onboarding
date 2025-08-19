/**
@page security-guide Security Guide

@tableofcontents

# 🔒 Security Implementation Guide

Comprehensive security documentation for the Maritime Onboarding System.

## 🛡️ Security Architecture

### Authentication & Authorization

#### Multi-Factor Authentication
```javascript
// Enable MFA for user
const enableMFA = async (userId) => {
  const secret = generateTOTPSecret();
  await updateUser(userId, { 
    mfa_enabled: true,
    mfa_secret: encrypt(secret)
  });
  return generateQRCode(secret);
};
```

#### Role-Based Access Control (RBAC)
- **Principle of Least Privilege**: Users get minimum required access
- **Role Inheritance**: Hierarchical permission structure
- **Dynamic Permissions**: Context-aware access control

### Data Encryption

#### At Rest
- **Database**: AES-256 encryption for sensitive fields
- **File Storage**: Encrypted storage buckets
- **Backups**: Encrypted backup files

#### In Transit
- **HTTPS**: TLS 1.3 for all communications
- **API**: JWT tokens with short expiration
- **WebSocket**: Secure WebSocket connections

## 🔐 Implementation Details

### Password Security
```javascript
// Password hashing with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Password validation
const validatePassword = (password) => {
  const requirements = {
    minLength: 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*]/.test(password)
  };
  return Object.values(requirements).every(Boolean);
};
```

### Session Management
```javascript
// Secure session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict'
  }
};
```

## 🚨 Security Monitoring

### Audit Logging
```javascript
// Audit log entry
const auditLog = {
  userId: user.id,
  action: 'LOGIN_ATTEMPT',
  resource: 'authentication',
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true,
  metadata: { loginMethod: 'password' }
};
```

### Intrusion Detection
- Failed login attempt monitoring
- Unusual access pattern detection
- Rate limiting implementation
- IP-based blocking

## 🔍 Compliance & Standards

### Maritime Regulations
- **STCW Convention**: Seafarer training compliance
- **MLC 2006**: Maritime Labour Convention
- **ISM Code**: International Safety Management
- **ISPS Code**: International Ship and Port Facility Security

### Data Protection
- **GDPR**: European data protection compliance
- **CCPA**: California Consumer Privacy Act
- **SOX**: Sarbanes-Oxley compliance
- **ISO 27001**: Information security management

## 🛠️ Security Configuration

### Environment Variables
```bash
# Security settings
JWT_SECRET=your_secure_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_32_chars
SESSION_SECRET=your_session_secret
MFA_ISSUER=Maritime_Onboarding_System

# Rate limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # Max requests per window

# Security headers
HSTS_MAX_AGE=31536000
CSP_POLICY="default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### Security Headers
```javascript
// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', process.env.CSP_POLICY);
  next();
});
```

## 🚨 Incident Response

### Security Incident Procedure
1. **Detection**: Identify security incident
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze scope and impact
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

### Emergency Contacts
- **Security Team**: security@maritime-onboarding.com
- **Emergency Hotline**: +1-800-SECURITY
- **Incident Response**: Available 24/7

## 📋 Security Checklist

### Deployment Security
- [ ] HTTPS enabled with valid certificates
- [ ] Security headers configured
- [ ] Database encryption enabled
- [ ] File upload restrictions in place
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Backup encryption verified
- [ ] Access controls tested
- [ ] Vulnerability scan completed
- [ ] Penetration testing performed

### Ongoing Security
- [ ] Regular security updates
- [ ] Access review (quarterly)
- [ ] Password policy enforcement
- [ ] MFA adoption monitoring
- [ ] Audit log review
- [ ] Incident response testing
- [ ] Security training updates
- [ ] Compliance verification

*/
