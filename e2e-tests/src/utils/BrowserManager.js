const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');

class BrowserManager {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRecording = false;
    
    // Create directories for screenshots and videos
    this.screenshotDir = path.join(__dirname, '../../../reports/screenshots');
    this.videoDir = path.join(__dirname, '../../../reports/videos');
    
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.videoDir)) {
      fs.mkdirSync(this.videoDir, { recursive: true });
    }
  }
  
  async launch(options = {}) {
    const headless = options.headless !== false;
    
    // Launch browser
    this.browser = await chromium.launch({ 
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create context with specific viewport and video recording
    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'en-US',
      timezoneId: 'Europe/Amsterdam',
      permissions: ['geolocation', 'notifications'],
      colorScheme: 'light'
    };
    
    if (options.recordVideo !== false) {
      contextOptions.recordVideo = {
        dir: this.videoDir,
        size: { width: 1280, height: 720 }
      };
      this.isRecording = true;
    }
    
    this.context = await this.browser.newContext(contextOptions);
    
    // Create page
    this.page = await this.context.newPage();
    
    // Setup error handling
    this.page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.warn('⚠️  Console warning:', msg.text());
      }
    });
    
    // Handle dialogs automatically
    this.page.on('dialog', async dialog => {
      console.log(`📋 Dialog ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });
    
    return this.page;
  }
  
  async screenshot(name) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
  }
  
  async getAccessibilityReport() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    const snapshot = await this.page.accessibility.snapshot();
    return snapshot;
  }
  
  async getPerformanceMetrics() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    // Get Chrome performance metrics
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Performance.enable');
    const metrics = await client.send('Performance.getMetrics');
    
    // Get Web Vitals
    const webVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let lcp = 0;
        let fid = 0;
        let cls = 0;
        
        // Observe Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Get First Input Delay (simplified)
        if (window.PerformanceEventTiming) {
          const fidEntries = performance.getEntriesByType('first-input');
          if (fidEntries.length > 0) {
            fid = fidEntries[0].processingStart - fidEntries[0].startTime;
          }
        }
        
        // Get Cumulative Layout Shift
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => {
          resolve({ lcp, fid, cls });
        }, 1000);
      });
    });
    
    return {
      metrics: metrics.metrics,
      webVitals
    };
  }
  
  async setMobileDevice(deviceName = 'iPhone 12') {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    const devices = {
      'iPhone 12': {
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15',
        hasTouch: true,
        isMobile: true
      },
      'iPad': {
        viewport: { width: 820, height: 1180 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_4 like Mac OS X) AppleWebKit/605.1.15',
        hasTouch: true,
        isMobile: true
      },
      'Pixel 5': {
        viewport: { width: 393, height: 851 },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
        hasTouch: true,
        isMobile: true
      }
    };
    
    const device = devices[deviceName];
    if (device) {
      await this.page.setViewportSize(device.viewport);
      await this.page.evaluate((ua) => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => ua
        });
      }, device.userAgent);
    }
  }
  
  async close() {
    if (this.browser) {
      if (this.isRecording) {
        // Wait to ensure video is saved
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isRecording = false;
      
      console.log('🔚 Browser closed');
    }
  }
}

module.exports = BrowserManager;