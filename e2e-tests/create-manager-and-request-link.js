#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ManagerCreationAndLinkRequest {
  constructor() {
    this.config = require('./config.json');
    this.browser = null;
    this.page = null;
    this.adminCredentials = {
      email: 'adminmartexx@shipdocs.app',
      password: 'Yumminova211@#'
    };
    this.managerData = {
      email: 'e2etest-manager-new@shipdocs.app',
      firstName: 'E2E',
      lastName: 'TestManagerNew',
      role: 'manager',
      password: 'TestManager123!@#'
    };
  }

  async takeScreenshot(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const filename = `${name}-${timestamp}.png`;
      const screenshotPath = path.join(__dirname, 'reports/screenshots', filename);
      
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

  async initialize() {
    console.log('🚀 Manager Creation and Magic Link Request Tool');
    console.log('===============================================');
    console.log(`📍 Target URL: ${this.config.baseUrl}`);
    console.log(`👤 Manager Email: ${this.managerData.email}`);
    console.log('');

    // Launch browser
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 100 
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    this.page.setDefaultTimeout(30000);
    
    console.log('🌐 Browser launched and configured');
  }

  async adminLogin() {
    console.log('\n🔐 === ADMIN LOGIN ===');
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('admin-login-start');
      
      // Click "Need help logging in"
      console.log('📍 Step 1: Clicking "Need help logging in"...');
      const helpLink = await this.page.locator('text=Need help logging in').first();
      if (await helpLink.isVisible()) {
        await helpLink.click();
        await this.page.waitForTimeout(1000);
        console.log('  ✅ Help link clicked');
      }
      
      // Click "Administrator login"
      console.log('📍 Step 2: Clicking "Administrator login"...');
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
            console.log(`  ✅ Admin login link clicked: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!adminLinkFound) {
        throw new Error('Could not find "Administrator login" link');
      }

      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('admin-form-visible');

      // Fill admin credentials
      console.log('📍 Step 3: Filling admin credentials...');

      // Find email input (try multiple selectors)
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
          if (await emailInput.isVisible({ timeout: 2000 })) {
            await emailInput.fill(this.adminCredentials.email);
            emailFilled = true;
            console.log(`  ✅ Email filled using: ${selector}`);
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
          if (await passwordInput.isVisible({ timeout: 2000 })) {
            await passwordInput.fill(this.adminCredentials.password);
            passwordFilled = true;
            console.log(`  ✅ Password filled using: ${selector}`);
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
      
      // Submit form
      console.log('📍 Step 4: Submitting admin login...');
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
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            formSubmitted = true;
            console.log(`  ✅ Form submitted using: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!formSubmitted) {
        throw new Error('Could not find admin submit button');
      }
      
      await this.page.waitForTimeout(3000);
      await this.page.waitForLoadState('networkidle');
      
      // Check if we're on admin dashboard
      const currentUrl = this.page.url();
      const isAdminDashboard = currentUrl.includes('/admin') || 
                              await this.page.locator('text=Admin Dashboard').isVisible();
      
      await this.takeScreenshot('admin-login-result');
      
      if (isAdminDashboard) {
        console.log('✅ Admin login successful');
        return true;
      } else {
        throw new Error('Admin login failed');
      }
      
    } catch (error) {
      console.error('❌ Admin login failed:', error.message);
      await this.takeScreenshot('admin-login-error');
      return false;
    }
  }

  async createManager() {
    console.log('\n👤 === CREATE MANAGER ===');
    
    try {
      // Look for manager management options
      console.log('📍 Step 1: Looking for manager management...');
      const managerManagementSelectors = [
        'text=Manager Management',
        'text=Managers',
        'text=User Management',
        'text=Users',
        'a[href*="manager"]',
        'a[href*="user"]'
      ];
      
      let managerManagementFound = false;
      for (const selector of managerManagementSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            managerManagementFound = true;
            console.log(`  ✅ Found and clicked: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!managerManagementFound) {
        await this.takeScreenshot('admin-dashboard-navigation');
        throw new Error('Could not find manager management section');
      }
      
      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('manager-management-page');
      
      // Look for "Add Manager" or "Create Manager" button
      console.log('📍 Step 2: Looking for add manager button...');
      const addManagerSelectors = [
        'text=Add Manager',
        'text=Create Manager',
        'text=New Manager',
        'text=Add User',
        'text=Create User',
        'button:has-text("Add")',
        'button:has-text("Create")',
        'button:has-text("New")',
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
            console.log(`  ✅ Found and clicked: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!addManagerFound) {
        await this.takeScreenshot('add-manager-not-found');
        throw new Error('Could not find add manager button');
      }
      
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('add-manager-form');
      
      // Fill manager details
      console.log('📍 Step 3: Filling manager details...');
      console.log(`  📧 Email: ${this.managerData.email}`);
      console.log(`  👤 Name: ${this.managerData.firstName} ${this.managerData.lastName}`);
      console.log(`  🔒 Password: ${this.managerData.password}`);
      
      // Fill form fields
      const fieldMappings = [
        { data: this.managerData.email, selectors: ['input[name="email"]', 'input[type="email"]', '#email'], label: 'Email' },
        { data: this.managerData.firstName, selectors: ['input[name="firstName"]', 'input[name="first_name"]', '#firstName'], label: 'First Name' },
        { data: this.managerData.lastName, selectors: ['input[name="lastName"]', 'input[name="last_name"]', '#lastName'], label: 'Last Name' },
        { data: this.managerData.password, selectors: ['input[name="password"]', 'input[type="password"]', '#password'], label: 'Password' }
      ];
      
      for (const field of fieldMappings) {
        let fieldFilled = false;
        for (const selector of field.selectors) {
          try {
            const input = this.page.locator(selector).first();
            if (await input.isVisible({ timeout: 1000 })) {
              await input.fill(field.data);
              fieldFilled = true;
              console.log(`  ✅ ${field.label} filled`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        if (!fieldFilled) {
          console.log(`  ⚠️ Could not fill ${field.label}`);
        }
      }
      
      // Select role if dropdown exists
      try {
        const roleSelect = this.page.locator('select[name="role"], #role').first();
        if (await roleSelect.isVisible({ timeout: 1000 })) {
          await roleSelect.selectOption('manager');
          console.log('  ✅ Role set to manager');
        }
      } catch (e) {
        console.log('  ⚠️ Role selection not available');
      }
      
      await this.takeScreenshot('manager-form-filled');
      
      // Submit form
      console.log('📍 Step 4: Submitting manager creation form...');
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Create Manager")',
        'button:has-text("Create")',
        'button:has-text("Add Manager")',
        'button:has-text("Add")',
        'button:has-text("Save")',
        'button:has-text("Confirm")',
        '[data-testid="create-manager-submit"]'
      ];
      
      let formSubmitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = this.page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            formSubmitted = true;
            console.log(`  ✅ Form submitted using: ${selector}`);
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
      await this.takeScreenshot('manager-created');
      
      console.log('✅ Manager creation completed');
      return true;
      
    } catch (error) {
      console.error('❌ Manager creation failed:', error.message);
      await this.takeScreenshot('manager-creation-error');
      return false;
    }
  }

  async logout() {
    console.log('\n🚪 === LOGOUT ===');
    
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
      for (const selector of logoutSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            logoutFound = true;
            console.log(`  ✅ Logout clicked: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (!logoutFound) {
        // Try navigating to login page directly
        console.log('  ⚠️ No logout button found, navigating to login page...');
        await this.page.goto(this.config.baseUrl);
      }
      
      await this.page.waitForTimeout(2000);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('logout-result');
      
      console.log('✅ Logout completed');
      return true;
      
    } catch (error) {
      console.error('❌ Logout failed:', error.message);
      await this.takeScreenshot('logout-error');
      return false;
    }
  }

  async requestMagicLink() {
    console.log('\n📧 === REQUEST MAGIC LINK ===');
    
    try {
      // Navigate to login page
      await this.page.goto(this.config.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      console.log(`📍 Requesting magic link for: ${this.managerData.email}`);
      
      // Fill email for magic link
      const emailInput = this.page.locator('#primary-email, input[type="email"]').first();
      await emailInput.fill(this.managerData.email);
      
      await this.takeScreenshot('magic-link-request-form');
      
      // Submit magic link request
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Send")').first();
      await submitButton.click();
      
      await this.page.waitForTimeout(3000);
      
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
          if (await element.isVisible({ timeout: 2000 })) {
            confirmationMessage = await element.textContent();
            confirmationFound = true;
            console.log(`  ✅ Found confirmation: ${confirmationMessage}`);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      await this.takeScreenshot('magic-link-requested');
      
      console.log('✅ Magic link request completed');
      
      if (confirmationFound) {
        console.log(`  📧 Confirmation: ${confirmationMessage}`);
      } else {
        console.log('  ⚠️ No visual confirmation found (but request may have succeeded)');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Magic link request failed:', error.message);
      await this.takeScreenshot('magic-link-request-error');
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser closed');
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Step 1: Admin Login
      const adminLoginSuccess = await this.adminLogin();
      if (!adminLoginSuccess) {
        throw new Error('Admin login failed');
      }
      
      // Step 2: Create Manager
      const managerCreationSuccess = await this.createManager();
      if (!managerCreationSuccess) {
        throw new Error('Manager creation failed');
      }
      
      // Step 3: Logout
      const logoutSuccess = await this.logout();
      if (!logoutSuccess) {
        console.log('⚠️ Logout may have failed, but continuing...');
      }
      
      // Step 4: Request Magic Link
      const magicLinkSuccess = await this.requestMagicLink();
      if (!magicLinkSuccess) {
        throw new Error('Magic link request failed');
      }
      
      console.log('\n🎉 === PROCESS COMPLETED SUCCESSFULLY ===');
      console.log('========================================');
      console.log(`📧 Manager Email: ${this.managerData.email}`);
      console.log('📋 Next Steps:');
      console.log('1. Check email for magic link');
      console.log('2. Copy the magic link URL');
      console.log('3. Paste it when prompted for testing');
      console.log('');
      console.log('🔗 Expected magic link format:');
      console.log(`   ${this.config.baseUrl}/login?token=SOME_TOKEN_HERE`);
      console.log('');
      
      return true;
      
    } catch (error) {
      console.error('❌ Process failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tool = new ManagerCreationAndLinkRequest();
  tool.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ManagerCreationAndLinkRequest;
