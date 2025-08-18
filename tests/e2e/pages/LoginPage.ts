/**
 * Login Page Object
 * Handles authentication for admin, manager, and crew members
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Locators
  readonly emailInput = 'input[type="email"]';
  readonly passwordInput = 'input[type="password"]';
  readonly loginButton = 'button[type="submit"]';
  readonly magicLinkButton = 'button:has-text("Send Magic Link")';
  readonly errorMessage = '.error-message, .alert-danger';
  readonly successMessage = '.success-message, .alert-success';
  readonly forgotPasswordLink = 'a:has-text("Forgot Password")';
  readonly roleSelector = 'select[name="role"], input[name="role"]';
  readonly mfaCodeInput = 'input[name="mfaCode"], input[name="code"]';
  readonly mfaSubmitButton = 'button:has-text("Verify")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to login page for specific role
   */
  async gotoLoginPage(role: 'admin' | 'manager' | 'crew' = 'crew') {
    switch (role) {
      case 'admin':
        await this.goto('/admin/login');
        break;
      case 'manager':
        await this.goto('/manager/login');
        break;
      case 'crew':
        await this.goto('/crew/access');
        break;
    }
    await this.waitForPageLoad();
  }

  /**
   * Login as admin or manager
   */
  async loginWithCredentials(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.page.click(this.loginButton);
    
    // Wait for either success or error
    await this.page.waitForSelector(`${this.errorMessage}, [data-testid="dashboard"]`, {
      timeout: 10000
    });
  }

  /**
   * Request magic link for crew
   */
  async requestMagicLink(email: string) {
    await this.fillInput(this.emailInput, email);
    await this.page.click(this.magicLinkButton);
    
    // Wait for response
    await this.waitForResponse(/\/api\/auth\/request-magic-link/);
  }

  /**
   * Complete MFA challenge
   */
  async completeMFAChallenge(code: string) {
    await this.page.waitForSelector(this.mfaCodeInput, { state: 'visible' });
    await this.fillInput(this.mfaCodeInput, code);
    await this.page.click(this.mfaSubmitButton);
  }

  /**
   * Check if login was successful
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      // Check for dashboard or redirect
      await this.page.waitForURL(/\/(admin|manager|crew)\/dashboard/, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message if login failed
   */
  async getLoginError(): Promise<string> {
    return await this.getErrorMessage();
  }

  /**
   * Check if MFA is required
   */
  async isMFARequired(): Promise<boolean> {
    return await this.isElementVisible(this.mfaCodeInput);
  }

  /**
   * Logout
   */
  async logout() {
    // Clear auth token
    await this.clearLocalStorage();
    await this.clearCookies();
    await this.goto('/');
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getLocalStorageItem('authToken');
    return token !== null;
  }

  /**
   * Get current user role from token
   */
  async getCurrentUserRole(): Promise<string | null> {
    const token = await this.getLocalStorageItem('authToken');
    if (!token) return null;
    
    try {
      // Decode JWT (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  }

  /**
   * Navigate to forgot password
   */
  async goToForgotPassword() {
    await this.page.click(this.forgotPasswordLink);
    await this.waitForNavigation();
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    await this.fillInput(this.emailInput, email);
    await this.page.click('button:has-text("Reset Password")');
    await this.waitForResponse(/\/api\/auth\/reset-password/);
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLinkToken(token: string) {
    await this.goto(`/crew/verify?token=${token}`);
    await this.waitForPageLoad();
  }

  /**
   * Check if session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    const errorText = await this.getErrorMessage();
    return errorText.toLowerCase().includes('session expired') || 
           errorText.toLowerCase().includes('token expired');
  }

  /**
   * Switch login role (if role selector exists)
   */
  async switchLoginRole(role: 'admin' | 'manager' | 'crew') {
    if (await this.isElementVisible(this.roleSelector)) {
      await this.selectOption(this.roleSelector, role);
    }
  }

  /**
   * Check password strength indicator
   */
  async getPasswordStrength(): Promise<string> {
    const strengthIndicator = await this.page.locator('.password-strength').textContent();
    return strengthIndicator || '';
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    const toggleButton = this.page.locator('button[aria-label="Toggle password visibility"]');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
    }
  }

  /**
   * Check if remember me is available and check it
   */
  async checkRememberMe() {
    const rememberMe = this.page.locator('input[type="checkbox"][name="remember"]');
    if (await rememberMe.isVisible()) {
      await rememberMe.check();
    }
  }

  /**
   * Get success message after action
   */
  async getSuccessMessage(): Promise<string> {
    await this.page.waitForSelector(this.successMessage, { state: 'visible' });
    return await this.getTextContent(this.successMessage);
  }

  /**
   * Wait for redirect after login
   */
  async waitForLoginRedirect() {
    await this.page.waitForURL(/\/(admin|manager|crew)/, { timeout: 10000 });
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(): Promise<boolean> {
    const error = await this.getErrorMessage();
    return error.toLowerCase().includes('account locked') || 
           error.toLowerCase().includes('too many attempts');
  }

  /**
   * Get remaining login attempts
   */
  async getRemainingAttempts(): Promise<number | null> {
    const error = await this.getErrorMessage();
    const match = error.match(/(\d+) attempts? remaining/i);
    return match ? parseInt(match[1]) : null;
  }
}