const fs = require('fs');
const path = require('path');

class ManagerWorkflowModule {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.moduleName = 'ManagerWorkflow';
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
    console.log('\n👔 === MANAGER WORKFLOW MODULE TESTS ===\n');
    
    const results = [];
    
    try {
      // Test 1: Manager Magic Link Login
      console.log('🔗 Testing manager magic link login...');
      const managerLoginResult = await this.testManagerMagicLinkLogin();
      results.push(managerLoginResult);
      
      if (managerLoginResult.success) {
        // Test 2: Manager Dashboard Access
        console.log('📊 Testing manager dashboard access...');
        const dashboardResult = await this.testManagerDashboard();
        results.push(dashboardResult);
        
        // Test 3: Create Crew Member
        console.log('👤 Testing crew member creation...');
        const createCrewResult = await this.testCreateCrewMember();
        results.push(createCrewResult);
        
        // Test 4: Request Magic Link for Crew
        console.log('📧 Testing crew magic link request...');
        const crewMagicLinkResult = await this.testCrewMagicLinkRequest();
        results.push(crewMagicLinkResult);
        
        // Test 5: Manager Logout
        console.log('🚪 Testing manager logout...');
        const logoutResult = await this.testManagerLogout();
        results.push(logoutResult);
      } else {
        console.log('⚠️ Skipping manager workflow tests - login failed');
      }
      
    } catch (error) {
      console.error('❌ Fatal error in ManagerWorkflow:', error.message);
      await this.takeScreenshot('manager-workflow-fatal-error');
      results.push({
        testName: 'Manager Workflow Fatal Error',
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

  async testManagerMagicLinkLogin() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔗 MANAGER MAGIC LINK LOGIN TEST');
      console.log('📧 Please check your email for e2etest-manager@shipdocs.app');
      console.log('🔗 Copy the magic link URL from the email');
      console.log('📋 Set environment variable: MANAGER_MAGIC_LINK_URL="<copied_url>"');
      console.log('💡 Or the test will use a placeholder\n');
      
      // Check if we have a real magic link from environment
      let magicLinkUrl = process.env.MANAGER_MAGIC_LINK_URL;
      
      if (!magicLinkUrl) {
        // Use placeholder for demonstration
        magicLinkUrl = `${this.config.baseUrl}/login?token=REPLACE_WITH_MANAGER_TOKEN`;
        console.log('🔗 Using placeholder magic link (replace with actual)');
        console.log('💡 Set MANAGER_MAGIC_LINK_URL environment variable for real testing');
      } else {
        console.log('🔗 Using magic link from environment variable');
      }
      
      console.log('🔗 Navigating to magic link:', magicLinkUrl);
      
      await this.page.goto(magicLinkUrl);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('manager-magic-link-navigation');
      
      // Check if manager is logged in
      const currentUrl = this.page.url();
      const managerIndicators = [
        'text=Manager Dashboard',
        'text=Crew Management',
        'text=Manager',
        'text=Dashboard',
        currentUrl.includes('/manager'),
        currentUrl.includes('/dashboard')
      ];
      
      let isManagerLoggedIn = false;
      for (const indicator of managerIndicators) {
        try {
          if (typeof indicator === 'string') {
            const element = this.page.locator(indicator).first();
            if (await element.isVisible({ timeout: 2000 })) {
              isManagerLoggedIn = true;
              console.log('  ✅ Found manager authentication indicator:', indicator);
              break;
            }
          } else if (indicator === true) {
            isManagerLoggedIn = true;
            console.log('  ✅ URL indicates manager authenticated state');
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      await this.takeScreenshot('manager-login-result');
      
      return {
        testName: 'Manager Magic Link Login',
        success: isManagerLoggedIn,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          finalUrl: currentUrl,
          magicLinkUrl: magicLinkUrl,
          hasRealMagicLink: !!process.env.MANAGER_MAGIC_LINK_URL
        },
        error: isManagerLoggedIn ? null : 'Manager not logged in after magic link navigation',
        screenshots: ['manager-magic-link-navigation', 'manager-login-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('manager-login-error');
      return {
        testName: 'Manager Magic Link Login',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['manager-login-error']
      };
    }
  }

  async testManagerDashboard() {
    const startTime = Date.now();
    
    try {
      // Look for manager-specific dashboard elements
      const managerDashboardSelectors = [
        'text=Manager Dashboard',
        'text=Crew Management',
        'text=Add Crew',
        'text=Manage Crew',
        'text=Training Overview',
        '.manager-dashboard',
        '[data-testid="manager-dashboard"]'
      ];
      
      const foundElements = [];
      
      for (const selector of managerDashboardSelectors) {
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
      
      await this.takeScreenshot('manager-dashboard');
      
      const dashboardFound = foundElements.length > 0;
      
      if (dashboardFound) {
        console.log('  ✅ Found manager dashboard elements:', foundElements.length);
        foundElements.forEach(element => {
          console.log(`    - ${element.selector}: ${element.text}`);
        });
      }
      
      return {
        testName: 'Manager Dashboard Access',
        success: dashboardFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { foundElements: foundElements },
        error: dashboardFound ? null : 'No manager dashboard elements found',
        screenshots: ['manager-dashboard']
      };
      
    } catch (error) {
      await this.takeScreenshot('manager-dashboard-error');
      return {
        testName: 'Manager Dashboard Access',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['manager-dashboard-error']
      };
    }
  }

  async testCreateCrewMember() {
    const startTime = Date.now();
    
    try {
      // Look for crew creation options
      const crewCreationSelectors = [
        'text=Add Crew',
        'text=Create Crew',
        'text=New Crew Member',
        'text=Add User',
        'button:has-text("Add")',
        'button:has-text("Create")',
        '[data-testid="add-crew"]',
        '[data-testid="create-crew"]'
      ];
      
      let crewCreationFound = false;
      let clickedElement = '';
      
      for (const selector of crewCreationSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            const text = await element.textContent();
            await element.click();
            crewCreationFound = true;
            clickedElement = `${selector}: ${text?.substring(0, 30)}...`;
            console.log('  ✅ Clicked crew creation element:', clickedElement);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (crewCreationFound) {
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('crew-creation-form');
        
        // Fill crew member details
        const testCrewData = {
          email: 'e2etest-crew@shipdocs.app',
          firstName: 'E2E',
          lastName: 'TestCrew',
          role: 'crew'
        };
        
        // Try to fill form fields
        const fieldMappings = [
          { data: testCrewData.email, selectors: ['input[name="email"]', 'input[type="email"]', '#email'] },
          { data: testCrewData.firstName, selectors: ['input[name="firstName"]', 'input[name="first_name"]', '#firstName'] },
          { data: testCrewData.lastName, selectors: ['input[name="lastName"]', 'input[name="last_name"]', '#lastName'] }
        ];
        
        for (const field of fieldMappings) {
          let fieldFilled = false;
          for (const selector of field.selectors) {
            try {
              const input = this.page.locator(selector).first();
              if (await input.isVisible({ timeout: 1000 })) {
                await input.fill(field.data);
                fieldFilled = true;
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          if (!fieldFilled) {
            console.log(`⚠️ Could not fill field with data: ${field.data}`);
          }
        }
        
        await this.takeScreenshot('crew-form-filled');
        
        // Submit form
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Create")',
          'button:has-text("Add")',
          'button:has-text("Save")'
        ];
        
        let formSubmitted = false;
        for (const selector of submitSelectors) {
          try {
            const button = this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 1000 })) {
              await button.click();
              formSubmitted = true;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        await this.page.waitForTimeout(2000);
        await this.takeScreenshot('crew-creation-result');
        
        return {
          testName: 'Create Crew Member',
          success: formSubmitted,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          data: { 
            clickedElement: clickedElement,
            testCrewData: testCrewData,
            formSubmitted: formSubmitted
          },
          error: formSubmitted ? null : 'Could not submit crew creation form',
          screenshots: ['crew-creation-form', 'crew-form-filled', 'crew-creation-result']
        };
      } else {
        await this.takeScreenshot('crew-creation-not-found');
        
        return {
          testName: 'Create Crew Member',
          success: false,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'No crew creation elements found',
          screenshots: ['crew-creation-not-found']
        };
      }
      
    } catch (error) {
      await this.takeScreenshot('crew-creation-error');
      return {
        testName: 'Create Crew Member',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['crew-creation-error']
      };
    }
  }

  async testCrewMagicLinkRequest() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page to test crew magic link
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Fill email for crew magic link
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill('e2etest-crew@shipdocs.app');
      
      await this.takeScreenshot('crew-magic-link-request-form');
      
      // Submit magic link request
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Send")').first();
      await submitButton.click();
      
      await this.page.waitForTimeout(2000);
      
      // Look for confirmation
      const confirmationSelectors = [
        '.toast',
        '.notification',
        '.alert',
        '.success',
        'text=sent',
        'text=email',
        'text=check',
        '[data-testid="magic-link-confirmation"]'
      ];
      
      let confirmationFound = false;
      let confirmationMessage = '';
      
      for (const selector of confirmationSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            confirmationMessage = await element.textContent();
            confirmationFound = true;
            console.log('  ✅ Found crew magic link confirmation:', confirmationMessage);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('crew-magic-link-requested');
      
      console.log('📧 Check email for e2etest-crew@shipdocs.app');
      console.log('🔗 Set CREW_MAGIC_LINK_URL environment variable for crew login testing');
      
      return {
        testName: 'Crew Magic Link Request',
        success: confirmationFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { confirmationMessage: confirmationMessage },
        error: confirmationFound ? null : 'No magic link confirmation found',
        screenshots: ['crew-magic-link-request-form', 'crew-magic-link-requested']
      };
      
    } catch (error) {
      await this.takeScreenshot('crew-magic-link-error');
      return {
        testName: 'Crew Magic Link Request',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['crew-magic-link-error']
      };
    }
  }

  async testManagerLogout() {
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
      
      await this.takeScreenshot('manager-logout-result');
      
      return {
        testName: 'Manager Logout',
        success: logoutFound && onLoginPage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          logoutElement: logoutElement,
          finalUrl: currentUrl,
          onLoginPage: onLoginPage
        },
        error: logoutFound ? (onLoginPage ? null : 'Logout button found but did not redirect to login') : 'No logout button found',
        screenshots: ['manager-logout-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('manager-logout-error');
      return {
        testName: 'Manager Logout',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['manager-logout-error']
      };
    }
  }
}

module.exports = ManagerWorkflowModule;
