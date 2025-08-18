# E2E Testing Documentation

## Overview

This directory contains comprehensive end-to-end tests for the Maritime Onboarding System using Playwright. The tests cover all critical user journeys, visual regression testing, and accessibility compliance.

## Test Structure

```
tests/e2e/
├── pages/                     # Page Object Model classes
│   ├── BasePage.ts           # Base page with common functionality
│   ├── LoginPage.ts          # Login page for all user roles
│   ├── CrewOnboardingPage.ts # Crew onboarding flow pages
│   ├── AdminDashboardPage.ts # Admin dashboard and management
│   └── ManagerDashboardPage.ts # Manager dashboard and crew management
├── fixtures/                  # Test data and fixtures
│   └── testData.ts           # Centralized test data
├── helpers/                   # Test utilities and helpers
│   └── authHelper.ts         # Authentication utilities
├── utils/                     # Testing utilities
│   ├── testDataSetup.ts      # Database setup and teardown
│   ├── visualTesting.ts      # Visual regression utilities
│   └── accessibilityTesting.ts # Accessibility testing utilities
├── config/                    # Test configuration
├── .auth/                     # Authentication states (gitignored)
├── screenshots/               # Visual regression baselines
└── *.spec.ts                 # Test specifications

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e:playwright

# Run specific test file
npx playwright test tests/e2e/crew-onboarding-complete.spec.ts

# Run tests in UI mode (recommended for debugging)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run only tests matching a pattern
npx playwright test -g "crew onboarding"

# Run tests for specific project (browser)
npx playwright test --project=chromium
```

### Test Suites

```bash
# Smoke tests (critical paths only)
npx playwright test --grep @smoke

# Role-specific tests
npx playwright test tests/e2e/crew-*.spec.ts
npx playwright test tests/e2e/manager-*.spec.ts
npx playwright test tests/e2e/admin-*.spec.ts

# Visual regression tests
npx playwright test visual-accessibility.spec.ts

# Accessibility tests only
npx playwright test --grep "Accessibility Tests"
```

## Writing Tests

### Page Object Model

Always use Page Object Model for maintainable tests:

```typescript
import { test } from '@playwright/test';
import { CrewOnboardingPage } from './pages/CrewOnboardingPage';

test('crew completes onboarding', async ({ page }) => {
  const crewPage = new CrewOnboardingPage(page);
  
  await crewPage.startOnboarding();
  await crewPage.fillPersonalInformation({
    email: 'test@example.com',
    fullName: 'Test User',
    // ...
  });
  await crewPage.continueToNextStep();
});
```

### Test Tags

Use tags to categorize tests:

```typescript
test('@smoke crew can login', async ({ page }) => {
  // Critical path test
});

test('@visual landing page consistency', async ({ page }) => {
  // Visual regression test
});

test('@a11y form accessibility', async ({ page }) => {
  // Accessibility test
});
```

### Visual Testing

```typescript
const visualTesting = new VisualTesting(page);

// Take screenshot
await visualTesting.compareScreenshot('page-name');

// Compare element
await visualTesting.compareElementScreenshot('.header', 'header');

// Test responsive layouts
await visualTesting.compareResponsiveScreenshots('dashboard');
```

### Accessibility Testing

```typescript
const a11yTesting = new AccessibilityTesting(page);

// Run audit
await a11yTesting.assertNoViolations();

// Check WCAG compliance
await a11yTesting.checkWCAGCompliance('AA');

// Test keyboard navigation
await a11yTesting.testKeyboardNavigation([
  'button:first-child',
  'input[type="email"]'
]);
```

## Test Data Management

### Setup Test Data

```typescript
import { testDataSetup } from './utils/testDataSetup';

test.beforeAll(async () => {
  // Create test environment
  await testDataSetup.setupCompleteTestEnvironment();
});

test.afterAll(async () => {
  // Cleanup
  await testDataSetup.cleanup();
});
```

### Using Fixtures

```typescript
import { testUsers, generateRandomEmail } from './fixtures/testData';

const newUser = {
  ...testUsers.crew,
  email: generateRandomEmail()
};
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Daily schedule (2 AM UTC)
- Manual workflow dispatch

### GitHub Actions Workflow

The E2E tests are configured to run in parallel shards for faster execution:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

### Test Reports

- HTML reports are generated for all test runs
- Screenshots and videos captured on failure
- Accessibility reports include violation details
- Performance metrics from Lighthouse

## Debugging Tests

### VS Code Debugging

1. Install Playwright extension
2. Click on test to see debug options
3. Set breakpoints in test code

### Playwright Inspector

```bash
# Run with inspector
PWDEBUG=1 npx playwright test

# Use page.pause() in tests
await page.pause();
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Best Practices

### 1. Independent Tests
Each test should be independent and not rely on others:
```typescript
test.beforeEach(async ({ page }) => {
  // Fresh setup for each test
});
```

### 2. Explicit Waits
Use Playwright's auto-waiting, avoid arbitrary timeouts:
```typescript
// Good
await page.waitForSelector('.loading', { state: 'hidden' });

// Avoid
await page.waitForTimeout(5000);
```

### 3. Meaningful Assertions
Write clear, specific assertions:
```typescript
// Good
await expect(page.locator('.success-message'))
  .toContainText('Onboarding completed successfully');

// Less clear
await expect(page.locator('.message')).toBeVisible();
```

### 4. Test Data Isolation
Use unique data for each test:
```typescript
const uniqueEmail = `test-${Date.now()}@example.com`;
```

### 5. Error Handling
Handle expected errors gracefully:
```typescript
await expect(async () => {
  await page.click('.non-existent');
}).rejects.toThrow();
```

## Environment Variables

Create `.env.test` for test-specific configuration:

```env
BASE_URL=http://localhost:3000
SETUP_TEST_DATA=true
TEST_PARALLEL=true
HEADLESS=true
```

## Troubleshooting

### Common Issues

1. **Tests timeout locally**
   - Ensure dev server is running: `npm run dev`
   - Check BASE_URL in configuration

2. **Visual tests fail**
   - Update snapshots: `npx playwright test --update-snapshots`
   - Check for OS-specific rendering differences

3. **Flaky tests**
   - Use explicit waits instead of timeouts
   - Check for race conditions
   - Use test.retry() for known flaky operations

4. **Authentication issues**
   - Clear browser state between tests
   - Use auth fixtures for consistent state

### Getting Help

- Playwright docs: https://playwright.dev
- Project issues: GitHub issues
- Team channel: #testing

## Maintenance

### Weekly Tasks
- Review and update flaky tests
- Update visual regression baselines
- Check accessibility violations

### Monthly Tasks
- Update Playwright and dependencies
- Review test coverage
- Optimize slow tests

### Before Release
- Run full test suite
- Update test data
- Verify all critical paths