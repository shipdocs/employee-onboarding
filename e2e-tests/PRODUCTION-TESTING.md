# 🚢 Maritime Onboarding Production E2E Testing Guide

## 🎯 Overview

This comprehensive E2E testing suite validates the Maritime Onboarding System in production environment with real admin credentials and test user creation.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Production system deployed at: https://onboarding.burando.online
- Admin credentials: `adminmartexx@shipdocs.app` / `Yumminova211@#`

### Run Comprehensive Production Tests
```bash
cd e2e-tests
npm run test:prod-comprehensive
```

## 📋 Test Phases

### Phase 1: Admin Setup and Manager Creation
- ✅ Admin login with correct UI flow (Need help → Administrator login)
- ✅ Create test manager: `e2etest-manager@shipdocs.app`
- ✅ Verify test manager creation
- ✅ Request magic link for test manager
- ✅ Extract magic link from console/network logs

### Phase 2: Enhanced Authentication Testing
- ✅ Admin login flow validation
- ✅ Magic link request with toast verification
- ✅ Magic link completion testing
- ✅ Loading states during authentication
- ✅ Error handling for invalid inputs

### Phase 3: Manager Workflow Testing
- ✅ Manager magic link login
- ✅ Manager dashboard access
- ✅ Create crew members
- ✅ Request magic links for crew
- ✅ Manager logout functionality

### Phase 4: Crew Workflow Testing
- ✅ Crew magic link login
- ✅ Crew dashboard access
- ✅ Training phase access
- ✅ Progress tracking
- ✅ Certificate generation
- ✅ Crew logout functionality

### Phase 5: Training Workflow Testing
- ✅ Dashboard access verification
- ✅ Training phase cards detection
- ✅ Progress tracking functionality
- ✅ Phase navigation testing
- ✅ Certificate generation availability
- ✅ Logout functionality

### Phase 6: Comprehensive Authentication (Original)
- ✅ Multi-role authentication testing
- ✅ Session management
- ✅ Magic link workflows

### Phase 7: Crew Onboarding (Original)
- ✅ Complete onboarding workflow
- ✅ Offline functionality
- ✅ Multi-language support

## 🔗 Magic Link Testing

### Automated Magic Link Extraction
The tests will attempt to capture magic links from:
- Console logs
- Network requests
- Email notifications (if configured)

### Manual Magic Link Testing
1. Run the test suite
2. When prompted, check email for `e2etest@shipdocs.app`
3. Copy the magic link URL from the email
4. Set environment variable:
   ```bash
   export MAGIC_LINK_URL="https://onboarding.burando.online/login?token=YOUR_TOKEN"
   ```
5. Re-run tests for complete validation

### Example Magic Link Usage
```bash
# Set the magic link from email
export MAGIC_LINK_URL="https://onboarding.burando.online/login?token=abc123def456"

# Run tests with magic link
npm run test:prod-comprehensive
```

## 📊 Test Results

### Success Criteria
- **Admin Setup**: 100% success rate
- **Authentication**: >80% success rate
- **Training Workflow**: >70% success rate
- **Overall**: >75% success rate

### Report Generation
Tests automatically generate comprehensive reports:
- JSON report: `reports/production-test-report-YYYY-MM-DD-HHMMSS.json`
- Screenshots: `reports/screenshots/`
- Videos: `reports/videos/` (if enabled)

## 🎯 Expected Results

### ✅ What Should Work
1. **Admin Login**: Complete flow through hidden UI
2. **Test User Creation**: Successfully create `e2etest@shipdocs.app`
3. **Magic Link Requests**: Send magic links with toast confirmation
4. **Basic Navigation**: Login pages, help flows, form submissions
5. **Error Handling**: Invalid email validation, error messages

### ⚠️ Known Issues to Validate
1. **Magic Link Completion**: May require manual intervention
2. **Training Access**: Depends on successful authentication
3. **Progress Tracking**: Requires authenticated user state
4. **Certificate Generation**: Needs completed training phases

## 🔧 Troubleshooting

### Admin Login Issues
```bash
# Check admin credentials
curl -X POST https://onboarding.burando.online/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"adminmartexx@shipdocs.app","password":"Yumminova211@#"}'
```

### Magic Link Issues
```bash
# Check magic link API
curl -X POST https://onboarding.burando.online/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"e2etest@shipdocs.app"}'
```

### Test User Issues
- Check if user already exists in database
- Verify email domain `@shipdocs.app` is allowed
- Ensure admin has user creation permissions

## 📈 Continuous Integration

### GitHub Actions Integration
```yaml
name: Production E2E Tests
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd e2e-tests && npm install
      - run: cd e2e-tests && npm run test:prod-comprehensive
        env:
          MAGIC_LINK_URL: ${{ secrets.MAGIC_LINK_URL }}
```

### Local Development
```bash
# Run with debug mode (browser visible)
cd e2e-tests
node production-test-runner.js

# Run headless for CI
cd e2e-tests
HEADLESS=true node production-test-runner.js
```

## 🎯 Action Items Based on Test Results

### Priority 1: Critical Issues
- [ ] Fix magic link completion flow
- [ ] Ensure admin login works consistently
- [ ] Verify training dashboard access

### Priority 2: User Experience
- [ ] Add loading states during authentication
- [ ] Improve magic link confirmation messages
- [ ] Add logout buttons to all authenticated pages

### Priority 3: Testing Infrastructure
- [ ] Add more `data-testid` attributes
- [ ] Implement automated magic link extraction
- [ ] Add performance monitoring

## 📞 Support

### Test Failures
1. Check the generated report for specific error details
2. Review screenshots in `reports/screenshots/`
3. Verify production system is accessible
4. Confirm admin credentials are valid

### Magic Link Testing
1. Ensure email delivery is working
2. Check spam/junk folders
3. Verify `@shipdocs.app` domain configuration
4. Test with different email providers

### Contact
- **Development Team**: Check test reports and screenshots
- **System Admin**: Verify production deployment status
- **Email Admin**: Confirm email delivery configuration

---

## 🎉 Success Metrics

**Target Goals:**
- 📊 **Overall Success Rate**: >75%
- 🔐 **Admin Authentication**: 100%
- 📧 **Magic Link Requests**: 100%
- 🚢 **Training Access**: >70%
- 📱 **User Experience**: >80%

**Quality Indicators:**
- All critical user flows functional
- Clear error messages for failures
- Responsive UI across test scenarios
- Proper authentication state management
- Maritime-specific features working

Run the tests and achieve these metrics to ensure production readiness! 🧪⚓✨
