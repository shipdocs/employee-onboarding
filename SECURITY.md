# 🔒 Security Policy

The Maritime Onboarding Platform takes security seriously. This document outlines our security practices, how to report vulnerabilities, and security best practices for users.

## 🛡️ **Supported Versions**

We provide security updates for the following versions:

| Version | Supported | End of Life |
|---------|-----------|-------------|
| 2.x.x   | ✅ Yes    | TBD         |
| 1.x.x   | ⚠️ Limited | 2024-12-31  |
| < 1.0   | ❌ No     | 2024-06-01  |

**Recommendation**: Always use the latest stable version for the best security posture.

## 🚨 **Reporting Security Vulnerabilities**

### **Responsible Disclosure**
If you discover a security vulnerability, please report it responsibly:

**📧 Email**: [security@shipdocs.app](mailto:security@shipdocs.app)

**🔐 PGP Key**: Available at [https://shipdocs.app/pgp-key.txt](https://shipdocs.app/pgp-key.txt)

### **What to Include**
- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** assessment
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### **What NOT to Include**
- ❌ Don't create public GitHub issues for security vulnerabilities
- ❌ Don't share vulnerabilities on social media
- ❌ Don't test vulnerabilities on production systems you don't own

### **Response Timeline**
- **24 hours**: Initial acknowledgment
- **72 hours**: Preliminary assessment
- **7 days**: Detailed response with timeline
- **30 days**: Security patch release (for critical issues)

### **Recognition**
Security researchers who responsibly disclose vulnerabilities will be:
- Credited in our security advisories (with permission)
- Listed on our security researchers page
- Eligible for our bug bounty program (when available)

## 🔐 **Security Features**

### **Authentication & Authorization**
- **JWT-based authentication** with secure token handling
- **Magic link authentication** for crew members (passwordless)
- **Multi-factor authentication** (MFA) for admin accounts
- **Role-based access control** (RBAC) with granular permissions
- **Session management** with automatic timeout

### **Data Protection**
- **Encryption at rest** (optional, configurable)
- **Encryption in transit** (HTTPS/TLS 1.3)
- **Database encryption** for sensitive fields
- **Secure file storage** with access controls
- **Data anonymization** for audit logs

### **Application Security**
- **Input validation** and sanitization
- **SQL injection protection** via parameterized queries
- **XSS protection** with Content Security Policy
- **CSRF protection** with tokens
- **Rate limiting** to prevent abuse
- **Security headers** (HSTS, X-Frame-Options, etc.)

### **Infrastructure Security**
- **Container security** with minimal base images
- **Network isolation** between services
- **Secrets management** via environment variables
- **Regular security updates** for dependencies
- **Vulnerability scanning** in CI/CD pipeline

## 🛠️ **Security Best Practices for Users**

### **Deployment Security**
```bash
# Use strong passwords for database
DATABASE_URL=postgresql://user:STRONG_RANDOM_PASSWORD@host:5432/db

# Generate secure JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)

# Use secure encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Enable HTTPS in production
FORCE_HTTPS=true
```

### **Network Security**
- **Use HTTPS** for all production deployments
- **Configure firewall** to restrict access to necessary ports only
- **Use VPN** for administrative access
- **Implement network segmentation** for database access
- **Regular security audits** of network configuration

### **Access Control**
- **Principle of least privilege** - users get minimum required access
- **Regular access reviews** - remove unused accounts
- **Strong password policies** for admin accounts
- **Enable MFA** for all administrative users
- **Monitor user activity** through audit logs

### **Data Security**
- **Regular backups** with encryption
- **Secure backup storage** (offsite, encrypted)
- **Data retention policies** - delete old data
- **GDPR compliance** - respect data subject rights
- **Audit data access** - log all data operations

## 🔍 **Security Monitoring**

### **Audit Logging**
The system logs all security-relevant events:
- User authentication attempts
- Authorization failures
- Data access and modifications
- Administrative actions
- System configuration changes

### **Security Alerts**
Configure alerts for:
- Multiple failed login attempts
- Privilege escalation attempts
- Unusual data access patterns
- System configuration changes
- Failed security checks

### **Log Analysis**
```bash
# Check authentication logs
docker-compose logs backend | grep "auth"

# Monitor failed login attempts
docker-compose logs backend | grep "login_failed"

# Review audit logs
docker-compose exec database psql -U postgres -d maritime -c "
  SELECT * FROM audit_log 
  WHERE event_type IN ('login_failed', 'unauthorized_access') 
  ORDER BY created_at DESC LIMIT 50;
"
```

## 🚨 **Incident Response**

### **Security Incident Procedure**
1. **Immediate Response**
   - Isolate affected systems
   - Preserve evidence
   - Assess impact scope
   - Notify stakeholders

2. **Investigation**
   - Analyze logs and evidence
   - Determine root cause
   - Assess data exposure
   - Document findings

3. **Remediation**
   - Apply security patches
   - Update configurations
   - Reset compromised credentials
   - Implement additional controls

4. **Recovery**
   - Restore services safely
   - Monitor for recurring issues
   - Update security procedures
   - Conduct post-incident review

### **Emergency Contacts**
- **Security Team**: [security@shipdocs.app](mailto:security@shipdocs.app)
- **24/7 Hotline**: Available for enterprise customers
- **Professional Services**: [support@shipdocs.app](mailto:support@shipdocs.app)

## 📋 **Security Checklist**

### **Pre-Deployment**
- [ ] Change all default passwords
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable audit logging
- [ ] Configure backup encryption
- [ ] Review user permissions
- [ ] Test security configurations

### **Post-Deployment**
- [ ] Monitor security logs
- [ ] Regular security updates
- [ ] Backup verification
- [ ] Access review (monthly)
- [ ] Vulnerability scanning
- [ ] Penetration testing (annually)
- [ ] Security training for users

### **Ongoing Maintenance**
- [ ] Apply security patches promptly
- [ ] Review and rotate secrets
- [ ] Update security documentation
- [ ] Conduct security assessments
- [ ] Train staff on security practices
- [ ] Test incident response procedures

## 🔧 **Security Configuration**

### **Environment Variables**
```bash
# Security settings
FORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMIT_ENABLED=true

# Session security
SESSION_TIMEOUT=3600
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Password policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_UPPERCASE=true

# MFA settings
MFA_ENABLED=true
MFA_REQUIRED_FOR_ADMIN=true
```

### **Docker Security**
```yaml
# docker-compose.yml security settings
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    user: "1001:1001"
    
  database:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
```

## 📚 **Security Resources**

### **Documentation**
- **[Security Configuration Guide](docs/security/README.md)**
- **[Encryption Implementation](docs/security/encryption.md)**
- **[Audit Logging Guide](docs/security/audit-logging.md)**
- **[Incident Response Plan](docs/security/incident-response.md)**

### **Tools & Utilities**
- **Security scanner**: `npm run security:scan`
- **Dependency audit**: `npm audit`
- **Configuration check**: `npm run security:check`
- **Log analyzer**: `npm run security:analyze-logs`

### **External Resources**
- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)**
- **[NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)**
- **[CIS Controls](https://www.cisecurity.org/controls/)**
- **[Maritime Cybersecurity Guidelines](https://www.imo.org/en/OurWork/Security/Pages/Cyber-security.aspx)**

## 🏆 **Security Certifications**

We are working towards:
- **ISO 27001** compliance
- **SOC 2 Type II** certification
- **GDPR** compliance validation
- **Maritime cybersecurity** standards alignment

---

**🔒 Security is everyone's responsibility. Thank you for helping keep the maritime industry secure!**

*For urgent security matters, contact [security@shipdocs.app](mailto:security@shipdocs.app)*
