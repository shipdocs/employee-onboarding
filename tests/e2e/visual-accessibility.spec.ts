/**
 * Visual and Accessibility E2E Tests
 * Tests visual regression and accessibility compliance
 */

import { test, expect } from '@playwright/test';
import { VisualTesting } from './utils/visualTesting';
import { AccessibilityTesting } from './utils/accessibilityTesting';
import { LoginPage } from './pages/LoginPage';
import { CrewOnboardingPage } from './pages/CrewOnboardingPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';

test.describe('Visual Regression Tests', () => {
  let visualTesting: VisualTesting;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page);
    await visualTesting.disableAnimations();
    await visualTesting.hideScrollbars();
  });

  test('landing page visual consistency', async ({ page }) => {
    await page.goto('/');
    await visualTesting.waitForImages();
    
    // Test responsive layouts
    await visualTesting.compareResponsiveScreenshots('landing-page', {
      devices: ['desktop', 'tablet', 'mobile']
    });
  });

  test('login forms visual consistency', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Admin login
    await loginPage.gotoLoginPage('admin');
    await visualTesting.compareScreenshot('admin-login', {
      mask: ['.version-number', '.copyright-year']
    });
    
    // Manager login
    await loginPage.gotoLoginPage('manager');
    await visualTesting.compareScreenshot('manager-login');
    
    // Crew access
    await loginPage.gotoLoginPage('crew');
    await visualTesting.compareScreenshot('crew-access');
  });

  test('crew onboarding steps visual consistency', async ({ page }) => {
    const crewPage = new CrewOnboardingPage(page);
    await crewPage.startOnboarding('test-token');
    
    // Personal information step
    await visualTesting.compareScreenshot('onboarding-personal-info');
    
    // Test form states
    await visualTesting.compareFormStates('form', 'personal-info-form');
    
    // Navigate through steps
    const steps = ['documents', 'training', 'quiz'];
    for (const step of steps) {
      await crewPage.navigateToStep(step as any);
      await visualTesting.compareScreenshot(`onboarding-${step}`);
    }
  });

  test('dashboard visual consistency', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-admin-token');
    });
    
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.gotoDashboard();
    
    // Dashboard overview
    await visualTesting.compareScreenshot('admin-dashboard', {
      mask: ['.real-time-stats', '.timestamp']
    });
    
    // Test hover states on navigation
    await visualTesting.compareHoverState('nav a:first-child', 'nav-link');
  });

  test('dark mode visual consistency', async ({ page }) => {
    await page.goto('/');
    
    // Compare light and dark modes
    await visualTesting.compareDarkMode('homepage');
  });

  test('loading states visual consistency', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/crew/profile', async route => {
      await page.waitForTimeout(2000);
      await route.fulfill({ status: 200, body: '{}' });
    });
    
    await page.goto('/crew/dashboard');
    await visualTesting.compareLoadingStates('crew-dashboard');
  });

  test('error states visual consistency', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Trigger login error
    await loginPage.gotoLoginPage('admin');
    await loginPage.loginWithCredentials('invalid@example.com', 'wrongpassword');
    
    await visualTesting.compareScreenshot('login-error-state');
  });
});

test.describe('Accessibility Tests', () => {
  let accessibilityTesting: AccessibilityTesting;

  test.beforeEach(async ({ page }) => {
    accessibilityTesting = new AccessibilityTesting(page);
  });

  test('landing page accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Run full accessibility audit
    await accessibilityTesting.assertNoViolations({
      allowedImpacts: ['minor']
    });
    
    // Check WCAG compliance
    await accessibilityTesting.checkWCAGCompliance('AA');
    
    // Test keyboard navigation
    await accessibilityTesting.testKeyboardNavigation([
      'a[href="/crew"]',
      'a[href="/manager/login"]',
      'a[href="/admin/login"]',
      'button:has-text("Get Started")'
    ]);
    
    // Test heading hierarchy
    await accessibilityTesting.testHeadingHierarchy();
  });

  test('login forms accessibility', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Test each login form
    const roles: Array<'admin' | 'manager' | 'crew'> = ['admin', 'manager', 'crew'];
    
    for (const role of roles) {
      await loginPage.gotoLoginPage(role);
      
      // Run accessibility audit
      await accessibilityTesting.assertNoViolations();
      
      // Test form accessibility
      await accessibilityTesting.testFormAccessibility('form');
      
      // Test focus indicators
      await accessibilityTesting.testFocusIndicators([
        'input[type="email"]',
        'input[type="password"]',
        'button[type="submit"]'
      ]);
    }
  });

  test('crew onboarding accessibility', async ({ page }) => {
    const crewPage = new CrewOnboardingPage(page);
    await crewPage.startOnboarding('test-token');
    
    // Test each step
    const steps = ['personal', 'documents', 'training', 'quiz'];
    
    for (const step of steps) {
      await crewPage.navigateToStep(step as any);
      
      // Run accessibility audit
      await accessibilityTesting.assertNoViolations({
        allowedViolations: ['color-contrast'] // May have branded colors
      });
      
      // Test screen reader labels
      await accessibilityTesting.testScreenReaderLabels();
      
      // Test ARIA compliance
      await accessibilityTesting.testARIACompliance();
    }
  });

  test('dashboard accessibility', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-admin-token');
    });
    
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.gotoDashboard();
    
    // Run accessibility audit
    await accessibilityTesting.assertNoViolations();
    
    // Test skip links
    await accessibilityTesting.testSkipLinks();
    
    // Test landmark regions
    await accessibilityTesting.testLandmarks();
    
    // Test keyboard navigation for dashboard actions
    await accessibilityTesting.testKeyboardNavigation([
      'button:has-text("Add Company")',
      'button:has-text("Export")',
      'input[type="search"]'
    ]);
  });

  test('color contrast compliance', async ({ page }) => {
    await page.goto('/');
    
    // Test color contrast across the application
    await accessibilityTesting.checkColorContrast();
  });

  test('responsive text sizing', async ({ page }) => {
    await page.goto('/');
    
    // Test text can be resized to 200%
    await accessibilityTesting.testTextResize();
  });

  test('form validation accessibility', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage('admin');
    
    // Submit empty form to trigger validation
    await page.click('button[type="submit"]');
    
    // Check error messages are announced
    const violations = await accessibilityTesting.audit({
      runOnly: ['aria-invalid', 'aria-describedby']
    });
    
    expect(violations).toHaveLength(0);
  });

  test('modal dialog accessibility', async ({ page }) => {
    // Navigate to a page with modals
    await page.goto('/admin/dashboard');
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-admin-token');
    });
    
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.navigateToSection('companies');
    
    // Open modal
    await page.click('button:has-text("Add Company")');
    
    // Test modal accessibility
    const violations = await accessibilityTesting.audit({
      runOnly: ['aria-hidden', 'role', 'focus-order-semantics']
    });
    
    expect(violations).toHaveLength(0);
    
    // Test focus trap
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('data table accessibility', async ({ page }) => {
    await page.goto('/manager/crew');
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-manager-token');
    });
    
    // Test table structure
    const violations = await accessibilityTesting.audit({
      runOnly: ['table-duplicate-name', 'td-headers-attr', 'th-has-data-cells']
    });
    
    expect(violations).toHaveLength(0);
  });

  test('generate accessibility report', async ({ page }) => {
    await page.goto('/');
    
    // Generate comprehensive report
    const report = await accessibilityTesting.generateReport();
    
    console.log('\n📊 Accessibility Report Summary:');
    console.log(`✅ Passed: ${report.summary.passes}`);
    console.log(`❌ Violations: ${report.summary.violations}`);
    console.log(`⚠️ Incomplete: ${report.summary.incomplete}`);
    
    // Fail test if critical violations exist
    const criticalViolations = report.details.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(criticalViolations).toHaveLength(0);
  });
});

test.describe('Combined Visual and Accessibility Tests', () => {
  test('test complete user journey with visual and a11y checks', async ({ page }) => {
    const visualTesting = new VisualTesting(page);
    const accessibilityTesting = new AccessibilityTesting(page);
    const loginPage = new LoginPage(page);
    
    // Landing page
    await page.goto('/');
    await visualTesting.compareScreenshot('journey-landing');
    await accessibilityTesting.assertNoViolations();
    
    // Navigate to crew access
    await page.click('a:has-text("Crew Member")');
    await visualTesting.compareScreenshot('journey-crew-access');
    await accessibilityTesting.checkWCAGCompliance('AA');
    
    // Request magic link
    await loginPage.requestMagicLink('test@example.com');
    await visualTesting.compareScreenshot('journey-magic-link-sent');
    
    // Check final accessibility
    const report = await accessibilityTesting.generateReport();
    expect(report.summary.violations).toBe(0);
  });
});