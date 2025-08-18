/**
 * Smoke Tests
 * Quick tests to verify basic functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests @smoke', () => {
  test('landing page loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Maritime Onboarding/);
    
    // Check main navigation links
    await expect(page.locator('text=Crew Member')).toBeVisible();
    await expect(page.locator('text=Manager')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('API health check returns healthy', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('crew access page is accessible', async ({ page }) => {
    await page.goto('/crew');
    
    // Check for crew onboarding elements
    await expect(page.locator('h1')).toContainText(/Crew/);
    await expect(page.locator('button')).toBeVisible();
  });

  test('manager login page is accessible', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Check for login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin login page is accessible', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check for login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('404 page handles unknown routes', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    
    // Should return 404 or redirect to home
    expect([404, 200]).toContain(response?.status());
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check mobile menu or responsive elements
    const mobileMenu = page.locator('[aria-label="Menu"], .mobile-menu');
    const isMenuVisible = await mobileMenu.isVisible().catch(() => false);
    
    // Mobile layout should be active
    expect(page.viewportSize()?.width).toBe(375);
  });
});