# Security Audit Report - Maritime Onboarding System
Date: 2025-07-02

## Executive Summary

This security audit was conducted to identify and remediate vulnerabilities in the npm dependencies of the maritime onboarding project. The audit examined both the root project dependencies and the React client dependencies.

## Audit Methodology

1. Manual dependency version checking against known CVE databases
2. Analysis of dependency trees for transitive vulnerabilities
3. Review of GitHub Advisory Database for recent security alerts
4. Verification of current package versions against patched versions

## Findings

### 1. Root Project Dependencies

#### ✅ SECURE - No Known Vulnerabilities:
- **bcrypt@6.0.0**: Not affected by CVE-2020-7689 (fixed in v5.0.0)
- **axios@1.8.2**: Not affected by CVE-2024-39338 (fixed in v1.7.4)
- **nodemailer@7.0.3**: Not affected by CVE-2020-7769 (fixed in v6.4.16)
- **jsonwebtoken@9.0.2**: Latest stable version, no known vulnerabilities
- **@supabase/supabase-js@2.49.8**: Recent version, no known vulnerabilities

#### ⚠️ DEPENDENCIES TO MONITOR:
- **next@15.3.3**: Very recent version (Next.js 15), should monitor for early-release issues
- **formidable@3.5.4**: Should verify no file upload vulnerabilities

### 2. Client Dependencies

#### 🔴 HIGH PRIORITY - Known Vulnerabilities:

**react-scripts@5.0.1** has several transitive dependency vulnerabilities:
- **CVE-2021-3803** (High): ReDoS in nth-check@1.0.2
- **CVE-2021-33587** (Medium): ReDoS in css-what
- Additional RegEx DoS vulnerabilities in terser and nwsapi

#### ✅ SECURE - No Known Vulnerabilities:
- **react@18.3.1**: Latest React version
- **axios@1.9.0**: Newer than the root version, secure
- **dompurify@3.2.6**: Recent version, actively maintained
- **pdfjs-dist@4.8.69**: Recent version

### 3. GitHub Security Tab Analysis

Based on the information provided:
- 1 High severity vulnerability
- 4 Moderate severity vulnerabilities

These are likely related to the react-scripts transitive dependencies identified above.

## Remediation Plan

### Immediate Actions (High Priority)

1. **Update react-scripts dependencies**:
   Add to `client/package.json`:
   ```json
   "overrides": {
     "react-scripts": {
       "@svgr/webpack": "6.5.1",
       "nth-check": "^2.1.1",
       "css-what": "^6.1.0"
     }
   }
   ```

2. **Verify formidable security**:
   - Check for any file upload size limits
   - Ensure proper file type validation
   - Verify temporary file cleanup

### Short-term Actions (Medium Priority)

1. **Create automated security monitoring**:
   - Set up GitHub Dependabot alerts
   - Configure npm audit in CI/CD pipeline
   - Add pre-commit hooks for security checks

2. **Update package.json scripts**:
   - Add `"audit:fix": "npm audit fix --force"` for emergency fixes
   - Add `"audit:production": "npm audit --production"` for production-only audit

### Long-term Actions (Low Priority)

1. **Consider migrating from react-scripts**:
   - react-scripts (Create React App) is in maintenance mode
   - Consider migrating to Vite or Next.js for the client

2. **Implement dependency update strategy**:
   - Monthly security patch updates
   - Quarterly minor version updates
   - Annual major version updates with thorough testing

## Testing Strategy After Updates

1. **Unit Tests**: Run `npm test` to ensure no breaking changes
2. **Integration Tests**: Run `npm run test:integration`
3. **E2E Tests**: Run `npm run test:e2e:playwright`
4. **Manual Testing**: Test critical flows:
   - Authentication (magic links)
   - File upload/download
   - PDF generation
   - Email sending

## Security Best Practices Recommendations

1. **Dependency Management**:
   - Use exact versions in production (`npm config set save-exact true`)
   - Regularly run `npm audit` (weekly in CI/CD)
   - Keep dependencies minimal

2. **Supply Chain Security**:
   - Verify package authenticity before installing
   - Use npm's package signing features
   - Monitor for typosquatting attacks

3. **Runtime Security**:
   - Implement Content Security Policy (CSP)
   - Use environment variables for secrets
   - Enable HTTPS everywhere
   - Implement rate limiting on APIs

## Conclusion

The maritime onboarding system has relatively few security vulnerabilities, primarily concentrated in the react-scripts transitive dependencies. The core dependencies (authentication, database, email) are using secure versions. With the recommended immediate actions, the system's security posture will be significantly improved.

The most critical action is addressing the react-scripts vulnerabilities by overriding the problematic transitive dependencies. This should resolve the GitHub-detected vulnerabilities.

## Appendix: Commands for Remediation

```bash
# Apply overrides to client
cd client
npm install

# Verify fixes
npm audit

# Run tests
cd ..
npm test

# Deploy after verification
npm run deploy
```