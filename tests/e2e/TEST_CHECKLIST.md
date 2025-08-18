# E2E Test Checklist

## Before Release Checklist

### 🔍 Test Coverage
- [ ] All critical user journeys have E2E tests
- [ ] Smoke tests pass on all browsers
- [ ] Visual regression tests show no unexpected changes
- [ ] Accessibility tests pass with no critical violations
- [ ] Performance metrics meet thresholds

### 🌐 Cross-Browser Testing
- [ ] Chrome/Chromium ✅
- [ ] Firefox ✅
- [ ] Safari/Webkit ✅
- [ ] Edge ✅
- [ ] Mobile Chrome ✅
- [ ] Mobile Safari ✅

### 📱 Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### 🔐 Authentication Flows
- [ ] Admin login/logout
- [ ] Manager login/logout
- [ ] Crew magic link authentication
- [ ] Session timeout handling
- [ ] Invalid credentials handling
- [ ] MFA flow (if enabled)

### 👥 Role-Based Access
- [ ] Admin can access all areas
- [ ] Manager can only access company data
- [ ] Crew can only access own profile
- [ ] Unauthorized access is blocked
- [ ] Proper error messages shown

### 📝 Crew Onboarding Journey
- [ ] Magic link request and receipt
- [ ] Personal information form submission
- [ ] Document upload functionality
- [ ] Training module completion
- [ ] Quiz taking and scoring
- [ ] Certificate generation
- [ ] Progress persistence
- [ ] Resume from interruption

### 🏢 Admin Functions
- [ ] Company CRUD operations
- [ ] Manager account creation
- [ ] Workflow management
- [ ] Report generation
- [ ] Data export functionality
- [ ] Settings management

### 👔 Manager Functions
- [ ] Crew invitation sending
- [ ] Bulk operations
- [ ] Progress monitoring
- [ ] Workflow assignment
- [ ] Report viewing
- [ ] Crew data export

### 🌍 Internationalization
- [ ] English language display
- [ ] Dutch language display
- [ ] Language switching
- [ ] Proper translations
- [ ] Date/time formatting
- [ ] Number formatting

### ♿ Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Skip links functional
- [ ] Forms properly labeled

### 🎨 Visual Consistency
- [ ] No visual regressions
- [ ] Consistent styling across pages
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Dark mode (if applicable)

### ⚡ Performance
- [ ] Page load times < 3s
- [ ] Time to Interactive < 5s
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] No layout shifts
- [ ] Images optimized

### 🔍 Error Handling
- [ ] Network errors handled gracefully
- [ ] API errors show user-friendly messages
- [ ] Form validation works correctly
- [ ] 404 pages display properly
- [ ] Session expiry handled
- [ ] Retry mechanisms work

### 📊 Data Management
- [ ] Data persists correctly
- [ ] Updates reflect immediately
- [ ] Deletes confirm before action
- [ ] Search functionality works
- [ ] Filtering works correctly
- [ ] Pagination works
- [ ] Sorting works

### 🔄 Integration Points
- [ ] Email sending (magic links)
- [ ] File upload/download
- [ ] PDF generation
- [ ] QR code generation
- [ ] External API calls

## Test Execution Steps

### 1. Pre-Test Setup
```bash
# Install dependencies
npm install

# Set up test environment
cp .env.example .env.test
npm run test:e2e:setup

# Start dev server
npm run dev
```

### 2. Run Test Suites
```bash
# Quick smoke test
npm run test:e2e:playwright:smoke

# Full test suite
npm run test:e2e:playwright

# Visual regression
./scripts/run-e2e-tests.sh visual

# Accessibility
./scripts/run-e2e-tests.sh a11y
```

### 3. Review Results
```bash
# Open test report
npm run test:e2e:playwright:report

# Check screenshots
ls tests/e2e/screenshots/

# Review accessibility violations
grep -r "accessibility violations" test-results/
```

### 4. Fix Issues
- [ ] Fix failing tests
- [ ] Update visual baselines if needed
- [ ] Address accessibility violations
- [ ] Optimize slow tests
- [ ] Document any known issues

### 5. Final Verification
```bash
# Run all tests one more time
npm run test:e2e:playwright

# Verify in CI environment
npm run test:e2e:playwright -- --config=playwright.config.ci.ts
```

## Sign-off

- [ ] All tests passing
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] Cross-browser compatible
- [ ] Mobile responsive
- [ ] Security verified

**Tested by:** _________________  
**Date:** _________________  
**Version:** _________________  
**Environment:** _________________

## Notes
_Add any additional notes, known issues, or considerations here_