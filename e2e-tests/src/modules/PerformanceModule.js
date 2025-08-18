const TestBase = require('../utils/TestBase');

class PerformanceModule extends TestBase {
  constructor(config) {
    super(config);
    this.performanceTargets = {
      pageLoad: 3000,        // 3 seconds
      firstPaint: 1500,      // 1.5 seconds
      interactive: 3500,     // 3.5 seconds
      largestContentfulPaint: 2500,  // 2.5 seconds
      cumulativeLayoutShift: 0.1,    // Max 0.1
      firstInputDelay: 100   // 100ms
    };
  }

  async measurePagePerformance(pageName, url) {
    console.log(`\n⚡ Measuring performance for ${pageName}...`);
    
    try {
      // Clear cache and cookies for clean measurement
      await this.page.context().clearCookies();
      
      // Navigate and measure
      const startTime = Date.now();
      await this.page.goto(url, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      // Get Core Web Vitals
      const webVitals = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          let lcp = 0;
          let fid = 0;
          let cls = 0;
          let fcp = 0;
          let ttfb = 0;
          
          // Get timing data
          const timing = performance.timing;
          ttfb = timing.responseStart - timing.navigationStart;
          
          // Get First Contentful Paint
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          if (fcpEntry) {
            fcp = fcpEntry.startTime;
          }
          
          // Observe Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // Get Cumulative Layout Shift
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
          
          // Resolve after collecting data
          setTimeout(() => {
            resolve({
              lcp,
              fid,
              cls,
              fcp,
              ttfb,
              domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
              loadComplete: timing.loadEventEnd - timing.navigationStart
            });
          }, 2000);
        });
      });
      
      // Get resource timing
      const resources = await this.page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return {
          totalRequests: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          slowestResources: resources
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)
            .map(r => ({
              name: r.name.split('/').pop(),
              duration: Math.round(r.duration),
              size: r.transferSize || 0
            }))
        };
      });
      
      // Memory usage
      const memoryUsage = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
            totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576)
          };
        }
        return null;
      });
      
      // Log results
      console.log(`  📊 Performance Metrics for ${pageName}:`);
      console.log(`    - Page Load Time: ${loadTime}ms ${loadTime > this.performanceTargets.pageLoad ? '❌' : '✅'}`);
      console.log(`    - First Contentful Paint: ${Math.round(webVitals.fcp)}ms ${webVitals.fcp > this.performanceTargets.firstPaint ? '❌' : '✅'}`);
      console.log(`    - Largest Contentful Paint: ${Math.round(webVitals.lcp)}ms ${webVitals.lcp > this.performanceTargets.largestContentfulPaint ? '❌' : '✅'}`);
      console.log(`    - Cumulative Layout Shift: ${webVitals.cls.toFixed(3)} ${webVitals.cls > this.performanceTargets.cumulativeLayoutShift ? '❌' : '✅'}`);
      console.log(`    - Time to First Byte: ${webVitals.ttfb}ms`);
      console.log(`    - DOM Content Loaded: ${webVitals.domContentLoaded}ms`);
      console.log(`    - Total Requests: ${resources.totalRequests}`);
      console.log(`    - Total Size: ${(resources.totalSize / 1048576).toFixed(2)}MB`);
      
      if (memoryUsage) {
        console.log(`    - JS Heap Used: ${memoryUsage.usedJSHeapSize}MB / ${memoryUsage.totalJSHeapSize}MB`);
      }
      
      if (resources.slowestResources.length > 0) {
        console.log(`    - Slowest Resources:`);
        resources.slowestResources.forEach(r => {
          console.log(`      • ${r.name}: ${r.duration}ms (${(r.size / 1024).toFixed(1)}KB)`);
        });
      }
      
      await this.takeScreenshot(`performance-${pageName.toLowerCase().replace(/\s+/g, '-')}`);
      
      return {
        pageName,
        url,
        loadTime,
        webVitals,
        resources,
        memoryUsage,
        passed: loadTime <= this.performanceTargets.pageLoad &&
                webVitals.fcp <= this.performanceTargets.firstPaint &&
                webVitals.lcp <= this.performanceTargets.largestContentfulPaint &&
                webVitals.cls <= this.performanceTargets.cumulativeLayoutShift
      };
    } catch (error) {
      console.error(`  ❌ Performance measurement failed:`, error.message);
      return {
        pageName,
        url,
        error: error.message,
        passed: false
      };
    }
  }

  async testMobilePerformance() {
    console.log(`\n📱 Testing mobile performance...`);
    
    // Set mobile viewport
    await this.browserManager.setMobileDevice('iPhone 12');
    
    // Test key pages on mobile
    const mobilePages = [
      { name: 'Mobile Login', url: `${this.config.baseUrl}/login` },
      { name: 'Mobile Dashboard', url: `${this.config.baseUrl}/dashboard` },
      { name: 'Mobile Training', url: `${this.config.baseUrl}/training` }
    ];
    
    const results = [];
    for (const page of mobilePages) {
      const result = await this.measurePagePerformance(page.name, page.url);
      results.push(result);
    }
    
    return results;
  }

  async testUnderLoad() {
    console.log(`\n🔥 Testing performance under load...`);
    
    try {
      // Simulate multiple concurrent requests
      const concurrentRequests = 10;
      const promises = [];
      
      console.log(`  Simulating ${concurrentRequests} concurrent users...`);
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          this.page.evaluate(async (baseUrl) => {
            const startTime = Date.now();
            try {
              await fetch(`${baseUrl}/api/health`);
              return Date.now() - startTime;
            } catch (error) {
              return -1;
            }
          }, this.config.baseUrl)
        );
      }
      
      const responseTimes = await Promise.all(promises);
      const successfulRequests = responseTimes.filter(t => t > 0);
      const avgResponseTime = successfulRequests.reduce((a, b) => a + b, 0) / successfulRequests.length;
      
      console.log(`  ✅ ${successfulRequests.length}/${concurrentRequests} requests successful`);
      console.log(`  ⏱️  Average response time: ${Math.round(avgResponseTime)}ms`);
      
      return {
        totalRequests: concurrentRequests,
        successfulRequests: successfulRequests.length,
        avgResponseTime,
        passed: successfulRequests.length === concurrentRequests && avgResponseTime < 1000
      };
    } catch (error) {
      console.error('  ❌ Load test failed:', error.message);
      return { passed: false, error: error.message };
    }
  }

  async testNetworkConditions() {
    console.log(`\n🌐 Testing performance under different network conditions...`);
    
    const results = {};
    
    // Test under different network conditions
    for (const [profileName, profile] of Object.entries(this.config.networkProfiles)) {
      if (profileName === 'offline') continue; // Skip offline for performance tests
      
      console.log(`\n  Testing with ${profileName} network...`);
      await this.setNetworkConditions(profileName);
      
      const startTime = Date.now();
      await this.page.goto(`${this.config.baseUrl}/dashboard`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      console.log(`    Load time: ${loadTime}ms`);
      
      results[profileName] = {
        loadTime,
        passed: profileName === 'slow3G' ? loadTime < 10000 : loadTime < 5000
      };
      
      // Reset to fast network
      await this.setNetworkConditions('fast');
    }
    
    return results;
  }

  async testImageOptimization() {
    console.log(`\n🖼️ Testing image optimization...`);
    
    try {
      await this.page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      const imageStats = await this.page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        const stats = {
          totalImages: images.length,
          lazyLoaded: 0,
          optimizedFormats: 0,
          missingSrcset: 0,
          missingAlt: 0,
          oversized: 0,
          images: []
        };
        
        images.forEach(img => {
          const imgData = {
            src: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            displayWidth: img.clientWidth,
            displayHeight: img.clientHeight,
            hasAlt: !!img.alt,
            isLazy: img.loading === 'lazy',
            hasSrcset: !!img.srcset
          };
          
          if (imgData.isLazy) stats.lazyLoaded++;
          if (!imgData.hasAlt) stats.missingAlt++;
          if (!imgData.hasSrcset && imgData.width > 200) stats.missingSrcset++;
          if (imgData.src.includes('.webp') || imgData.src.includes('.avif')) stats.optimizedFormats++;
          if (imgData.width > imgData.displayWidth * 2) stats.oversized++;
          
          stats.images.push(imgData);
        });
        
        return stats;
      });
      
      console.log(`  📊 Image Optimization Results:`);
      console.log(`    - Total Images: ${imageStats.totalImages}`);
      console.log(`    - Lazy Loaded: ${imageStats.lazyLoaded} ${imageStats.lazyLoaded === imageStats.totalImages ? '✅' : '⚠️'}`);
      console.log(`    - Optimized Formats: ${imageStats.optimizedFormats}`);
      console.log(`    - Missing Srcset: ${imageStats.missingSrcset} ${imageStats.missingSrcset === 0 ? '✅' : '⚠️'}`);
      console.log(`    - Missing Alt Text: ${imageStats.missingAlt} ${imageStats.missingAlt === 0 ? '✅' : '❌'}`);
      console.log(`    - Oversized Images: ${imageStats.oversized} ${imageStats.oversized === 0 ? '✅' : '⚠️'}`);
      
      return imageStats;
    } catch (error) {
      console.error('  ❌ Image optimization test failed:', error.message);
      return { error: error.message };
    }
  }

  async runAllTests() {
    console.log('\n⚡ === PERFORMANCE MODULE TESTS ===\n');
    
    const results = {
      desktop: [],
      mobile: [],
      network: {},
      load: {},
      images: {}
    };
    
    // Test desktop performance
    console.log('\n💻 Desktop Performance Tests');
    const desktopPages = [
      { name: 'Login Page', url: `${this.config.baseUrl}/login` },
      { name: 'Dashboard', url: `${this.config.baseUrl}/dashboard` },
      { name: 'Training Page', url: `${this.config.baseUrl}/training` },
      { name: 'Profile Page', url: `${this.config.baseUrl}/profile` }
    ];
    
    for (const page of desktopPages) {
      const result = await this.measurePagePerformance(page.name, page.url);
      results.desktop.push(result);
      
      this.recordTestResult(`Performance - ${page.name}`, result.passed, {
        duration: result.loadTime,
        performance: result
      });
    }
    
    // Test mobile performance
    results.mobile = await this.testMobilePerformance();
    
    // Test under different network conditions
    results.network = await this.testNetworkConditions();
    
    // Test under load
    results.load = await this.testUnderLoad();
    
    // Test image optimization
    results.images = await this.testImageOptimization();
    
    // Summary
    console.log('\n📊 === PERFORMANCE SUMMARY ===');
    const passedTests = results.desktop.filter(r => r.passed).length + 
                       results.mobile.filter(r => r.passed).length;
    const totalTests = results.desktop.length + results.mobile.length;
    
    console.log(`  Desktop: ${results.desktop.filter(r => r.passed).length}/${results.desktop.length} passed`);
    console.log(`  Mobile: ${results.mobile.filter(r => r.passed).length}/${results.mobile.length} passed`);
    console.log(`  Overall: ${passedTests}/${totalTests} passed`);
    
    return results;
  }
}

module.exports = PerformanceModule;