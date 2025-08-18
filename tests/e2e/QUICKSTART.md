# E2E Testing Quick Start Guide

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install
   ```

3. **Install System Dependencies** (Linux/WSL)
   ```bash
   sudo npx playwright install-deps
   ```

## Running Your First Test

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Run Smoke Tests
```bash
./scripts/run-e2e-tests.sh smoke
```

Or using npm:
```bash
npm run test:e2e:playwright:headed
```

## Quick Commands

### Interactive UI Mode (Recommended for Development)
```bash
npx playwright test --ui
```
This opens a UI where you can:
- See all tests
- Run individual tests
- Debug with breakpoints
- View test results

### Run Specific Test File
```bash
npx playwright test tests/e2e/smoke.spec.ts
```

### Run Tests by Tag
```bash
# Smoke tests only
npx playwright test --grep @smoke

# Skip smoke tests
npx playwright test --grep-invert @smoke
```

### Debug a Test
```bash
# Opens Playwright Inspector
PWDEBUG=1 npx playwright test tests/e2e/smoke.spec.ts
```

## Writing Your First Test

Create a new file `tests/e2e/my-feature.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/my-page');
    
    // Interact with elements
    await page.click('button:has-text("Click Me")');
    
    // Assert results
    await expect(page.locator('.result')).toContainText('Success');
  });
});
```

## Using Page Objects

```typescript
import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('login as admin', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.gotoLoginPage('admin');
  await loginPage.loginWithCredentials('admin@test.com', 'password');
  await loginPage.waitForLoginRedirect();
});
```

## Common Issues

### Tests Can't Find Elements
- Use Playwright's test generator: `npx playwright codegen`
- Check selectors in DevTools
- Use data-testid attributes for reliable selection

### Tests are Flaky
- Use explicit waits: `await page.waitForSelector('.loaded')`
- Avoid `waitForTimeout()`
- Check for race conditions

### Visual Tests Fail
- Update snapshots: `npx playwright test --update-snapshots`
- Check OS differences if tests pass locally but fail in CI

## Tips

1. **Use the Playwright VS Code Extension**
   - Install "Playwright Test for VSCode"
   - Run tests directly from the editor
   - Debug with breakpoints

2. **Record Tests**
   ```bash
   npx playwright codegen http://localhost:3000
   ```

3. **View Test Report**
   ```bash
   npx playwright show-report
   ```

4. **Check Accessibility**
   Run accessibility tests regularly:
   ```bash
   npx playwright test visual-accessibility.spec.ts --grep "Accessibility"
   ```

## Need Help?

- Playwright Docs: https://playwright.dev/docs/intro
- Test Examples: See existing `*.spec.ts` files
- Page Objects: Check `tests/e2e/pages/` directory
- Team Support: Ask in #testing channel