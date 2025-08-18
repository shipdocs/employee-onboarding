/**
 * Visual Regression Testing Utilities
 * Handles screenshot comparison and visual testing
 */

import { Page, expect } from '@playwright/test';
import * as path from 'path';

export class VisualTesting {
  private page: Page;
  private screenshotDir: string;

  constructor(page: Page) {
    this.page = page;
    this.screenshotDir = path.join(__dirname, '..', 'screenshots');
  }

  /**
   * Take and compare screenshot
   */
  async compareScreenshot(name: string, options?: {
    fullPage?: boolean;
    mask?: string[];
    clip?: { x: number; y: number; width: number; height: number };
    animations?: 'disabled' | 'allow';
    maxDiffPixels?: number;
    threshold?: number;
  }) {
    // Disable animations by default for consistent screenshots
    if (options?.animations !== 'allow') {
      await this.disableAnimations();
    }

    // Wait for fonts to load
    await this.page.evaluate(() => document.fonts.ready);

    // Hide dynamic content if specified
    if (options?.mask) {
      for (const selector of options.mask) {
        await this.page.locator(selector).evaluate(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      }
    }

    // Take screenshot and compare
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage: options?.fullPage ?? true,
      clip: options?.clip,
      maxDiffPixels: options?.maxDiffPixels ?? 100,
      threshold: options?.threshold ?? 0.2,
      animations: 'disabled'
    });
  }

  /**
   * Compare specific element screenshot
   */
  async compareElementScreenshot(selector: string, name: string, options?: {
    padding?: number;
    mask?: string[];
    maxDiffPixels?: number;
    threshold?: number;
  }) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    
    // Wait for element to be stable
    await element.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(100);

    // Hide dynamic content within element
    if (options?.mask) {
      for (const maskSelector of options.mask) {
        await element.locator(maskSelector).evaluate(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      }
    }

    await expect(element).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: options?.maxDiffPixels ?? 50,
      threshold: options?.threshold ?? 0.2
    });
  }

  /**
   * Disable animations and transitions
   */
  async disableAnimations() {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  /**
   * Hide scrollbars for consistent screenshots
   */
  async hideScrollbars() {
    await this.page.addStyleTag({
      content: `
        ::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
      `
    });
  }

  /**
   * Mask dynamic content
   */
  async maskDynamicContent() {
    // Common selectors for dynamic content
    const dynamicSelectors = [
      '[data-testid="timestamp"]',
      '.timestamp',
      '.date-time',
      '.relative-time',
      '[data-dynamic="true"]'
    ];

    for (const selector of dynamicSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        await elements.nth(i).evaluate(el => {
          (el as HTMLElement).textContent = 'MASKED';
          (el as HTMLElement).style.backgroundColor = '#f0f0f0';
        });
      }
    }
  }

  /**
   * Set consistent viewport for visual tests
   */
  async setConsistentViewport(device: 'desktop' | 'tablet' | 'mobile' = 'desktop') {
    const viewports = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    await this.page.setViewportSize(viewports[device]);
  }

  /**
   * Wait for images to load
   */
  async waitForImages() {
    await this.page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete && img.naturalHeight !== 0);
    });
  }

  /**
   * Compare page at different viewport sizes
   */
  async compareResponsiveScreenshots(name: string, options?: {
    devices?: Array<'desktop' | 'tablet' | 'mobile'>;
    fullPage?: boolean;
  }) {
    const devices = options?.devices || ['desktop', 'tablet', 'mobile'];
    
    for (const device of devices) {
      await this.setConsistentViewport(device);
      await this.page.waitForTimeout(500); // Wait for layout shift
      
      await this.compareScreenshot(`${name}-${device}`, {
        fullPage: options?.fullPage ?? true
      });
    }
  }

  /**
   * Visual test for hover states
   */
  async compareHoverState(selector: string, name: string) {
    const element = this.page.locator(selector);
    
    // Normal state
    await this.compareElementScreenshot(selector, `${name}-normal`);
    
    // Hover state
    await element.hover();
    await this.page.waitForTimeout(100); // Wait for hover effects
    await this.compareElementScreenshot(selector, `${name}-hover`);
  }

  /**
   * Visual test for focus states
   */
  async compareFocusState(selector: string, name: string) {
    const element = this.page.locator(selector);
    
    // Normal state
    await this.compareElementScreenshot(selector, `${name}-normal`);
    
    // Focus state
    await element.focus();
    await this.page.waitForTimeout(100); // Wait for focus effects
    await this.compareElementScreenshot(selector, `${name}-focus`);
  }

  /**
   * Compare loading states
   */
  async compareLoadingStates(name: string) {
    // Capture loading state
    await this.compareScreenshot(`${name}-loading`, {
      mask: ['.spinner', '.skeleton']
    });
    
    // Wait for content to load
    await this.page.waitForSelector('.loading', { state: 'hidden' });
    
    // Capture loaded state
    await this.compareScreenshot(`${name}-loaded`);
  }

  /**
   * Compare dark mode
   */
  async compareDarkMode(name: string) {
    // Light mode
    await this.page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await this.compareScreenshot(`${name}-light`);
    
    // Dark mode
    await this.page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await this.compareScreenshot(`${name}-dark`);
  }

  /**
   * Get visual diff percentage
   */
  async getVisualDiffPercentage(baseline: string, current: string): Promise<number> {
    // This would integrate with a visual diff tool
    // Placeholder implementation
    return 0;
  }

  /**
   * Batch visual tests
   */
  async runVisualTestSuite(suite: {
    name: string;
    pages: Array<{
      url: string;
      name: string;
      options?: any;
    }>;
  }) {
    for (const pageTest of suite.pages) {
      await this.page.goto(pageTest.url);
      await this.waitForImages();
      await this.compareScreenshot(
        `${suite.name}-${pageTest.name}`,
        pageTest.options
      );
    }
  }

  /**
   * Compare form states
   */
  async compareFormStates(formSelector: string, name: string) {
    // Empty state
    await this.compareElementScreenshot(formSelector, `${name}-empty`);
    
    // Filled state
    const inputs = this.page.locator(`${formSelector} input[type="text"], ${formSelector} input[type="email"]`);
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('Test Value');
    }
    
    await this.compareElementScreenshot(formSelector, `${name}-filled`);
    
    // Error state (trigger validation)
    await this.page.locator(`${formSelector} button[type="submit"]`).click();
    await this.page.waitForTimeout(100);
    
    await this.compareElementScreenshot(formSelector, `${name}-error`);
  }
}