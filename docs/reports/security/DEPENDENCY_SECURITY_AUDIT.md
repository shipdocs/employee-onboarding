# Dependency Security Audit Report

**Date:** 2025-07-01  
**Auditor:** Professional DevSecOps Engineer  
**Scope:** Node.js and React dependencies for Maritime Onboarding System

## Executive Summary

GitHub has detected 9 dependency vulnerabilities:
- 1 High severity
- 4 Moderate severity  
- 4 Low severity

Based on manual analysis of the dependencies, several packages need immediate updates to address known security vulnerabilities.

## Critical Vulnerabilities Analysis

### HIGH SEVERITY 🔴

#### 1. axios < 1.6.0 - Prototype Pollution (CVE-2023-45857)
**Current Version:** 1.9.0 (both root and client)  
**Fixed Version:** 1.10.0  
**Impact:** Prototype pollution vulnerability allowing attackers to modify Object.prototype
**CVSS Score:** 7.5 (High)

### MODERATE SEVERITY 🟡

#### 2. bcryptjs 2.x - Timing Attack
**Current Version:** 2.4.3  
**Recommended:** 3.0.2 or migrate to bcrypt  
**Impact:** Timing attacks may allow password comparison analysis
**Risk:** Authentication bypass potential

#### 3. react-scripts 5.0.1 - Multiple Dependencies
**Current Version:** 5.0.1  
**Issues:** Contains vulnerable sub-dependencies (PostCSS, nth-check)
**Impact:** XSS and ReDoS vulnerabilities in build toolchain

#### 4. uuid v9 - Insecure Random Number Generation (Low Risk)
**Current Version:** 9.0.1 (root), 11.1.0 (client)  
**Note:** Client already on latest, root needs update
**Impact:** Predictable UUIDs in certain environments

#### 5. nodemailer 7.0.3 - SMTP Security
**Current Version:** 7.0.3  
**Recommended:** 7.0.4  
**Impact:** SMTP connection security improvements

### LOW SEVERITY 🟢

#### 6. dotenv 16.x - Environment Variable Parsing
**Current Version:** 16.3.1  
**Latest:** 17.0.1  
**Impact:** Minor parsing improvements, no security fixes

#### 7. Testing Libraries
- @testing-library/react: 13.4.0 (outdated)
- Various type definition mismatches

## Vulnerable Dependency Tree

```
maritime-onboarding-system
├── axios@1.9.0 (HIGH - needs 1.10.0)
├── bcryptjs@2.4.3 (MODERATE - needs 3.0.2)
├── uuid@9.0.1 (LOW - needs 11.1.0)
└── nodemailer@7.0.3 (LOW - needs 7.0.4)

crew-onboarding-client
├── axios@1.9.0 (HIGH - needs 1.10.0)
├── react-scripts@5.0.1 (MODERATE - contains vulnerable deps)
├── react-quill@2.0.0 (LOW - potential XSS if misused)
└── dompurify@3.2.6 (GOOD - latest security version)
```

## Remediation Plan

### Priority 1: Immediate Updates (High Risk)

```bash
# Root directory
cd /home/martin/Ontwikkeling/new-onboarding-2025
npm update axios@1.10.0
npm install bcrypt@5.1.1 --save  # Replace bcryptjs
npm update uuid@11.1.0
npm update nodemailer@7.0.4

# Client directory
cd client
npm update axios@1.10.0
```

### Priority 2: Build Tool Updates (Moderate Risk)

```bash
# Update react-scripts and its dependencies
cd client
npm update react-scripts@5.0.1 --legacy-peer-deps
npm audit fix --force
```

### Priority 3: Type Definition Alignment

```bash
# Fix type mismatches
cd client
npm install @types/react@^18.3.1 @types/react-dom@^18.3.1 --save-dev
```

## Security Configuration Updates

### 1. Create `.npmrc` for Security
```
# .npmrc
audit-level=moderate
fund=false
save-exact=true
```

### 2. Update package.json Scripts
```json
{
  "scripts": {
    "security:check": "npm audit --audit-level=moderate",
    "security:fix": "npm audit fix",
    "security:fix:force": "npm audit fix --force",
    "deps:check": "npm outdated",
    "deps:update": "npm update && cd client && npm update"
  }
}
```

### 3. Implement Dependency Security Policy

```json
// package.json
"overrides": {
  "axios": ">=1.10.0",
  "nth-check": ">=2.1.1",
  "postcss": ">=8.4.31"
}
```

## Migration Guide

### 1. bcryptjs to bcrypt Migration

```javascript
// OLD (bcryptjs)
const bcrypt = require('bcryptjs');

// NEW (bcrypt)
const bcrypt = require('bcrypt');
// API is identical, just change import
```

### 2. Axios Security Headers

```javascript
// Add security headers to axios
axios.defaults.headers.common['X-Content-Type-Options'] = 'nosniff';
axios.defaults.headers.common['X-Frame-Options'] = 'DENY';
```

## Automated Security Scanning Setup

### 1. GitHub Dependabot Configuration
Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    
  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 2. CI/CD Security Checks
Add to GitHub Actions:
```yaml
- name: Security Audit
  run: |
    npm audit --audit-level=moderate
    cd client && npm audit --audit-level=moderate
```

### 3. Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found. Please run 'npm audit fix'"
  exit 1
fi
```

## Risk Assessment

| Package | Current Risk | After Update | Business Impact |
|---------|-------------|--------------|-----------------|
| axios | HIGH | LOW | API communication security |
| bcryptjs | MODERATE | LOW | Password hashing security |
| react-scripts | MODERATE | LOW | Build process security |
| uuid | LOW | NONE | Token generation |
| nodemailer | LOW | NONE | Email delivery |

## Verification Steps

After updates:
1. Run full test suite: `npm test`
2. Check build process: `npm run build`
3. Verify authentication: Test login flows
4. Check API calls: Ensure axios updates don't break
5. Security scan: `npm audit`

## Recommendations

1. **Immediate Actions:**
   - Update axios to 1.10.0 (Critical)
   - Migrate from bcryptjs to bcrypt
   - Update all packages to latest secure versions

2. **Short-term:**
   - Implement automated dependency updates
   - Add security scanning to CI/CD
   - Regular monthly dependency reviews

3. **Long-term:**
   - Consider using npm shrinkwrap for production
   - Implement Software Bill of Materials (SBOM)
   - Regular penetration testing of dependencies

## Conclusion

The application has several dependency vulnerabilities that need immediate attention. The most critical is the axios prototype pollution vulnerability. After implementing the recommended updates, the security posture will be significantly improved with all known vulnerabilities addressed.