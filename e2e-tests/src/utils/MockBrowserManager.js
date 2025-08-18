const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');

class MockBrowserManager {
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
    console.log('📱 Mock Browser: Launching browser simulation');
    
    // Mock page object
    this.page = {
      goto: async (url, options) => {
        console.log(`  🌐 Navigating to: ${url}`);
        return Promise.resolve();
      },
      
      click: async (selector) => {
        console.log(`  👆 Clicking: ${selector}`);
        return Promise.resolve();
      },
      
      fill: async (selector, value) => {
        console.log(`  ✏️  Filling ${selector}: ${value}`);
        return Promise.resolve();
      },
      
      waitForSelector: async (selector, options) => {
        console.log(`  ⏳ Waiting for: ${selector}`);
        return Promise.resolve(true);
      },
      
      waitForNavigation: async (options) => {
        console.log(`  🔄 Waiting for navigation...`);
        return Promise.resolve();
      },
      
      waitForTimeout: async (ms) => {
        console.log(`  ⏱️  Waiting ${ms}ms...`);
        return Promise.resolve();
      },
      
      $: async (selector) => {
        console.log(`  🔍 Finding element: ${selector}`);
        return { 
          click: () => Promise.resolve(),
          fill: () => Promise.resolve(),
          textContent: () => Promise.resolve('Mock text'),
          getAttribute: () => Promise.resolve('mock-value'),
          isVisible: () => Promise.resolve(true),
          inputValue: () => Promise.resolve('mock input value')
        };
      },
      
      $$: async (selector) => {
        console.log(`  🔍 Finding elements: ${selector}`);
        return [
          { click: () => Promise.resolve(), textContent: () => Promise.resolve('Mock item 1') },
          { click: () => Promise.resolve(), textContent: () => Promise.resolve('Mock item 2') }
        ];
      },
      
      $$eval: async (selector, fn) => {
        console.log(`  🔍 Evaluating on elements: ${selector}`);
        return ['Mock result 1', 'Mock result 2'];
      },
      
      screenshot: async (options) => {
        const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
        const filename = `mock-screenshot-${timestamp}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        
        // Create empty file to simulate screenshot
        fs.writeFileSync(filepath, 'Mock screenshot data');
        console.log(`  📸 Mock screenshot saved: ${filename}`);
        return filepath;
      },
      
      evaluate: async (fn, ...args) => {
        console.log(`  ⚙️  Evaluating function in browser context`);
        // Return mock performance data
        if (fn.toString().includes('performance')) {
          return {
            loadTime: 1500,
            domContentLoaded: 1200,
            firstPaint: 800,
            firstContentfulPaint: 900
          };
        }
        return 'Mock evaluation result';
      },
      
      url: () => 'http://localhost:3000/mock-page',
      
      setDefaultTimeout: (timeout) => {
        console.log(`  ⏰ Setting timeout: ${timeout}ms`);
      },
      
      context: () => ({
        clearCookies: () => Promise.resolve(),
        setOffline: (offline) => {
          console.log(`  📡 Setting offline mode: ${offline}`);
          return Promise.resolve();
        },
        newCDPSession: () => ({
          send: async (command) => {
            console.log(`  🔧 CDP command: ${command}`);
            if (command === 'Performance.getMetrics') {
              return { metrics: [{ name: 'MockMetric', value: 100 }] };
            }
            return {};
          }
        })
      }),
      
      on: (event, handler) => {
        console.log(`  📡 Listening for event: ${event}`);
      },
      
      setViewportSize: async (size) => {
        console.log(`  📐 Setting viewport: ${size.width}x${size.height}`);
      },
      
      reload: async () => {
        console.log(`  🔄 Reloading page`);
      },
      
      waitForEvent: async (event, options) => {
        console.log(`  📅 Waiting for event: ${event}`);
        return {
          suggestedFilename: () => 'mock-download.pdf',
          saveAs: async (path) => {
            console.log(`  💾 Mock download saved to: ${path}`);
            fs.writeFileSync(path, 'Mock file content');
          }
        };
      }
    };
    
    return this.page;
  }
  
  async screenshot(name) {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    // Create mock screenshot file
    fs.writeFileSync(filepath, 'Mock screenshot data');
    console.log(`📸 Mock screenshot saved: ${filename}`);
    return filepath;
  }
  
  async getAccessibilityReport() {
    console.log('♿ Mock accessibility report generated');
    return { violations: [] };
  }
  
  async getPerformanceMetrics() {
    console.log('📊 Mock performance metrics collected');
    return {
      metrics: [
        { name: 'MockLoadTime', value: 1500 },
        { name: 'MockRenderTime', value: 800 }
      ],
      webVitals: {
        lcp: 1200,
        fid: 50,
        cls: 0.05
      }
    };
  }
  
  async setMobileDevice(deviceName = 'iPhone 12') {
    console.log(`📱 Mock mobile device set: ${deviceName}`);
  }
  
  async close() {
    console.log('🔚 Mock browser closed');
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRecording = false;
  }
}

module.exports = MockBrowserManager;