// Use mock browser if Playwright is not available
let BrowserManager;
try {
  BrowserManager = require('./BrowserManager');
} catch (error) {
  console.log('⚠️  Using MockBrowserManager due to Playwright issues');
  BrowserManager = require('./MockBrowserManager');
}
const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');

class TestBase {
  constructor(config) {
    this.config = config;
    this.browserManager = new BrowserManager(config);
    this.testResults = [];
    this.startTime = null;
    this.endTime = null;
  }

  async setup(options = {}) {
    this.startTime = new Date();
    console.log(`🚀 Starting test suite at ${format(this.startTime, 'yyyy-MM-dd HH:mm:ss')}`);
    
    this.page = await this.browserManager.launch({
      headless: options.headless !== false,
      recordVideo: options.recordVideo !== false
    });
    
    // Set default timeout
    this.page.setDefaultTimeout(this.config.timeout || 60000);
    
    return this.page;
  }

  async teardown() {
    this.endTime = new Date();
    console.log(`✅ Test suite completed at ${format(this.endTime, 'yyyy-MM-dd HH:mm:ss')}`);
    
    // Generate test report
    await this.generateReport();
    
    // Close browser
    await this.browserManager.close();
  }

  async takeScreenshot(name) {
    return await this.browserManager.screenshot(name);
  }

  async waitForSelector(selector, options = {}) {
    try {
      await this.page.waitForSelector(selector, {
        timeout: options.timeout || 30000,
        state: options.state || 'visible'
      });
      return true;
    } catch (error) {
      console.error(`Failed to find selector: ${selector}`);
      await this.takeScreenshot(`error-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
      return false;
    }
  }

  async clickElement(selector, options = {}) {
    try {
      await this.waitForSelector(selector, options);
      await this.page.click(selector);
      return true;
    } catch (error) {
      console.error(`Failed to click element: ${selector}`, error.message);
      return false;
    }
  }

  async fillInput(selector, value, options = {}) {
    try {
      await this.waitForSelector(selector, options);
      await this.page.fill(selector, value);
      return true;
    } catch (error) {
      console.error(`Failed to fill input: ${selector}`, error.message);
      return false;
    }
  }

  async selectOption(selector, value, options = {}) {
    try {
      await this.waitForSelector(selector, options);
      await this.page.selectOption(selector, value);
      return true;
    } catch (error) {
      console.error(`Failed to select option: ${selector}`, error.message);
      return false;
    }
  }

  async checkElementText(selector, expectedText, options = {}) {
    try {
      await this.waitForSelector(selector, options);
      const actualText = await this.page.textContent(selector);
      return actualText.includes(expectedText);
    } catch (error) {
      console.error(`Failed to check element text: ${selector}`, error.message);
      return false;
    }
  }

  async waitForNavigation(options = {}) {
    try {
      await this.page.waitForNavigation({
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 30000
      });
      return true;
    } catch (error) {
      console.error('Navigation timeout:', error.message);
      return false;
    }
  }

  async setNetworkConditions(profile) {
    const conditions = this.config.networkProfiles[profile];
    if (!conditions) {
      console.error(`Network profile not found: ${profile}`);
      return false;
    }

    try {
      if (conditions.offline) {
        await this.page.context().setOffline(true);
      } else {
        await this.page.context().setOffline(false);
        // Note: Playwright doesn't have built-in network throttling like Puppeteer
        // You would need to use Chrome DevTools Protocol for this
      }
      return true;
    } catch (error) {
      console.error('Failed to set network conditions:', error.message);
      return false;
    }
  }

  async measurePerformance() {
    try {
      const metrics = await this.browserManager.getPerformanceMetrics();
      const timing = await this.page.evaluate(() => {
        return {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      return { metrics, timing };
    } catch (error) {
      console.error('Failed to measure performance:', error.message);
      return null;
    }
  }

  async checkAccessibility() {
    try {
      const violations = await this.page.evaluate(() => {
        // This would require injecting axe-core library
        // For now, return basic checks
        const issues = [];
        
        // Check for images without alt text
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
          issues.push({
            rule: 'images-alt',
            elements: imagesWithoutAlt.length,
            impact: 'critical'
          });
        }
        
        // Check for buttons without accessible text
        const buttonsWithoutText = document.querySelectorAll('button:empty');
        if (buttonsWithoutText.length > 0) {
          issues.push({
            rule: 'button-name',
            elements: buttonsWithoutText.length,
            impact: 'serious'
          });
        }
        
        return issues;
      });
      
      return violations;
    } catch (error) {
      console.error('Failed to check accessibility:', error.message);
      return [];
    }
  }

  recordTestResult(testName, success, details = {}) {
    this.testResults.push({
      testName,
      success,
      timestamp: new Date().toISOString(),
      duration: details.duration || 0,
      error: details.error || null,
      screenshots: details.screenshots || [],
      performance: details.performance || null
    });
  }

  async generateReport() {
    const reportDir = path.join(__dirname, '../../../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const duration = this.endTime - this.startTime;
    const successCount = this.testResults.filter(r => r.success).length;
    const failureCount = this.testResults.filter(r => !r.success).length;

    const report = {
      testSuite: this.constructor.name,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      duration: duration,
      totalTests: this.testResults.length,
      passed: successCount,
      failed: failureCount,
      successRate: (successCount / this.testResults.length * 100).toFixed(2) + '%',
      results: this.testResults
    };

    const reportPath = path.join(reportDir, `test-report-${format(this.startTime, 'yyyyMMdd-HHmmss')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Test Report Summary:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.passed} ✅`);
    console.log(`   Failed: ${report.failed} ❌`);
    console.log(`   Success Rate: ${report.successRate}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Report saved to: ${reportPath}\n`);
  }
}

module.exports = TestBase;