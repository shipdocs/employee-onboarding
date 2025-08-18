/**
 * Accessibility Testing Utilities
 * Handles accessibility audits and WCAG compliance testing
 */

import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

export class AccessibilityTesting {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run accessibility audit on current page
   */
  async audit(options?: {
    includeRules?: string[];
    excludeRules?: string[];
    runOnly?: string[];
    tags?: string[];
  }): Promise<AccessibilityViolation[]> {
    const builder = new AxeBuilder({ page: this.page });

    // Configure audit rules
    if (options?.includeRules) {
      builder.include(options.includeRules);
    }
    if (options?.excludeRules) {
      builder.exclude(options.excludeRules);
    }
    if (options?.runOnly) {
      builder.withRules(options.runOnly);
    }
    if (options?.tags) {
      builder.withTags(options.tags);
    }

    const results = await builder.analyze();
    
    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('\n🔍 Accessibility Violations Found:');
      results.violations.forEach(violation => {
        console.log(`\n❌ ${violation.id} (${violation.impact})`);
        console.log(`   ${violation.description}`);
        console.log(`   Help: ${violation.help}`);
        console.log(`   Learn more: ${violation.helpUrl}`);
        
        violation.nodes.forEach((node, index) => {
          console.log(`   Node ${index + 1}: ${node.target.join(', ')}`);
          console.log(`   HTML: ${node.html.substring(0, 100)}...`);
        });
      });
    }

    return results.violations;
  }

  /**
   * Assert no accessibility violations
   */
  async assertNoViolations(options?: {
    allowedViolations?: string[];
    allowedImpacts?: Array<'minor' | 'moderate'>;
  }) {
    const violations = await this.audit();
    
    // Filter out allowed violations
    const filteredViolations = violations.filter(v => {
      if (options?.allowedViolations?.includes(v.id)) return false;
      if (options?.allowedImpacts?.includes(v.impact as any)) return false;
      return true;
    });

    expect(filteredViolations).toHaveLength(0);
  }

  /**
   * Check WCAG 2.1 Level AA compliance
   */
  async checkWCAGCompliance(level: 'A' | 'AA' | 'AAA' = 'AA') {
    const tags = [`wcag2${level.toLowerCase()}`, 'wcag21aa', 'best-practice'];
    const violations = await this.audit({ tags });
    
    const criticalViolations = violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(elements: string[]) {
    // Start from body
    await this.page.focus('body');
    
    const results: { element: string; focusable: boolean; tabIndex: number }[] = [];
    
    for (const selector of elements) {
      // Tab to next element
      await this.page.keyboard.press('Tab');
      
      // Check if element is focused
      const isFocused = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return document.activeElement === element;
      }, selector);
      
      // Get tab index
      const tabIndex = await this.page.getAttribute(selector, 'tabindex');
      
      results.push({
        element: selector,
        focusable: isFocused,
        tabIndex: parseInt(tabIndex || '0')
      });
    }
    
    // All interactive elements should be focusable
    const unfocusable = results.filter(r => !r.focusable);
    expect(unfocusable).toHaveLength(0);
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderLabels() {
    // Check all interactive elements have accessible labels
    const unlabeledElements = await this.page.evaluate(() => {
      const interactiveSelectors = [
        'button', 'a', 'input', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[tabindex]'
      ];
      
      const elements = document.querySelectorAll(interactiveSelectors.join(','));
      const unlabeled: string[] = [];
      
      elements.forEach(el => {
        const hasLabel = 
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim() ||
          (el as HTMLInputElement).placeholder ||
          (el.id && document.querySelector(`label[for="${el.id}"]`));
          
        if (!hasLabel) {
          unlabeled.push(el.tagName + (el.className ? `.${el.className}` : ''));
        }
      });
      
      return unlabeled;
    });
    
    expect(unlabeledElements).toHaveLength(0);
  }

  /**
   * Check color contrast
   */
  async checkColorContrast() {
    const violations = await this.audit({
      runOnly: ['color-contrast']
    });
    
    expect(violations).toHaveLength(0);
  }

  /**
   * Test focus indicators
   */
  async testFocusIndicators(elements: string[]) {
    for (const selector of elements) {
      const element = this.page.locator(selector);
      
      // Get styles before focus
      const beforeStyles = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border
        };
      });
      
      // Focus element
      await element.focus();
      
      // Get styles after focus
      const afterStyles = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border
        };
      });
      
      // Check if any visual change occurred
      const hasVisualChange = 
        beforeStyles.outline !== afterStyles.outline ||
        beforeStyles.boxShadow !== afterStyles.boxShadow ||
        beforeStyles.border !== afterStyles.border;
        
      expect(hasVisualChange).toBeTruthy();
    }
  }

  /**
   * Test ARIA attributes
   */
  async testARIACompliance() {
    const ariaIssues = await this.page.evaluate(() => {
      const issues: string[] = [];
      
      // Check for invalid ARIA roles
      document.querySelectorAll('[role]').forEach(el => {
        const role = el.getAttribute('role');
        const validRoles = [
          'alert', 'button', 'checkbox', 'dialog', 'link', 'menu',
          'navigation', 'progressbar', 'radio', 'search', 'tab', 'tabpanel'
        ];
        
        if (role && !validRoles.includes(role)) {
          issues.push(`Invalid role: ${role} on ${el.tagName}`);
        }
      });
      
      // Check for missing required ARIA attributes
      document.querySelectorAll('[aria-labelledby]').forEach(el => {
        const id = el.getAttribute('aria-labelledby');
        if (id && !document.getElementById(id)) {
          issues.push(`aria-labelledby references non-existent ID: ${id}`);
        }
      });
      
      return issues;
    });
    
    expect(ariaIssues).toHaveLength(0);
  }

  /**
   * Test heading hierarchy
   */
  async testHeadingHierarchy() {
    const headings = await this.page.evaluate(() => {
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return allHeadings.map(h => ({
        level: parseInt(h.tagName.charAt(1)),
        text: h.textContent?.trim() || ''
      }));
    });
    
    // Check for single h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBe(1);
    
    // Check hierarchy doesn't skip levels
    for (let i = 1; i < headings.length; i++) {
      const levelDiff = headings[i].level - headings[i-1].level;
      expect(levelDiff).toBeLessThanOrEqual(1);
    }
  }

  /**
   * Test form accessibility
   */
  async testFormAccessibility(formSelector: string) {
    const issues = await this.page.evaluate((selector) => {
      const form = document.querySelector(selector);
      if (!form) return ['Form not found'];
      
      const issues: string[] = [];
      
      // Check all inputs have labels
      form.querySelectorAll('input, select, textarea').forEach(input => {
        const hasLabel = 
          input.getAttribute('aria-label') ||
          input.getAttribute('aria-labelledby') ||
          (input.id && form.querySelector(`label[for="${input.id}"]`));
          
        if (!hasLabel) {
          issues.push(`Input without label: ${input.getAttribute('name') || input.tagName}`);
        }
      });
      
      // Check required fields are marked
      form.querySelectorAll('[required]').forEach(field => {
        const hasAriaRequired = field.getAttribute('aria-required') === 'true';
        if (!hasAriaRequired) {
          issues.push(`Required field missing aria-required: ${field.getAttribute('name')}`);
        }
      });
      
      return issues;
    }, formSelector);
    
    expect(issues).toHaveLength(0);
  }

  /**
   * Test skip links
   */
  async testSkipLinks() {
    // Check for skip to main content link
    const skipLink = await this.page.locator('a[href="#main"], a[href="#content"]').first();
    expect(await skipLink.count()).toBeGreaterThan(0);
    
    // Test skip link functionality
    await skipLink.focus();
    await skipLink.click();
    
    // Check focus moved to main content
    const focusedElement = await this.page.evaluate(() => {
      return document.activeElement?.id || document.activeElement?.tagName;
    });
    
    expect(['main', 'content', 'MAIN']).toContain(focusedElement);
  }

  /**
   * Test responsive text sizing
   */
  async testTextResize() {
    // Test at 200% zoom
    await this.page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    
    // Check no horizontal scroll
    const hasHorizontalScroll = await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
    
    // Reset
    await this.page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
  }

  /**
   * Generate accessibility report
   */
  async generateReport(): Promise<{
    summary: {
      violations: number;
      passes: number;
      incomplete: number;
    };
    details: AccessibilityViolation[];
  }> {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    
    return {
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length
      },
      details: results.violations
    };
  }

  /**
   * Test specific WCAG criteria
   */
  async testWCAGCriteria(criteria: string[]) {
    for (const criterion of criteria) {
      const violations = await this.audit({
        runOnly: [criterion]
      });
      
      expect(violations).toHaveLength(0);
    }
  }

  /**
   * Test landmark regions
   */
  async testLandmarks() {
    const landmarks = await this.page.evaluate(() => {
      const regions = {
        header: document.querySelector('header, [role="banner"]'),
        nav: document.querySelector('nav, [role="navigation"]'),
        main: document.querySelector('main, [role="main"]'),
        footer: document.querySelector('footer, [role="contentinfo"]')
      };
      
      return Object.entries(regions).map(([name, element]) => ({
        name,
        exists: !!element,
        hasRole: !!element?.getAttribute('role')
      }));
    });
    
    // Main landmark is required
    const mainLandmark = landmarks.find(l => l.name === 'main');
    expect(mainLandmark?.exists).toBeTruthy();
  }
}