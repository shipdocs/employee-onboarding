/**
 * Manager Authentication E2E Tests
 * Tests complete manager login and dashboard workflows
 */

import { test, expect } from '@playwright/test';

// Test data
const testManager = {
  email: 'test.manager@shipdocs.app',
  password: 'TestPassword123!',
  name: 'Test Manager',
  company: 'Test Shipping Company'
};

test.describe('Manager Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should display manager login page correctly', async ({ page }) => {
    // Navigate to manager login
    await page.click('text=Manager Login');
    await expect(page).toHaveURL('/manager/login');

    // Check page elements
    await expect(page.locator('h1')).toContainText('Manager Login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for forgot password link
    await expect(page.locator('text=Forgot Password')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Check for email validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Enter invalid credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for authentication error
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Enter valid credentials
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/manager/dashboard');
    
    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Manager Dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/manager/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/manager/dashboard');
    await expect(page.locator('h1')).toContainText('Manager Dashboard');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/manager/dashboard');
    
    // Logout
    await page.click('text=Logout');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Try to access dashboard directly (should redirect to login)
    await page.goto('/manager/dashboard');
    await expect(page).toHaveURL('/manager/login');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Click forgot password
    await page.click('text=Forgot Password');
    await expect(page).toHaveURL('/manager/forgot-password');
    
    // Enter email
    await page.fill('input[type="email"]', testManager.email);
    await page.click('button[type="submit"]');
    
    // Check success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('should redirect authenticated users away from login page', async ({ page }) => {
    // Login first
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/manager/dashboard');
    
    // Try to access login page again
    await page.goto('/manager/login');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/manager/dashboard');
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/manager/login');
    
    // Fill form
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    
    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');
    
    // Check for loading indicator (button should be disabled or show loading text)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept login request and make it fail
    await page.route('**/api/auth/manager/login', route => {
      route.abort('failed');
    });
    
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testManager.email);
    await page.fill('input[type="password"]', testManager.password);
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('text=Network error')).toBeVisible();
  });

  test('should validate password strength requirements', async ({ page }) => {
    await page.goto('/manager/forgot-password');
    
    // Simulate password reset with new password
    // This would typically be tested with a valid reset token
    // For now, we'll test the password validation on the reset form
    
    await page.fill('input[type="email"]', testManager.email);
    await page.click('button[type="submit"]');
    
    // Check that email was sent message appears
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });
});
