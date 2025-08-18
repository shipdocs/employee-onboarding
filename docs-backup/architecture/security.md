# Security Architecture

The Maritime Onboarding System implements a comprehensive security architecture with multiple layers of protection, following industry best practices and compliance requirements.

## Security Overview

### Defense in Depth
The system employs multiple security layers:
1. **Network Security**: TLS/SSL encryption, firewall rules
2. **Application Security**: Authentication, authorization, input validation
3. **Database Security**: Row Level Security, encrypted connections
4. **Infrastructure Security**: Secure deployment, environment isolation
5. **Operational Security**: Monitoring, audit logging, incident response

### Security Principles
- **Least Privilege**: Users only get minimum required permissions
- **Zero Trust**: Verify every request, trust nothing by default
- **Secure by Default**: Security enabled out of the box
- **Data Protection**: Encryption in transit and at rest
- **Audit Everything**: Comprehensive activity logging

## Authentication System

### Authentication Methods

#### 1. Password Authentication (Admin/Manager)
```javascript
// Password hashing with bcrypt
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Password verification
const isValid = await bcrypt.compare(password, user.password_hash);
```

#### 2. Magic Link Authentication (Crew)
```javascript
// Generate secure magic link
const token = crypto.randomBytes(32).toString('hex');
const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

await supabase.from('magic_links').insert({
  email: crewEmail,
  token: token,
  expires_at: expires
});

// Send via email
await sendMagicLinkEmail(crewEmail, token);
```

### JWT Token Management

#### Token Structure
```javascript
const payload = {
  userId: user.id,
  email: user.email,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
};

const token = jwt.sign(payload, process.env.JWT_SECRET);
```

#### Token Validation
```javascript
export async function validateToken(token) {
  try {
    // Verify signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('token_blacklist')
      .select('token')
      .eq('token', token)
      .single();
    
    if (blacklisted) {
      throw new Error('Token has been revoked');
    }
    
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### Session Management

#### Token Storage
- **Frontend**: localStorage with HttpOnly cookie fallback
- **Expiration**: 7-day default with refresh warnings
- **Revocation**: Token blacklist for immediate invalidation

#### Session Security
```javascript
// Automatic session refresh warning
useEffect(() => {
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp * 1000 - Date.now();
    
    if (expiresIn < 24 * 60 * 60 * 1000) { // Less than 24 hours
      showRefreshWarning();
    }
  };
  
  const interval = setInterval(checkTokenExpiry, 60 * 60 * 1000); // Check hourly
  return () => clearInterval(interval);
}, []);
```

## Authorization System

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```javascript
const roleHierarchy = {
  admin: 3,
  manager: 2,
  crew: 1
};

function hasRoleAccess(userRole, requiredRole) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

#### Permission Matrix
| Resource | Admin | Manager | Crew |
|----------|-------|---------|------|
| System Settings | Full | None | None |
| PDF Templates | Full | Read | None |
| Manager Accounts | Full | None | None |
| Crew Accounts | Full | Create/Update | View Own |
| Training Data | Full | View All | View Own |
| Certificates | Full | Manage | View Own |
| Audit Logs | Full | None | None |

### API Authorization

#### Middleware Implementation
```javascript
export function requireRole(requiredRole) {
  return async (req, res, next) => {
    const authResult = await verifyAuth(req);
    
    if (!authResult.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!hasRoleAccess(authResult.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    req.user = authResult.user;
    next();
  };
}
```

### Database Security

#### Row Level Security (RLS)
```sql
-- Example: Users table RLS policy
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (id = auth.jwt_user_id());

CREATE POLICY "Managers can view their crew" ON users
  FOR SELECT USING (
    auth.jwt_user_role() = 'manager' AND
    id IN (
      SELECT crew_member_id FROM manager_permissions
      WHERE manager_id = auth.jwt_user_id()
    )
  );

CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (auth.jwt_user_role() = 'admin');
```

## Input Validation & Sanitization

### Request Validation
```javascript
import { z } from 'zod';

// Email validation
const emailSchema = z.string().email().toLowerCase();

// SQL injection prevention
const safeIdSchema = z.string().uuid();

// XSS prevention
const safeTextSchema = z.string()
  .min(1)
  .max(1000)
  .transform(text => DOMPurify.sanitize(text));

// File upload validation
const fileSchema = z.object({
  name: z.string(),
  type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  size: z.number().max(10 * 1024 * 1024) // 10MB max
});
```

### SQL Injection Prevention
```javascript
// Always use parameterized queries
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId) // Parameterized
  .eq('company_id', companyId); // Parameterized

// Never use string concatenation
// BAD: .filter(`id = ${userId}`)
// GOOD: .eq('id', userId)
```

### XSS Prevention
```javascript
// React automatically escapes content
<div>{userInput}</div> // Safe

// For HTML content, use DOMPurify
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(htmlContent)
}} />

// Content Security Policy headers
const cspHeader = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.onboarding.burando.online"
  ].join('; ')
};
```

## Data Protection

### Encryption

#### In Transit
- **TLS 1.3**: All HTTPS connections
- **Certificate Pinning**: For mobile apps (future)
- **Secure WebSockets**: For real-time features

#### At Rest
- **Database Encryption**: Transparent encryption in Supabase
- **File Storage**: Encrypted S3-compatible storage
- **Sensitive Fields**: Consider field-level encryption for PII

### Privacy & GDPR Compliance

#### Data Minimization
```javascript
// Only collect necessary data
const crewMemberData = {
  email: required,
  firstName: required,
  lastName: required,
  position: required,
  // No unnecessary personal data
};
```

#### Right to Access/Delete
```javascript
// Export user data
async function exportUserData(userId) {
  const data = await supabase
    .from('users')
    .select(`
      *,
      training_sessions(*),
      quiz_results(*),
      certificates(*)
    `)
    .eq('id', userId)
    .single();
  
  return data;
}

// Delete user data
async function deleteUserData(userId) {
  // Soft delete to maintain audit trail
  await supabase
    .from('users')
    .update({ 
      is_active: false,
      deleted_at: new Date(),
      // Anonymize PII
      email: `deleted_${userId}@example.com`,
      first_name: 'Deleted',
      last_name: 'User'
    })
    .eq('id', userId);
}
```

## Security Headers

### HTTP Security Headers
```javascript
// middleware/security.js
export function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
}
```

## Rate Limiting & DDoS Protection

### API Rate Limiting
```javascript
const rateLimits = {
  // Authentication endpoints
  '/api/auth/*': {
    windowMs: 60 * 1000, // 1 minute
    max: 5 // 5 requests per minute
  },
  
  // File uploads
  '/api/upload/*': {
    windowMs: 60 * 1000,
    max: 10
  },
  
  // General API
  '/api/*': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  }
};
```

### Account Lockout
```javascript
// Progressive delays after failed attempts
const lockoutPolicy = {
  maxAttempts: 5,
  lockoutDuration: [
    0,      // 1st-2nd attempt: no delay
    0,      // 3rd attempt: no delay
    60,     // 4th attempt: 1 minute
    300,    // 5th attempt: 5 minutes
    3600    // 6th+ attempt: 1 hour
  ]
};

async function checkAccountLockout(email) {
  const { data: lockout } = await supabase
    .from('account_lockout')
    .select('*')
    .eq('email', email)
    .single();
  
  if (lockout && lockout.locked_until > new Date()) {
    throw new Error('Account temporarily locked');
  }
}
```

## Audit Logging

### Comprehensive Logging
```javascript
async function logAuditEvent({
  userId,
  action,
  resourceType,
  resourceId,
  details,
  request
}) {
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details,
    ip_address: request.headers['x-forwarded-for'] || request.ip,
    user_agent: request.headers['user-agent'],
    created_at: new Date()
  });
}

// Usage
await logAuditEvent({
  userId: req.user.userId,
  action: 'CREATE',
  resourceType: 'crew_member',
  resourceId: newCrew.id,
  details: { email: newCrew.email },
  request: req
});
```

### Security Events to Log
- Authentication attempts (success/failure)
- Authorization failures
- Data access/modifications
- Configuration changes
- Security exceptions
- API errors

## Incident Response

### Security Incident Procedure
1. **Detection**: Automated alerts for suspicious activity
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and patch vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-incident review

### Emergency Procedures
```javascript
// Emergency shutdown
async function emergencyShutdown() {
  // Disable all user sessions
  await supabase.from('users').update({ is_active: false });
  
  // Revoke all tokens
  await supabase.from('token_blacklist').insert(
    allActiveTokens.map(token => ({ token, reason: 'emergency' }))
  );
  
  // Alert administrators
  await sendEmergencyAlert('System shutdown initiated');
}
```

## Security Testing

### Automated Security Scanning
- **Dependency Scanning**: Check for vulnerable packages
- **Static Analysis**: Code security review
- **Dynamic Testing**: Runtime vulnerability detection
- **Penetration Testing**: Regular security assessments

### Security Checklist
- [ ] All endpoints require authentication
- [ ] Role-based authorization implemented
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Error messages don't leak information
- [ ] Sensitive data encrypted
- [ ] Regular security updates

## Compliance

### Maritime Industry Requirements
- **Data Retention**: 5-year minimum for training records
- **Audit Trail**: Complete history of all changes
- **Access Control**: Role-based with approval workflows
- **Data Integrity**: Tamper-proof certificate storage

### GDPR Compliance
- **Lawful Basis**: Legitimate interest for training
- **Data Subject Rights**: Access, rectification, deletion
- **Privacy by Design**: Security built-in from start
- **Data Protection Officer**: Designated contact

## Security Monitoring

### Real-time Monitoring
```javascript
// Monitor failed login attempts
const failedLogins = await supabase
  .from('audit_log')
  .select('*')
  .eq('action', 'LOGIN_FAILED')
  .gte('created_at', new Date(Date.now() - 3600000)); // Last hour

if (failedLogins.length > threshold) {
  await sendSecurityAlert('High number of failed login attempts');
}
```

### Security Metrics
- Authentication success/failure rates
- API error rates by endpoint
- Average response times
- Active session count
- Failed authorization attempts

## Related Documentation
- [API Architecture](./api.md) - API security implementation
- [Database Architecture](./database.md) - Database security and RLS
- [Incident Response Procedures](../INCIDENT_RESPONSE_PROCEDURES.md) - Detailed incident handling
- [Security Audit Report](../security/SECURITY_AUDIT_REPORT.md) - Latest security assessment