# 🔒 E2E Testing Security Guidelines

## ⚠️ CRITICAL SECURITY NOTICE

**NEVER commit real passwords or credentials to version control!**

This directory contains E2E testing configuration that requires secure credential management.

## 🛡️ Secure Setup Instructions

### 1. **Environment Variables Setup**

```bash
# Copy the example file
cp e2e-tests/.env.example e2e-tests/.env

# Edit with your secure test credentials
nano e2e-tests/.env
```

### 2. **Required Environment Variables**

```bash
# Admin Test Account
E2E_ADMIN_EMAIL=admin@shipdocs.app
E2E_ADMIN_PASSWORD=your_secure_admin_password_here

# Manager Test Account  
E2E_MANAGER_EMAIL=manager@shipdocs.app
E2E_MANAGER_PASSWORD=your_secure_manager_password_here

# Crew Test Account
E2E_CREW_EMAIL=crew@shipdocs.app
E2E_CREW_PASSWORD=your_secure_crew_password_here
```

### 3. **Security Best Practices**

#### ✅ **DO:**
- Use strong, unique passwords for test accounts
- Keep test credentials in environment variables
- Rotate test credentials regularly
- Use separate test accounts from production
- Keep `.env` files in `.gitignore`

#### ❌ **DON'T:**
- Commit passwords to version control
- Use production credentials for testing
- Share test credentials in chat/email
- Use weak or default passwords
- Store credentials in code files

## 🔧 Configuration Files

### `config.json`
- Contains non-sensitive configuration
- Uses placeholder strings for credentials
- Safe to commit to version control

### `config.js`
- Loads secure configuration at runtime
- Merges environment variables with base config
- Validates credential security

### `.env` (NOT COMMITTED)
- Contains actual test credentials
- Must be created locally
- Never committed to version control

## 🚨 Security Incident Response

If credentials are accidentally committed:

1. **Immediately rotate all exposed credentials**
2. **Remove from git history** (if possible)
3. **Update all team members**
4. **Review access logs** for unauthorized usage

## 📞 Security Contact

For security issues or questions:
- Email: security@shipdocs.app
- Create private GitHub issue
- Contact development team lead

## 🔍 Security Monitoring

This repository is monitored by:
- GitGuardian (secret detection)
- GitHub Security Advisories
- Dependabot (dependency vulnerabilities)

Any detected secrets will trigger immediate alerts.
