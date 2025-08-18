const fs = require('fs');
const path = require('path');

class TrainingWorkflowModule {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.moduleName = 'TrainingWorkflow';
  }

  async takeScreenshot(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const filename = `${name}-${timestamp}.png`;
      const screenshotPath = path.join(__dirname, '../../reports/screenshots', filename);

      // Ensure directory exists
      const dir = path.dirname(screenshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await this.page.screenshot({ path: screenshotPath });
      console.log(`📸 Screenshot saved: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`⚠️ Could not take screenshot: ${error.message}`);
      return null;
    }
  }

  generateSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

    return {
      total: total,
      passed: passed,
      failed: failed,
      successRate: `${successRate}%`
    };
  }

  async runAllTests() {
    console.log('\n🚢 === TRAINING WORKFLOW MODULE TESTS ===\n');
    
    const results = [];
    
    try {
      // Test 1: Dashboard Access
      console.log('📊 Testing dashboard access...');
      const dashboardResult = await this.testDashboardAccess();
      results.push(dashboardResult);
      
      if (dashboardResult.success) {
        // Test 2: Training Phase Cards
        console.log('📚 Testing training phase cards...');
        const phaseCardsResult = await this.testTrainingPhaseCards();
        results.push(phaseCardsResult);
        
        // Test 3: Progress Tracking
        console.log('📈 Testing progress tracking...');
        const progressResult = await this.testProgressTracking();
        results.push(progressResult);
        
        // Test 4: Phase Navigation
        console.log('🧭 Testing phase navigation...');
        const navigationResult = await this.testPhaseNavigation();
        results.push(navigationResult);
        
        // Test 5: Certificate Generation
        console.log('📜 Testing certificate generation...');
        const certificateResult = await this.testCertificateGeneration();
        results.push(certificateResult);
        
        // Test 6: Logout Functionality
        console.log('🚪 Testing logout functionality...');
        const logoutResult = await this.testLogoutFunctionality();
        results.push(logoutResult);
      } else {
        console.log('⚠️ Skipping training tests - dashboard not accessible');
      }
      
    } catch (error) {
      console.error('❌ Fatal error in TrainingWorkflow:', error.message);
      await this.takeScreenshot('training-workflow-fatal-error');
      results.push({
        testName: 'Training Workflow Fatal Error',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      moduleName: this.moduleName,
      results: results,
      summary: this.generateSummary(results)
    };
  }

  async testDashboardAccess() {
    const startTime = Date.now();
    
    try {
      // Assume we're already logged in from previous tests
      // Navigate to dashboard
      const dashboardUrls = [
        `${this.config.baseUrl}/crew`,
        `${this.config.baseUrl}/dashboard`,
        `${this.config.baseUrl}/training`,
        this.config.baseUrl
      ];
      
      let dashboardFound = false;
      let finalUrl = '';
      
      for (const url of dashboardUrls) {
        try {
          await this.page.goto(url);
          await this.page.waitForLoadState('networkidle');
          await this.page.waitForTimeout(2000);
          
          finalUrl = this.page.url();
          
          // Check for dashboard indicators
          const dashboardIndicators = [
            'text=Dashboard',
            'text=Training',
            'text=Progress',
            'text=Phase',
            'text=Welcome',
            '.dashboard',
            '.training-overview',
            '[data-testid="dashboard"]'
          ];
          
          for (const indicator of dashboardIndicators) {
            try {
              const element = this.page.locator(indicator).first();
              if (await element.isVisible({ timeout: 2000 })) {
                dashboardFound = true;
                console.log('  ✅ Found dashboard indicator:', indicator);
                break;
              }
            } catch (e) {
              // Continue checking
            }
          }
          
          if (dashboardFound) {
            console.log('  ✅ Dashboard accessible at:', url);
            break;
          }
          
        } catch (e) {
          console.log('  ❌ Could not access:', url);
        }
      }
      
      await this.takeScreenshot('dashboard-access');
      
      return {
        testName: 'Dashboard Access',
        success: dashboardFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { finalUrl: finalUrl },
        error: dashboardFound ? null : 'Dashboard not accessible',
        screenshots: ['dashboard-access']
      };
      
    } catch (error) {
      await this.takeScreenshot('dashboard-access-error');
      return {
        testName: 'Dashboard Access',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['dashboard-access-error']
      };
    }
  }

  async testTrainingPhaseCards() {
    const startTime = Date.now();
    
    try {
      // Look for training phase cards
      const phaseSelectors = [
        '[data-testid*="phase"]',
        '.phase-card',
        '.training-phase',
        'text=Phase 1',
        'text=Phase 2',
        'text=Phase 3',
        'text=Maritime Safety',
        'text=Navigation',
        'text=Emergency'
      ];
      
      const foundPhases = [];
      
      for (const selector of phaseSelectors) {
        try {
          const elements = this.page.locator(selector);
          const count = await elements.count();
          
          if (count > 0) {
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              if (await element.isVisible({ timeout: 1000 })) {
                const text = await element.textContent();
                foundPhases.push({
                  selector: selector,
                  text: text?.substring(0, 50) + '...',
                  index: i
                });
              }
            }
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('training-phase-cards');
      
      const phasesFound = foundPhases.length > 0;
      
      if (phasesFound) {
        console.log('  ✅ Found training phases:', foundPhases.length);
        foundPhases.forEach(phase => {
          console.log(`    - ${phase.selector}: ${phase.text}`);
        });
      }
      
      return {
        testName: 'Training Phase Cards',
        success: phasesFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { foundPhases: foundPhases },
        error: phasesFound ? null : 'No training phase cards found',
        screenshots: ['training-phase-cards']
      };
      
    } catch (error) {
      await this.takeScreenshot('phase-cards-error');
      return {
        testName: 'Training Phase Cards',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['phase-cards-error']
      };
    }
  }

  async testProgressTracking() {
    const startTime = Date.now();
    
    try {
      // Look for progress indicators
      const progressSelectors = [
        '.progress',
        '.progress-bar',
        'text=%',
        'text=progress',
        'text=completed',
        '[data-testid="progress"]',
        '.percentage',
        'text=0%',
        'text=25%',
        'text=50%',
        'text=75%',
        'text=100%'
      ];
      
      const foundProgress = [];
      
      for (const selector of progressSelectors) {
        try {
          const elements = this.page.locator(selector);
          const count = await elements.count();
          
          if (count > 0) {
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              if (await element.isVisible({ timeout: 1000 })) {
                const text = await element.textContent();
                foundProgress.push({
                  selector: selector,
                  text: text?.trim(),
                  index: i
                });
              }
            }
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('progress-tracking');
      
      const progressFound = foundProgress.length > 0;
      
      if (progressFound) {
        console.log('  ✅ Found progress indicators:', foundProgress.length);
        foundProgress.forEach(progress => {
          console.log(`    - ${progress.selector}: ${progress.text}`);
        });
      }
      
      return {
        testName: 'Progress Tracking',
        success: progressFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { foundProgress: foundProgress },
        error: progressFound ? null : 'No progress indicators found',
        screenshots: ['progress-tracking']
      };
      
    } catch (error) {
      await this.takeScreenshot('progress-tracking-error');
      return {
        testName: 'Progress Tracking',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['progress-tracking-error']
      };
    }
  }

  async testPhaseNavigation() {
    const startTime = Date.now();
    
    try {
      // Try to click on a training phase
      const clickablePhaseSelectors = [
        '[data-testid*="phase"]:first-child',
        '.phase-card:first-child',
        '.training-phase:first-child',
        'button:has-text("Start")',
        'button:has-text("Continue")',
        'a:has-text("Phase")'
      ];
      
      let phaseClicked = false;
      let clickedElement = '';
      
      for (const selector of clickablePhaseSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            const text = await element.textContent();
            await element.click();
            phaseClicked = true;
            clickedElement = `${selector}: ${text?.substring(0, 30)}...`;
            console.log('  ✅ Clicked phase element:', clickedElement);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (phaseClicked) {
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle');
        
        // Check if we navigated to a training page
        const currentUrl = this.page.url();
        const trainingIndicators = [
          'text=Training',
          'text=Lesson',
          'text=Quiz',
          'text=Content',
          currentUrl.includes('/training'),
          currentUrl.includes('/phase'),
          currentUrl.includes('/lesson')
        ];
        
        let onTrainingPage = false;
        for (const indicator of trainingIndicators) {
          try {
            if (typeof indicator === 'string') {
              const element = this.page.locator(indicator).first();
              if (await element.isVisible({ timeout: 2000 })) {
                onTrainingPage = true;
                console.log('  ✅ Found training page indicator:', indicator);
                break;
              }
            } else if (indicator === true) {
              onTrainingPage = true;
              console.log('  ✅ URL indicates training page');
              break;
            }
          } catch (e) {
            // Continue checking
          }
        }
        
        await this.takeScreenshot('phase-navigation-result');
        
        return {
          testName: 'Phase Navigation',
          success: onTrainingPage,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          data: { 
            clickedElement: clickedElement,
            finalUrl: currentUrl
          },
          error: onTrainingPage ? null : 'Phase click did not navigate to training page',
          screenshots: ['phase-navigation-result']
        };
      } else {
        await this.takeScreenshot('phase-navigation-no-click');
        
        return {
          testName: 'Phase Navigation',
          success: false,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'No clickable phase elements found',
          screenshots: ['phase-navigation-no-click']
        };
      }
      
    } catch (error) {
      await this.takeScreenshot('phase-navigation-error');
      return {
        testName: 'Phase Navigation',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['phase-navigation-error']
      };
    }
  }

  async testCertificateGeneration() {
    const startTime = Date.now();
    
    try {
      // Look for certificate-related elements
      const certificateSelectors = [
        'text=Certificate',
        'text=Download',
        'text=Generate',
        'button:has-text("Certificate")',
        'a:has-text("Certificate")',
        '[data-testid="certificate"]',
        '.certificate'
      ];
      
      let certificateElementFound = false;
      let certificateText = '';
      
      for (const selector of certificateSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            certificateText = await element.textContent();
            certificateElementFound = true;
            console.log('  ✅ Found certificate element:', selector);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('certificate-generation');
      
      return {
        testName: 'Certificate Generation',
        success: certificateElementFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { certificateText: certificateText },
        error: certificateElementFound ? null : 'No certificate elements found',
        screenshots: ['certificate-generation']
      };
      
    } catch (error) {
      await this.takeScreenshot('certificate-generation-error');
      return {
        testName: 'Certificate Generation',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['certificate-generation-error']
      };
    }
  }

  async testLogoutFunctionality() {
    const startTime = Date.now();
    
    try {
      // Look for logout button
      const logoutSelectors = [
        'text=Logout',
        'text=Sign out',
        'text=Log out',
        'button:has-text("Logout")',
        'a:has-text("Logout")',
        '[data-testid="logout"]',
        '.logout'
      ];
      
      let logoutFound = false;
      let logoutElement = '';
      
      for (const selector of logoutSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            logoutElement = selector;
            logoutFound = true;
            console.log('  ✅ Found logout element:', selector);
            
            // Try to click logout
            await element.click();
            await this.page.waitForTimeout(2000);
            await this.page.waitForLoadState('networkidle');
            
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      // Check if we're back on login page
      const currentUrl = this.page.url();
      const onLoginPage = currentUrl.includes('/login') || 
                         await this.page.locator('text=Login').isVisible() ||
                         await this.page.locator('input[type="email"]').isVisible();
      
      await this.takeScreenshot('logout-result');
      
      return {
        testName: 'Logout Functionality',
        success: logoutFound && onLoginPage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          logoutElement: logoutElement,
          finalUrl: currentUrl,
          onLoginPage: onLoginPage
        },
        error: logoutFound ? (onLoginPage ? null : 'Logout button found but did not redirect to login') : 'No logout button found',
        screenshots: ['logout-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('logout-error');
      return {
        testName: 'Logout Functionality',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['logout-error']
      };
    }
  }
}

module.exports = TrainingWorkflowModule;
