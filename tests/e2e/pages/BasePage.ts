/**
 * Base Page Object
 * Common functionality for all page objects
 */

import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '') {
    await this.page.goto(`${this.baseURL}${path}`);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Check if element is visible with retry
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(selector: string, retries: number = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.click(selector);
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Fill input with clear first
   */
  async fillInput(selector: string, value: string) {
    const input = this.page.locator(selector);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Wait for API response
   */
  async waitForResponse(urlPattern: string | RegExp) {
    return this.page.waitForResponse(urlPattern);
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    return await element.textContent() || '';
  }

  /**
   * Check if page has error
   */
  async hasError(): Promise<boolean> {
    return await this.isElementVisible('.error-message, .alert-danger, [role="alert"]');
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    const errorSelectors = ['.error-message', '.alert-danger', '[role="alert"]'];
    for (const selector of errorSelectors) {
      if (await this.isElementVisible(selector)) {
        return await this.getTextContent(selector);
      }
    }
    return '';
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(url?: string | RegExp) {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForNavigation();
    }
  }

  /**
   * Get localStorage item
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set localStorage item
   */
  async setLocalStorageItem(key: string, value: string) {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  /**
   * Clear localStorage
   */
  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get cookie
   */
  async getCookie(name: string) {
    const cookies = await this.page.context().cookies();
    return cookies.find(cookie => cookie.name === name);
  }

  /**
   * Set cookie
   */
  async setCookie(name: string, value: string) {
    await this.page.context().addCookies([{
      name,
      value,
      domain: new URL(this.baseURL).hostname,
      path: '/'
    }]);
  }

  /**
   * Clear all cookies
   */
  async clearCookies() {
    await this.page.context().clearCookies();
  }

  /**
   * Reload page
   */
  async reload() {
    await this.page.reload();
  }

  /**
   * Go back in browser history
   */
  async goBack() {
    await this.page.goBack();
  }

  /**
   * Accept dialog (alert, confirm, prompt)
   */
  async acceptDialog() {
    this.page.on('dialog', dialog => dialog.accept());
  }

  /**
   * Dismiss dialog
   */
  async dismissDialog() {
    this.page.on('dialog', dialog => dialog.dismiss());
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * Hover over element
   */
  async hover(selector: string) {
    await this.page.hover(selector);
  }

  /**
   * Right click element
   */
  async rightClick(selector: string) {
    await this.page.click(selector, { button: 'right' });
  }

  /**
   * Double click element
   */
  async doubleClick(selector: string) {
    await this.page.dblclick(selector);
  }

  /**
   * Drag and drop
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * Download file
   */
  async downloadFile(selector: string): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click(selector)
    ]);
    const path = await download.path();
    return path || '';
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.getAttribute(selector, attribute);
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  /**
   * Check if element is checked (for checkboxes/radios)
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.page.isChecked(selector);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string | string[]) {
    await this.page.selectOption(selector, value);
  }

  /**
   * Get selected option value
   */
  async getSelectedOption(selector: string): Promise<string> {
    return await this.page.$eval(selector, (el: HTMLSelectElement) => el.value);
  }

  /**
   * Wait for timeout
   */
  async wait(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Focus on element
   */
  async focus(selector: string) {
    await this.page.focus(selector);
  }

  /**
   * Blur from element
   */
  async blur(selector: string) {
    await this.page.locator(selector).blur();
  }

  /**
   * Get all matching elements count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementToBeHidden(selector: string, timeout: number = 5000) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Get inner HTML
   */
  async getInnerHTML(selector: string): Promise<string> {
    return await this.page.innerHTML(selector);
  }

  /**
   * Get inner text
   */
  async getInnerText(selector: string): Promise<string> {
    return await this.page.innerText(selector);
  }

  /**
   * Check if element has class
   */
  async hasClass(selector: string, className: string): Promise<boolean> {
    const classes = await this.getAttribute(selector, 'class');
    return classes ? classes.includes(className) : false;
  }

  /**
   * Wait for function to return true
   */
  async waitForFunction(fn: Function, timeout: number = 5000) {
    await this.page.waitForFunction(fn, { timeout });
  }

  /**
   * Get viewport size
   */
  async getViewportSize() {
    return this.page.viewportSize();
  }

  /**
   * Set viewport size
   */
  async setViewportSize(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Emulate mobile device
   */
  async emulateDevice(deviceName: string) {
    const { devices } = require('@playwright/test');
    await this.page.setViewportSize(devices[deviceName].viewport);
    await this.page.setUserAgent(devices[deviceName].userAgent);
  }

  /**
   * Get console logs
   */
  async getConsoleLogs(): Promise<string[]> {
    const logs: string[] = [];
    this.page.on('console', msg => logs.push(msg.text()));
    return logs;
  }

  /**
   * Get network requests
   */
  async getNetworkRequests(): Promise<any[]> {
    const requests: any[] = [];
    this.page.on('request', request => requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    }));
    return requests;
  }

  /**
   * Block requests by pattern
   */
  async blockRequests(urlPattern: string | RegExp) {
    await this.page.route(urlPattern, route => route.abort());
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(urlPattern: string | RegExp, response: any) {
    await this.page.route(urlPattern, route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    }));
  }

  /**
   * Get accessibility tree
   */
  async getAccessibilityTree() {
    return await this.page.accessibility.snapshot();
  }

  /**
   * Run accessibility audit
   */
  async runAccessibilityAudit() {
    // This would integrate with axe-core or similar
    // Placeholder for now
    return true;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
  }
}