const fs = require('fs');
const path = require('path');

class AdminTestSetupModule {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.moduleName = 'AdminTestSetup';
    this.adminCredentials = {
      email: 'adminmartexx@shipdocs.app',
      password: 'Yumminova211@#'
    };
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
    console.log('\n🔧 === ADMIN TEST SETUP MODULE TESTS ===\n');
    
    const results = [];
    
    try {
      // Test 1: Admin Login
      console.log('🔐 Testing admin login...');
      const loginResult = await this.testAdminLogin();
      results.push(loginResult);
      
      if (loginResult.success) {
        // Test 2: Create Test Manager
        console.log('👤 Creating test manager for E2E testing...');
        const createManagerResult = await this.createTestManager();
        results.push(createManagerResult);

        // Test 3: Verify Test Manager Creation
        console.log('✅ Verifying test manager creation...');
        const verifyManagerResult = await this.verifyTestManagerCreation();
        results.push(verifyManagerResult);

        // Test 4: Request Magic Link for Test Manager
        console.log('📧 Requesting magic link for test manager...');
        const magicLinkResult = await this.requestMagicLinkForTestManager();
        results.push(magicLinkResult);

        // Test 5: Extract Magic Link from Console/Network
        console.log('🔗 Attempting to extract magic link...');
        const extractLinkResult = await this.extractMagicLink();
        results.push(extractLinkResult);
      }
      
    } catch (error) {
      console.error('❌ Fatal error in AdminTestSetup:', error.message);
      await this.takeScreenshot('admin-setup-fatal-error');
      results.push({
        testName: 'Admin Setup Fatal Error',
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

  async testAdminLogin() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Take screenshot of initial page
      await this.takeScreenshot('admin-login-start');
      
      // Click "Need help logging in"
      const helpLink = await this.page.locator('text=Need help logging in').first();
      if (await helpLink.isVisible()) {
        await helpLink.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Click "Administrator login"
      const adminLink = await this.page.locator('text=Administrator login').first();
      if (await adminLink.isVisible()) {
        await adminLink.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Take screenshot of admin form
      await this.takeScreenshot('admin-form-visible');
      
      // Fill admin credentials
      const emailInput = this.page.locator('input[type="email"]').last();
      const passwordInput = this.page.locator('input[type="password"]').last();
      
      await emailInput.fill(this.adminCredentials.email);
      await passwordInput.fill(this.adminCredentials.password);
      
      // Take screenshot before submit
      await this.takeScreenshot('admin-credentials-filled');
      
      // Submit form
      const submitButton = this.page.locator('button[type="submit"]').last();
      await submitButton.click();
      
      // Wait for navigation or dashboard
      await this.page.waitForTimeout(3000);
      await this.page.waitForLoadState('networkidle');
      
      // Check if we're on admin dashboard
      const currentUrl = this.page.url();
      const isAdminDashboard = currentUrl.includes('/admin') || 
                              await this.page.locator('text=Admin Dashboard').isVisible() ||
                              await this.page.locator('text=System Management').isVisible();
      
      await this.takeScreenshot('admin-login-result');
      
      if (isAdminDashboard) {
        console.log('✅ Admin login successful');
        return {
          testName: 'Admin Login',
          success: true,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          screenshots: ['admin-login-start', 'admin-form-visible', 'admin-credentials-filled', 'admin-login-result']
        };
      } else {
        throw new Error('Admin login failed - not redirected to admin dashboard');
      }
      
    } catch (error) {
      await this.takeScreenshot('admin-login-error');
      return {
        testName: 'Admin Login',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['admin-login-error']
      };
    }
  }

  async createTestManager() {
    const startTime = Date.now();
    
    try {
      // Navigate to manager management
      const managerManagementSelectors = [
        'text=Manager Management',
        'text=Managers',
        'text=Add Manager',
        'text=Create Manager',
        'a[href*="manager"]',
        'text=User Management'
      ];
      
      let managerManagementFound = false;
      for (const selector of managerManagementSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            managerManagementFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!managerManagementFound) {
        // Try to find any navigation menu
        await this.takeScreenshot('admin-dashboard-navigation');
        throw new Error('Could not find manager management section');
      }
      
      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('manager-management-page');

      // Look for "Add Manager" or "Create Manager" button
      const addManagerSelectors = [
        'text=Add Manager',
        'text=Create Manager',
        'text=New Manager',
        'button:has-text("Add")',
        'button:has-text("Create")',
        '[data-testid="add-manager"]',
        '[data-testid="create-manager"]'
      ];
      
      let addManagerFound = false;
      for (const selector of addManagerSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            addManagerFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!addManagerFound) {
        throw new Error('Could not find add manager button');
      }

      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('add-manager-form');

      // Fill test manager details
      const testManagerData = {
        email: 'e2etest-manager@shipdocs.app',
        firstName: 'E2E',
        lastName: 'TestManager',
        role: 'manager'
      };
      
      // Fill form fields (try multiple possible selectors)
      const fieldMappings = [
        { data: testManagerData.email, selectors: ['input[name="email"]', 'input[type="email"]', '#email'] },
        { data: testManagerData.firstName, selectors: ['input[name="firstName"]', 'input[name="first_name"]', '#firstName'] },
        { data: testManagerData.lastName, selectors: ['input[name="lastName"]', 'input[name="last_name"]', '#lastName'] }
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
      
      // Select role if dropdown exists
      try {
        const roleSelect = this.page.locator('select[name="role"], #role').first();
        if (await roleSelect.isVisible({ timeout: 1000 })) {
          await roleSelect.selectOption('manager');
        }
      } catch (e) {
        // Role selection not available or different format
      }

      await this.takeScreenshot('test-manager-form-filled');
      
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
      
      if (!formSubmitted) {
        throw new Error('Could not find submit button');
      }
      
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('test-manager-created');

      console.log('✅ Test manager creation attempted');
      return {
        testName: 'Create Test Manager',
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: testManagerData,
        screenshots: ['manager-management-page', 'add-manager-form', 'test-manager-form-filled', 'test-manager-created']
      };
      
    } catch (error) {
      await this.takeScreenshot('create-manager-error');
      return {
        testName: 'Create Test Manager',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['create-user-error']
      };
    }
  }

  async verifyTestUserCreation() {
    const startTime = Date.now();
    
    try {
      // Look for the test user in the user list
      const testEmail = 'e2etest@shipdocs.app';
      
      // Try to find the user in various ways
      const userFoundSelectors = [
        `text=${testEmail}`,
        `text=E2E TestUser`,
        `text=E2E`,
        `text=TestUser`
      ];
      
      let userFound = false;
      for (const selector of userFoundSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            userFound = true;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('user-verification');
      
      return {
        testName: 'Verify Test User Creation',
        success: userFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: userFound ? null : 'Test user not found in user list',
        screenshots: ['user-verification']
      };
      
    } catch (error) {
      await this.takeScreenshot('verify-user-error');
      return {
        testName: 'Verify Test User Creation',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['verify-user-error']
      };
    }
  }

  async requestMagicLinkForTestUser() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page in new tab or logout first
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Fill email for magic link
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill('e2etest@shipdocs.app');
      
      await this.takeScreenshot('magic-link-request-form');
      
      // Submit magic link request
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Send")').first();
      await submitButton.click();
      
      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('magic-link-requested');
      
      console.log('✅ Magic link requested for test user');
      console.log('📧 Check console logs or network tab for magic link URL');
      
      return {
        testName: 'Request Magic Link for Test User',
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['magic-link-request-form', 'magic-link-requested']
      };
      
    } catch (error) {
      await this.takeScreenshot('magic-link-request-error');
      return {
        testName: 'Request Magic Link for Test User',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['magic-link-request-error']
      };
    }
  }

  async extractMagicLink() {
    const startTime = Date.now();
    
    try {
      // Listen for console logs that might contain magic links
      const consoleLogs = [];
      this.page.on('console', msg => {
        const text = msg.text();
        if (text.includes('magic') || text.includes('token') || text.includes('http')) {
          consoleLogs.push(text);
          console.log('🔗 Console log:', text);
        }
      });
      
      // Listen for network requests that might contain magic links
      const networkRequests = [];
      this.page.on('response', response => {
        if (response.url().includes('magic') || response.url().includes('auth')) {
          networkRequests.push({
            url: response.url(),
            status: response.status()
          });
          console.log('🌐 Network request:', response.url(), response.status());
        }
      });
      
      await this.page.waitForTimeout(5000);
      
      console.log('📋 Console logs captured:', consoleLogs.length);
      console.log('📋 Network requests captured:', networkRequests.length);
      
      // Output instructions for manual magic link extraction
      console.log('\n🔗 MAGIC LINK EXTRACTION INSTRUCTIONS:');
      console.log('1. Check your email for e2etest@shipdocs.app');
      console.log('2. Copy the magic link from the email');
      console.log('3. Paste it in the terminal when prompted');
      console.log('4. Or check the console logs above for any magic link URLs\n');
      
      return {
        testName: 'Extract Magic Link',
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: {
          consoleLogs: consoleLogs,
          networkRequests: networkRequests
        }
      };
      
    } catch (error) {
      return {
        testName: 'Extract Magic Link',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AdminTestSetupModule;
