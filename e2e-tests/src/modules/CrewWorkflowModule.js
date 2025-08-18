const fs = require('fs');
const path = require('path');

class CrewWorkflowModule {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.moduleName = 'CrewWorkflow';
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
    console.log('\n⚓ === CREW WORKFLOW MODULE TESTS ===\n');
    
    const results = [];
    
    try {
      // Test 1: Crew Magic Link Login
      console.log('🔗 Testing crew magic link login...');
      const crewLoginResult = await this.testCrewMagicLinkLogin();
      results.push(crewLoginResult);
      
      if (crewLoginResult.success) {
        // Test 2: Crew Dashboard Access
        console.log('📊 Testing crew dashboard access...');
        const dashboardResult = await this.testCrewDashboard();
        results.push(dashboardResult);
        
        // Test 3: Training Phase Access
        console.log('📚 Testing training phase access...');
        const trainingResult = await this.testTrainingPhaseAccess();
        results.push(trainingResult);
        
        // Test 4: Training Progress
        console.log('📈 Testing training progress tracking...');
        const progressResult = await this.testTrainingProgress();
        results.push(progressResult);
        
        // Test 5: Certificate Generation
        console.log('📜 Testing certificate generation...');
        const certificateResult = await this.testCertificateGeneration();
        results.push(certificateResult);
        
        // Test 6: Crew Logout
        console.log('🚪 Testing crew logout...');
        const logoutResult = await this.testCrewLogout();
        results.push(logoutResult);
      } else {
        console.log('⚠️ Skipping crew workflow tests - login failed');
      }
      
    } catch (error) {
      console.error('❌ Fatal error in CrewWorkflow:', error.message);
      await this.takeScreenshot('crew-workflow-fatal-error');
      results.push({
        testName: 'Crew Workflow Fatal Error',
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

  async testCrewMagicLinkLogin() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔗 CREW MAGIC LINK LOGIN TEST');
      console.log('📧 Please check your email for e2etest-crew@shipdocs.app');
      console.log('🔗 Copy the magic link URL from the email');
      console.log('📋 Set environment variable: CREW_MAGIC_LINK_URL="<copied_url>"');
      console.log('💡 Or the test will use a placeholder\n');
      
      // Check if we have a real magic link from environment
      let magicLinkUrl = process.env.CREW_MAGIC_LINK_URL;
      
      if (!magicLinkUrl) {
        // Use placeholder for demonstration
        magicLinkUrl = `${this.config.baseUrl}/login?token=REPLACE_WITH_CREW_TOKEN`;
        console.log('🔗 Using placeholder magic link (replace with actual)');
        console.log('💡 Set CREW_MAGIC_LINK_URL environment variable for real testing');
      } else {
        console.log('🔗 Using magic link from environment variable');
      }
      
      console.log('🔗 Navigating to magic link:', magicLinkUrl);
      
      await this.page.goto(magicLinkUrl);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('crew-magic-link-navigation');
      
      // Check if crew is logged in
      const currentUrl = this.page.url();
      const crewIndicators = [
        'text=Crew Dashboard',
        'text=Training',
        'text=My Training',
        'text=Progress',
        'text=Welcome',
        currentUrl.includes('/crew'),
        currentUrl.includes('/dashboard'),
        currentUrl.includes('/training')
      ];
      
      let isCrewLoggedIn = false;
      for (const indicator of crewIndicators) {
        try {
          if (typeof indicator === 'string') {
            const element = this.page.locator(indicator).first();
            if (await element.isVisible({ timeout: 2000 })) {
              isCrewLoggedIn = true;
              console.log('  ✅ Found crew authentication indicator:', indicator);
              break;
            }
          } else if (indicator === true) {
            isCrewLoggedIn = true;
            console.log('  ✅ URL indicates crew authenticated state');
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      await this.takeScreenshot('crew-login-result');
      
      return {
        testName: 'Crew Magic Link Login',
        success: isCrewLoggedIn,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          finalUrl: currentUrl,
          magicLinkUrl: magicLinkUrl,
          hasRealMagicLink: !!process.env.CREW_MAGIC_LINK_URL
        },
        error: isCrewLoggedIn ? null : 'Crew not logged in after magic link navigation',
        screenshots: ['crew-magic-link-navigation', 'crew-login-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('crew-login-error');
      return {
        testName: 'Crew Magic Link Login',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['crew-login-error']
      };
    }
  }

  async testCrewDashboard() {
    const startTime = Date.now();
    
    try {
      // Look for crew-specific dashboard elements
      const crewDashboardSelectors = [
        'text=Training Dashboard',
        'text=My Training',
        'text=Training Progress',
        'text=Phase',
        'text=Maritime',
        '.training-dashboard',
        '.crew-dashboard',
        '[data-testid="crew-dashboard"]'
      ];
      
      const foundElements = [];
      
      for (const selector of crewDashboardSelectors) {
        try {
          const elements = this.page.locator(selector);
          const count = await elements.count();
          
          if (count > 0) {
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              if (await element.isVisible({ timeout: 1000 })) {
                const text = await element.textContent();
                foundElements.push({
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
      
      await this.takeScreenshot('crew-dashboard');
      
      const dashboardFound = foundElements.length > 0;
      
      if (dashboardFound) {
        console.log('  ✅ Found crew dashboard elements:', foundElements.length);
        foundElements.forEach(element => {
          console.log(`    - ${element.selector}: ${element.text}`);
        });
      }
      
      return {
        testName: 'Crew Dashboard Access',
        success: dashboardFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { foundElements: foundElements },
        error: dashboardFound ? null : 'No crew dashboard elements found',
        screenshots: ['crew-dashboard']
      };
      
    } catch (error) {
      await this.takeScreenshot('crew-dashboard-error');
      return {
        testName: 'Crew Dashboard Access',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['crew-dashboard-error']
      };
    }
  }

  async testTrainingPhaseAccess() {
    const startTime = Date.now();
    
    try {
      // Look for training phase elements
      const phaseSelectors = [
        '[data-testid*="phase"]',
        '.phase-card',
        '.training-phase',
        'text=Phase 1',
        'text=Phase 2',
        'text=Maritime Safety',
        'text=Navigation',
        'text=Emergency',
        'text=Get Started',
        'text=Start Training',
        'text=Continue'
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
      
      // Try to click on a training phase
      let phaseClicked = false;
      let clickedElement = '';
      
      const clickableSelectors = [
        'button:has-text("Get Started")',
        'button:has-text("Start")',
        'button:has-text("Continue")',
        '.phase-card:first-child',
        '[data-testid*="phase"]:first-child'
      ];
      
      for (const selector of clickableSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            const text = await element.textContent();
            await element.click();
            phaseClicked = true;
            clickedElement = `${selector}: ${text?.substring(0, 30)}...`;
            console.log('  ✅ Clicked training phase element:', clickedElement);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (phaseClicked) {
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle');
      }
      
      await this.takeScreenshot('training-phase-access');
      
      const phasesFound = foundPhases.length > 0;
      
      if (phasesFound) {
        console.log('  ✅ Found training phases:', foundPhases.length);
        foundPhases.forEach(phase => {
          console.log(`    - ${phase.selector}: ${phase.text}`);
        });
      }
      
      return {
        testName: 'Training Phase Access',
        success: phasesFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          foundPhases: foundPhases,
          phaseClicked: phaseClicked,
          clickedElement: clickedElement
        },
        error: phasesFound ? null : 'No training phase elements found',
        screenshots: ['training-phase-access']
      };
      
    } catch (error) {
      await this.takeScreenshot('training-phase-error');
      return {
        testName: 'Training Phase Access',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['training-phase-error']
      };
    }
  }

  async testTrainingProgress() {
    const startTime = Date.now();
    
    try {
      // Look for progress indicators
      const progressSelectors = [
        '.progress',
        '.progress-bar',
        'text=%',
        'text=progress',
        'text=completed',
        'text=Progress:',
        '[data-testid="progress"]',
        '.percentage'
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
      
      await this.takeScreenshot('training-progress');
      
      const progressFound = foundProgress.length > 0;
      
      if (progressFound) {
        console.log('  ✅ Found progress indicators:', foundProgress.length);
        foundProgress.forEach(progress => {
          console.log(`    - ${progress.selector}: ${progress.text}`);
        });
      }
      
      return {
        testName: 'Training Progress Tracking',
        success: progressFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { foundProgress: foundProgress },
        error: progressFound ? null : 'No progress indicators found',
        screenshots: ['training-progress']
      };
      
    } catch (error) {
      await this.takeScreenshot('training-progress-error');
      return {
        testName: 'Training Progress Tracking',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['training-progress-error']
      };
    }
  }

  async testCertificateGeneration() {
    const startTime = Date.now();
    
    try {
      // Look for certificate-related elements
      const certificateSelectors = [
        'text=Certificate',
        'text=Download Certificate',
        'text=Generate Certificate',
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

  async testCrewLogout() {
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
      
      await this.takeScreenshot('crew-logout-result');
      
      return {
        testName: 'Crew Logout',
        success: logoutFound && onLoginPage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          logoutElement: logoutElement,
          finalUrl: currentUrl,
          onLoginPage: onLoginPage
        },
        error: logoutFound ? (onLoginPage ? null : 'Logout button found but did not redirect to login') : 'No logout button found',
        screenshots: ['crew-logout-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('crew-logout-error');
      return {
        testName: 'Crew Logout',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['crew-logout-error']
      };
    }
  }
}

module.exports = CrewWorkflowModule;
