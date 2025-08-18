# Security Remediation Steps - Maritime Onboarding System

## Manual Steps to Fix Security Vulnerabilities

### Step 1: Apply Security Overrides for Client Dependencies

The client/package.json has been updated with security overrides. You need to reinstall dependencies:

```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Verify Security Fixes

After installation, run:

```bash
# Check root dependencies
npm audit

# Check client dependencies
cd client
npm audit
```

### Step 3: Run Tests

Ensure nothing is broken:

```bash
# From root directory
npm test
npm run test:integration
npm run test:e2e:playwright
```

### Step 4: Test Critical Flows Manually

1. **Authentication Flow**:
   - Test magic link login
   - Test JWT token generation
   - Test role-based access

2. **File Operations**:
   - Test file upload (ensure formidable is secure)
   - Test PDF generation
   - Test file download

3. **Email Functionality**:
   - Test email sending via MailerSend
   - Test SMTP fallback

### Step 5: Commit Security Updates

If all tests pass:

```bash
git add -A
git commit -m "fix: apply security updates to resolve npm vulnerabilities

- Updated react-scripts transitive dependencies to fix CVE-2021-3803 (High)
- Fixed nth-check ReDoS vulnerability by overriding to v2.1.1
- Fixed css-what ReDoS vulnerability by overriding to v6.1.0
- Updated @svgr/webpack to v6.5.1 to resolve dependency chain issues

All core dependencies (bcrypt, axios, nodemailer, jsonwebtoken) are using secure versions."
```

### Step 6: Deploy to Testing Environment

```bash
# Deploy to testing environment first
vercel --prod --env=testing
```

### Step 7: Monitor for New Vulnerabilities

Set up ongoing monitoring:

1. **Enable GitHub Dependabot**:
   - Go to Settings → Security & analysis
   - Enable Dependabot alerts
   - Enable Dependabot security updates

2. **Add to CI/CD Pipeline**:
   ```yaml
   # Add to your CI/CD config
   - name: Security Audit
     run: |
       npm audit --audit-level=moderate
       cd client && npm audit --audit-level=moderate
   ```

3. **Weekly Manual Checks**:
   ```bash
   npm outdated
   npm audit
   ```

## Summary of Applied Fixes

1. **Client package.json** - Added overrides section to force secure versions of transitive dependencies
2. **Documentation** - Created comprehensive security audit report
3. **Scripts** - Created helper scripts for vulnerability checking

## Remaining Considerations

1. **react-scripts Migration**: Consider migrating away from Create React App as it's in maintenance mode
2. **Regular Updates**: Implement a monthly dependency update schedule
3. **Security Headers**: Ensure proper CSP and security headers are configured in Vercel
4. **Environment Variables**: Verify all secrets are properly stored in environment variables

## Contact for Issues

If you encounter any issues during remediation:
1. Check the test output for specific failures
2. Review the browser console for client-side errors
3. Check server logs for API errors
4. Rollback using the backup files if needed