const fs = require('fs');
const path = require('path');

class EnhancedAuthenticationModule {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.moduleName = 'EnhancedAuthentication';
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
    console.log('\n🔐 === ENHANCED AUTHENTICATION MODULE TESTS ===\n');
    
    const results = [];
    
    try {
      // Test 1: Admin Login with Correct Flow
      console.log('🔐 Testing admin login with correct UI flow...');
      const adminLoginResult = await this.testAdminLoginFlow();
      results.push(adminLoginResult);
      
      // Test 2: Magic Link Request with Toast Verification
      console.log('📧 Testing magic link request with toast verification...');
      const magicLinkResult = await this.testMagicLinkWithToast();
      results.push(magicLinkResult);
      
      // Test 3: Magic Link Completion (Manual Input)
      console.log('🔗 Testing magic link completion...');
      const magicLinkCompletionResult = await this.testMagicLinkCompletion();
      results.push(magicLinkCompletionResult);
      
      // Test 4: Loading States
      console.log('⏳ Testing loading states during authentication...');
      const loadingStatesResult = await this.testLoadingStates();
      results.push(loadingStatesResult);
      
      // Test 5: Error Handling
      console.log('❌ Testing authentication error handling...');
      const errorHandlingResult = await this.testErrorHandling();
      results.push(errorHandlingResult);
      
    } catch (error) {
      console.error('❌ Fatal error in EnhancedAuthentication:', error.message);
      await this.takeScreenshot('enhanced-auth-fatal-error');
      results.push({
        testName: 'Enhanced Authentication Fatal Error',
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

  async testAdminLoginFlow() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('login-page-start');
      
      // Step 1: Click "Need help logging in"
      console.log('  📍 Step 1: Looking for "Need help logging in" link...');
      const helpSelectors = [
        'text=Need help logging in',
        'a:has-text("Need help")',
        'button:has-text("Need help")',
        '[data-testid="help-login"]'
      ];
      
      let helpLinkFound = false;
      for (const selector of helpSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            helpLinkFound = true;
            console.log('  ✅ Found and clicked help link');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!helpLinkFound) {
        throw new Error('Could not find "Need help logging in" link');
      }
      
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('help-menu-opened');
      
      // Step 2: Click "Administrator login"
      console.log('  📍 Step 2: Looking for "Administrator login" link...');
      const adminSelectors = [
        'text=Administrator login',
        'text=Admin login',
        'a:has-text("Administrator")',
        'button:has-text("Administrator")',
        '[data-testid="admin-login"]'
      ];
      
      let adminLinkFound = false;
      for (const selector of adminSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            adminLinkFound = true;
            console.log('  ✅ Found and clicked admin login link');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!adminLinkFound) {
        throw new Error('Could not find "Administrator login" link');
      }
      
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('admin-form-revealed');
      
      // Step 3: Fill admin credentials
      console.log('  📍 Step 3: Filling admin credentials...');
      
      // Find email input (should be the last one or specifically for admin)
      const emailSelectors = [
        'input[type="email"]:last-of-type',
        'input[name="adminEmail"]',
        'input[placeholder*="admin"]',
        'input[type="email"]'
      ];
      
      let emailFilled = false;
      for (const selector of emailSelectors) {
        try {
          const emailInput = this.page.locator(selector).first();
          if (await emailInput.isVisible({ timeout: 1000 })) {
            await emailInput.fill(this.adminCredentials.email);
            emailFilled = true;
            console.log('  ✅ Email filled');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!emailFilled) {
        throw new Error('Could not find admin email input');
      }
      
      // Find password input
      const passwordSelectors = [
        'input[type="password"]:last-of-type',
        'input[name="adminPassword"]',
        'input[placeholder*="admin"]',
        'input[type="password"]'
      ];
      
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const passwordInput = this.page.locator(selector).first();
          if (await passwordInput.isVisible({ timeout: 1000 })) {
            await passwordInput.fill(this.adminCredentials.password);
            passwordFilled = true;
            console.log('  ✅ Password filled');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!passwordFilled) {
        throw new Error('Could not find admin password input');
      }
      
      await this.takeScreenshot('admin-credentials-filled');
      
      // Step 4: Submit form
      console.log('  📍 Step 4: Submitting admin login form...');
      const submitSelectors = [
        'button[type="submit"]:last-of-type',
        'button:has-text("Login"):last-of-type',
        'button:has-text("Sign in"):last-of-type',
        'button:has-text("Admin"):last-of-type'
      ];
      
      let formSubmitted = false;
      for (const selector of submitSelectors) {
        try {
          const submitButton = this.page.locator(selector).first();
          if (await submitButton.isVisible({ timeout: 1000 })) {
            await submitButton.click();
            formSubmitted = true;
            console.log('  ✅ Form submitted');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!formSubmitted) {
        throw new Error('Could not find admin submit button');
      }
      
      // Step 5: Wait for authentication and check result
      console.log('  📍 Step 5: Waiting for authentication result...');
      await this.page.waitForTimeout(3000);
      await this.page.waitForLoadState('networkidle');
      
      const currentUrl = this.page.url();
      console.log('  📍 Current URL:', currentUrl);
      
      // Check for admin dashboard indicators
      const adminIndicators = [
        'text=Admin Dashboard',
        'text=System Management',
        'text=User Management',
        'text=Crew Management',
        currentUrl.includes('/admin'),
        currentUrl.includes('/manager') // Sometimes admin redirects to manager
      ];
      
      let isAuthenticated = false;
      for (const indicator of adminIndicators) {
        try {
          if (typeof indicator === 'string') {
            const element = this.page.locator(indicator).first();
            if (await element.isVisible({ timeout: 2000 })) {
              isAuthenticated = true;
              console.log('  ✅ Found admin dashboard indicator:', indicator);
              break;
            }
          } else if (indicator === true) {
            isAuthenticated = true;
            console.log('  ✅ URL indicates admin access');
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      await this.takeScreenshot('admin-login-result');
      
      if (isAuthenticated) {
        console.log('✅ Admin login successful');
        return {
          testName: 'Admin Login Flow',
          success: true,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          data: { finalUrl: currentUrl },
          screenshots: ['login-page-start', 'help-menu-opened', 'admin-form-revealed', 'admin-credentials-filled', 'admin-login-result']
        };
      } else {
        throw new Error('Admin login failed - not redirected to admin area');
      }
      
    } catch (error) {
      await this.takeScreenshot('admin-login-flow-error');
      return {
        testName: 'Admin Login Flow',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['admin-login-flow-error']
      };
    }
  }

  async testMagicLinkWithToast() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Fill email for magic link
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill('e2etest@shipdocs.app');
      
      await this.takeScreenshot('magic-link-form-filled');
      
      // Submit magic link request
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Send")').first();
      await submitButton.click();
      
      // Wait for toast message or confirmation
      await this.page.waitForTimeout(2000);
      
      // Look for toast message or confirmation
      const toastSelectors = [
        '.toast',
        '.notification',
        '.alert',
        '.success',
        'text=sent',
        'text=email',
        'text=check',
        '[data-testid="magic-link-confirmation"]'
      ];
      
      let toastFound = false;
      let toastMessage = '';
      
      for (const selector of toastSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            toastMessage = await element.textContent();
            toastFound = true;
            console.log('  ✅ Found toast/confirmation:', toastMessage);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('magic-link-toast-result');
      
      return {
        testName: 'Magic Link with Toast',
        success: toastFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { toastMessage: toastMessage },
        error: toastFound ? null : 'No toast message or confirmation found',
        screenshots: ['magic-link-form-filled', 'magic-link-toast-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('magic-link-toast-error');
      return {
        testName: 'Magic Link with Toast',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['magic-link-toast-error']
      };
    }
  }

  async testMagicLinkCompletion() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔗 MAGIC LINK COMPLETION TEST');
      console.log('📧 Please check your email for e2etest@shipdocs.app');
      console.log('🔗 Copy the magic link URL from the email');
      console.log('📋 Paste it below when prompted...\n');
      
      // Prompt for manual magic link input
      console.log('⏳ Waiting for manual magic link input...');
      console.log('📋 Please paste the magic link URL here and press Enter:');

      // In a real implementation, you would get this from stdin
      // For now, we'll use a placeholder that can be replaced
      let magicLinkUrl = `${this.config.baseUrl}/login?token=REPLACE_WITH_ACTUAL_TOKEN`;

      // Check if we can get the magic link from environment or prompt
      if (process.env.MAGIC_LINK_URL) {
        magicLinkUrl = process.env.MAGIC_LINK_URL;
        console.log('🔗 Using magic link from environment variable');
      } else {
        console.log('🔗 Using placeholder magic link (replace with actual)');
        console.log('💡 Set MAGIC_LINK_URL environment variable for automated testing');
      }

      console.log('🔗 Navigating to magic link:', magicLinkUrl);

      await this.page.goto(magicLinkUrl);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('magic-link-navigation');
      
      // Check if user is logged in
      const currentUrl = this.page.url();
      const authenticationIndicators = [
        'text=Dashboard',
        'text=Welcome',
        'text=Training',
        'text=Profile',
        currentUrl.includes('/crew'),
        currentUrl.includes('/dashboard')
      ];
      
      let isLoggedIn = false;
      for (const indicator of authenticationIndicators) {
        try {
          if (typeof indicator === 'string') {
            const element = this.page.locator(indicator).first();
            if (await element.isVisible({ timeout: 2000 })) {
              isLoggedIn = true;
              console.log('  ✅ Found authentication indicator:', indicator);
              break;
            }
          } else if (indicator === true) {
            isLoggedIn = true;
            console.log('  ✅ URL indicates authenticated state');
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      await this.takeScreenshot('magic-link-completion-result');
      
      return {
        testName: 'Magic Link Completion',
        success: isLoggedIn,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        data: { 
          finalUrl: currentUrl,
          simulatedLink: simulatedMagicLink,
          instructions: 'Replace with actual magic link from email'
        },
        error: isLoggedIn ? null : 'User not logged in after magic link navigation',
        screenshots: ['magic-link-navigation', 'magic-link-completion-result']
      };
      
    } catch (error) {
      await this.takeScreenshot('magic-link-completion-error');
      return {
        testName: 'Magic Link Completion',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['magic-link-completion-error']
      };
    }
  }

  async testLoadingStates() {
    const startTime = Date.now();
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Fill email
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill('test@example.com');
      
      // Look for loading states when submitting
      const submitButton = this.page.locator('button[type="submit"]').first();
      
      // Take screenshot before submit
      await this.takeScreenshot('before-loading-state');
      
      // Click submit and immediately look for loading indicators
      await submitButton.click();
      
      // Look for loading indicators
      const loadingSelectors = [
        '.loading',
        '.spinner',
        'text=Loading',
        'text=Sending',
        'button[disabled]',
        '[data-testid="loading"]'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 500 })) {
            loadingFound = true;
            console.log('  ✅ Found loading indicator:', selector);
            await this.takeScreenshot('loading-state-found');
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('after-loading-state');
      
      return {
        testName: 'Loading States',
        success: loadingFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: loadingFound ? null : 'No loading indicators found',
        screenshots: ['before-loading-state', 'loading-state-found', 'after-loading-state']
      };
      
    } catch (error) {
      await this.takeScreenshot('loading-states-error');
      return {
        testName: 'Loading States',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['loading-states-error']
      };
    }
  }

  async testErrorHandling() {
    const startTime = Date.now();
    
    try {
      // Test invalid email format
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill('invalid-email');
      
      const submitButton = this.page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('invalid-email-error');
      
      // Look for error messages
      const errorSelectors = [
        '.error',
        '.invalid',
        'text=invalid',
        'text=error',
        '[data-testid="error"]'
      ];
      
      let errorFound = false;
      for (const selector of errorSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            errorFound = true;
            console.log('  ✅ Found error message:', selector);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      return {
        testName: 'Error Handling',
        success: errorFound,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: errorFound ? null : 'No error messages found for invalid input',
        screenshots: ['invalid-email-error']
      };
      
    } catch (error) {
      await this.takeScreenshot('error-handling-error');
      return {
        testName: 'Error Handling',
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: ['error-handling-error']
      };
    }
  }
}

module.exports = EnhancedAuthenticationModule;
