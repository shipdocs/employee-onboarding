/**
 * Authentication Helper
 * Common authentication utilities for E2E tests
 */

import { Page, BrowserContext } from '@playwright/test';
import { testUsers, apiEndpoints } from '../fixtures/testData';

export class AuthHelper {
  /**
   * Login as admin
   */
  static async loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  }

  /**
   * Login as manager
   */
  static async loginAsManager(page: Page): Promise<void> {
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testUsers.manager.email);
    await page.fill('input[type="password"]', testUsers.manager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/manager/dashboard');
  }

  /**
   * Login as crew with magic link
   */
  static async loginAsCrewWithMagicLink(page: Page, token: string): Promise<void> {
    await page.goto(`/crew/verify?token=${token}`);
    await page.waitForURL('/crew/dashboard');
  }

  /**
   * Generate and set auth token in storage
   */
  static async setAuthToken(context: BrowserContext, role: 'admin' | 'manager' | 'crew'): Promise<void> {
    const mockToken = Buffer.from(JSON.stringify({
      id: 'test-user-id',
      email: testUsers[role].email,
      role: role,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    })).toString('base64');

    await context.addInitScript((token) => {
      localStorage.setItem('authToken', token);
    }, mockToken);
  }

  /**
   * Clear authentication
   */
  static async logout(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      sessionStorage.clear();
    });
    await page.goto('/');
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    return token !== null;
  }

  /**
   * Get current user role
   */
  static async getCurrentRole(page: Page): Promise<string | null> {
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  }

  /**
   * Mock API authentication
   */
  static async mockAuthentication(page: Page, role: 'admin' | 'manager' | 'crew'): Promise<void> {
    await page.route(apiEndpoints.auth.login, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: 'test-user-id',
            email: testUsers[role].email,
            role: role
          }
        })
      });
    });
  }

  /**
   * Handle MFA if required
   */
  static async handleMFA(page: Page, code: string = '123456'): Promise<void> {
    const mfaInput = page.locator('input[name="mfaCode"]');
    if (await mfaInput.isVisible()) {
      await mfaInput.fill(code);
      await page.click('button:has-text("Verify")');
    }
  }

  /**
   * Wait for authentication redirect
   */
  static async waitForAuthRedirect(page: Page, role: 'admin' | 'manager' | 'crew'): Promise<void> {
    await page.waitForURL(new RegExp(`/${role}/`));
  }

  /**
   * Create authenticated context
   */
  static async createAuthenticatedContext(
    browser: any,
    role: 'admin' | 'manager' | 'crew'
  ): Promise<BrowserContext> {
    const context = await browser.newContext();
    
    // Set auth token
    await this.setAuthToken(context, role);
    
    // Add auth header interceptor
    await context.route('**/*', async route => {
      const headers = route.request().headers();
      headers['Authorization'] = 'Bearer mock-jwt-token';
      await route.continue({ headers });
    });
    
    return context;
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Simulate token refresh
      const currentToken = localStorage.getItem('authToken');
      if (currentToken) {
        // In real app, this would call refresh endpoint
        localStorage.setItem('authToken', currentToken + '-refreshed');
      }
    });
  }

  /**
   * Check for session expiry
   */
  static async checkSessionExpiry(page: Page): Promise<boolean> {
    const isLoginPage = page.url().includes('/login');
    const hasExpiredMessage = await page.locator('text=session expired').isVisible();
    return isLoginPage || hasExpiredMessage;
  }

  /**
   * Handle authentication errors
   */
  static async handleAuthError(page: Page): Promise<string> {
    const errorSelectors = [
      '.auth-error',
      '.error-message',
      '[role="alert"]'
    ];
    
    for (const selector of errorSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        return await element.textContent() || '';
      }
    }
    
    return '';
  }

  /**
   * Setup role-based authentication state
   */
  static async setupAuthState(page: Page, role: 'admin' | 'manager' | 'crew'): Promise<void> {
    // Set up storage state
    await page.context().addCookies([{
      name: 'auth-token',
      value: 'mock-jwt-token',
      domain: new URL(page.url()).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }]);
    
    // Set local storage
    await page.evaluate((userData) => {
      localStorage.setItem('authToken', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(userData));
    }, testUsers[role]);
  }

  /**
   * Impersonate user
   */
  static async impersonateUser(page: Page, userId: string): Promise<void> {
    // Admin feature to impersonate other users
    await page.goto(`/admin/impersonate/${userId}`);
    await page.waitForURL(/\/(manager|crew)\//);
  }

  /**
   * Get authentication headers
   */
  static getAuthHeaders(token: string = 'mock-jwt-token'): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}