# 🛡️ Development Security Standards

**Version**: 1.0  
**Effective Date**: January 2025  
**Compliance**: NIS2 Art. 21, ISO 27001 A.14.2

## 1. Purpose

These standards ensure secure software development practices for the Maritime Onboarding Platform, meeting NIS2 and ISO 27001 requirements.

## 2. Secure Coding Standards

### 2.1 Input Validation
```javascript
// ✅ GOOD: Validated input
const { email, password } = req.body;
if (!validators.email(email).valid) {
  return res.status(400).json({ error: 'Invalid email' });
}

// ❌ BAD: Direct use without validation
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
```

### 2.2 Authentication & Authorization
- Use JWT tokens with expiration
- Implement refresh token rotation
- Enforce MFA for admin accounts
- Apply principle of least privilege

### 2.3 Data Protection
- Encrypt sensitive data at rest
- Use TLS 1.2+ for data in transit
- Implement field-level encryption for PII
- Sanitize logs to prevent data leakage

### 2.4 Error Handling
```javascript
// ✅ GOOD: Safe error messages
catch (error) {
  logger.error('Authentication failed', { userId, timestamp });
  return res.status(401).json({ error: 'Authentication failed' });
}

// ❌ BAD: Exposing internal details
catch (error) {
  return res.status(500).json({ error: error.stack });
}
```

## 3. Dependency Management

### 3.1 Dependency Security
- Run `npm audit` before each commit
- Update dependencies monthly
- Review license compliance
- Generate SBOM for releases

### 3.2 Allowed Licenses
✅ **Permitted**: MIT, Apache-2.0, BSD, ISC  
⚠️ **Review Required**: LGPL, MPL  
❌ **Prohibited**: GPL, AGPL, SSPL

### 3.3 Security Automation
```json
// package.json
{
  "scripts": {
    "security:check": "npm audit --audit-level=moderate",
    "security:fix": "npm audit fix",
    "security:report": "./scripts/generate-security-report.sh"
  }
}
```

## 4. Source Code Security

### 4.1 Version Control
- Never commit secrets or credentials
- Use `.gitignore` for sensitive files
- Sign commits with GPG when possible
- Review PR security checklist

### 4.2 Code Review Requirements
All code must be reviewed for:
- [ ] Input validation
- [ ] Authentication checks
- [ ] Authorization logic
- [ ] Error handling
- [ ] Logging practices
- [ ] Dependency updates

### 4.3 Secret Management
```bash
# ✅ GOOD: Environment variables
JWT_SECRET=${JWT_SECRET}

# ❌ BAD: Hardcoded secrets
const JWT_SECRET = "mysecretkey123";
```

## 5. Security Testing

### 5.1 Required Tests
- Unit tests for security functions
- Integration tests for auth flows
- Security regression tests
- Dependency vulnerability scans

### 5.2 Test Coverage
- Minimum 80% code coverage
- 100% coverage for auth/crypto code
- Security test suite must pass
- No high/critical vulnerabilities

### 5.3 Security Test Examples
```javascript
describe('Security Tests', () => {
  test('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const result = await api.post('/login', { 
      email: maliciousInput 
    });
    expect(result.status).toBe(400);
  });

  test('should enforce rate limiting', async () => {
    for (let i = 0; i < 10; i++) {
      await api.post('/login', invalidCredentials);
    }
    const result = await api.post('/login', invalidCredentials);
    expect(result.status).toBe(429);
  });
});
```

## 6. Infrastructure Security

### 6.1 Container Security
```dockerfile
# ✅ GOOD: Specific version, non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# ❌ BAD: Latest tag, root user
FROM node:latest
```

### 6.2 Environment Configuration
- Separate configs for dev/staging/prod
- Encrypt sensitive configuration
- Rotate secrets quarterly
- Use least-privilege service accounts

### 6.3 Network Security
- Implement network segmentation
- Use private subnets for databases
- Configure firewall rules
- Enable DDoS protection

## 7. Compliance Requirements

### 7.1 NIS2 Requirements
| Requirement | Implementation |
|-------------|---------------|
| Risk Management | Threat modeling, security reviews |
| Incident Handling | IRP, security monitoring |
| Supply Chain | SBOM, dependency scanning |
| Vulnerability Management | Regular updates, security patches |

### 7.2 ISO 27001 Controls
| Control | Implementation |
|---------|---------------|
| A.14.2.1 | Secure development policy |
| A.14.2.5 | System security engineering |
| A.14.2.6 | Secure development environment |
| A.14.2.8 | System security testing |

## 8. Security Checklist

### Pre-Development
- [ ] Threat modeling completed
- [ ] Security requirements defined
- [ ] Architecture review done

### During Development
- [ ] Secure coding practices followed
- [ ] Dependencies scanned
- [ ] Code reviewed for security

### Pre-Deployment
- [ ] Security tests passed
- [ ] Vulnerabilities remediated
- [ ] SBOM generated
- [ ] Security documentation updated

### Post-Deployment
- [ ] Security monitoring enabled
- [ ] Incident response ready
- [ ] Audit logging configured
- [ ] Backup/recovery tested

## 9. Security Training

### Required Training
- OWASP Top 10 awareness
- Secure coding practices
- Incident response procedures
- Data protection requirements

### Resources
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

## 10. Incident Response

### Security Issue Detected
1. Stop current work
2. Don't commit vulnerable code
3. Report to security team
4. Follow incident response plan
5. Document lessons learned

### Contact
- Security Team: security@shipdocs.app
- Urgent: Follow escalation matrix

---

**Enforcement**: These standards are mandatory for all development work.  
**Review**: Quarterly or after security incidents  
**Questions**: Contact security@shipdocs.app