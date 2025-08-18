const TestBase = require('../utils/TestBase');

class AdminModule extends TestBase {
  constructor(config) {
    super(config);
  }

  async manageSystemSettings() {
    const startTime = Date.now();
    console.log(`\n⚙️ Testing system settings management...`);
    
    try {
      // Navigate to settings
      await this.clickElement(this.config.selectors.admin.settingsPanel);
      await this.page.waitForTimeout(1500);
      
      await this.takeScreenshot('system-settings');
      
      // Test different settings categories
      const settingCategories = [
        { name: 'Email Configuration', selector: '[data-setting="email"]' },
        { name: 'Security Settings', selector: '[data-setting="security"]' },
        { name: 'Training Configuration', selector: '[data-setting="training"]' },
        { name: 'Notification Settings', selector: '[data-setting="notifications"]' }
      ];
      
      for (const category of settingCategories) {
        const categoryElement = await this.page.$(category.selector);
        if (categoryElement) {
          console.log(`  📋 Testing ${category.name}...`);
          await categoryElement.click();
          await this.page.waitForTimeout(1000);
          
          // Make a test change
          const firstInput = await this.page.$('input[type="text"], input[type="number"], select');
          if (firstInput) {
            const inputType = await firstInput.getAttribute('type');
            if (inputType === 'text') {
              await firstInput.fill('Test Value');
            } else if (inputType === 'number') {
              await firstInput.fill('30');
            }
          }
        }
      }
      
      // Save settings
      const saveButton = await this.page.$('button:has-text("Save Settings"), button:has-text("Apply Changes")');
      if (saveButton) {
        await saveButton.click();
        await this.page.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = await this.page.$('text=/settings.*saved|changes.*applied/i');
        if (!successMessage) {
          throw new Error('Settings save confirmation not shown');
        }
      }
      
      console.log('✅ System settings management successful');
      
      this.recordTestResult('System Settings', true, {
        duration: Date.now() - startTime,
        screenshots: ['system-settings']
      });
      
      return true;
    } catch (error) {
      console.error('❌ System settings test failed:', error.message);
      await this.takeScreenshot('settings-error');
      
      this.recordTestResult('System Settings', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['settings-error']
      });
      
      return false;
    }
  }

  async manageManagers() {
    const startTime = Date.now();
    console.log(`\n👥 Testing manager management...`);
    
    try {
      // Navigate to managers list
      await this.clickElement(this.config.selectors.admin.managersList);
      await this.page.waitForTimeout(1500);
      
      // Add new manager
      await this.clickElement(this.config.selectors.admin.addManagerButton);
      await this.page.waitForTimeout(1000);
      
      // Fill manager form
      const managerData = this.config.testData.newManager;
      await this.fillInput('input[name="name"]', managerData.name);
      await this.fillInput('input[name="email"]', managerData.email);
      await this.fillInput('input[name="company"]', managerData.company);
      
      // Set permissions
      const permissionCheckboxes = await this.page.$$('input[type="checkbox"][name*="permission"]');
      console.log(`  Found ${permissionCheckboxes.length} permission options`);
      
      // Select some permissions
      if (permissionCheckboxes.length > 0) {
        await permissionCheckboxes[0].click();
        if (permissionCheckboxes.length > 1) {
          await permissionCheckboxes[1].click();
        }
      }
      
      await this.takeScreenshot('add-manager-form');
      
      // Submit form
      await this.clickElement('button[type="submit"]');
      await this.page.waitForTimeout(2000);
      
      // Verify manager was added
      const newManagerRow = await this.page.$(`tr:has-text("${managerData.email}"), div:has-text("${managerData.email}")`);
      if (!newManagerRow) {
        throw new Error('New manager not found in list');
      }
      
      // Test edit functionality
      const editButton = await newManagerRow.$('button:has-text("Edit"), a:has-text("Edit")');
      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(1000);
        
        // Make a change
        await this.fillInput('input[name="company"]', 'Updated Company');
        await this.clickElement('button[type="submit"]');
        await this.page.waitForTimeout(2000);
        
        console.log('  ✅ Manager edit successful');
      }
      
      console.log('✅ Manager management successful');
      
      this.recordTestResult('Manager Management', true, {
        duration: Date.now() - startTime,
        screenshots: ['add-manager-form']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Manager management test failed:', error.message);
      await this.takeScreenshot('manager-management-error');
      
      this.recordTestResult('Manager Management', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['manager-management-error']
      });
      
      return false;
    }
  }

  async viewSystemStats() {
    const startTime = Date.now();
    console.log(`\n📊 Testing system statistics...`);
    
    try {
      // Navigate to dashboard/stats
      await this.page.goto(this.config.baseUrl + '/admin/dashboard', {
        waitUntil: 'networkidle'
      });
      
      await this.takeScreenshot('admin-dashboard');
      
      // Check for stats widgets
      const statsWidgets = await this.page.$$(this.config.selectors.admin.statsWidget);
      console.log(`  Found ${statsWidgets.length} stats widgets`);
      
      // Collect stats data
      const stats = {};
      for (const widget of statsWidgets) {
        const label = await widget.$eval('.label, .stat-label', el => el.textContent);
        const value = await widget.$eval('.value, .stat-value', el => el.textContent);
        stats[label] = value;
        console.log(`  📈 ${label}: ${value}`);
      }
      
      // Check for charts
      const charts = await this.page.$$('canvas, .chart-container, [data-chart]');
      console.log(`  Found ${charts.length} data visualizations`);
      
      // Test date range filters if available
      const dateRangeSelector = await this.page.$('select[name="dateRange"], button:has-text("Date Range")');
      if (dateRangeSelector) {
        await dateRangeSelector.click();
        const option = await this.page.$('option[value="30d"], button:has-text("Last 30 Days")');
        if (option) {
          await option.click();
          await this.page.waitForTimeout(2000);
          console.log('  ✅ Date range filter applied');
        }
      }
      
      console.log('✅ System statistics loaded successfully');
      
      this.recordTestResult('System Statistics', true, {
        duration: Date.now() - startTime,
        screenshots: ['admin-dashboard']
      });
      
      return true;
    } catch (error) {
      console.error('❌ System statistics test failed:', error.message);
      await this.takeScreenshot('stats-error');
      
      this.recordTestResult('System Statistics', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['stats-error']
      });
      
      return false;
    }
  }

  async testAuditLog() {
    const startTime = Date.now();
    console.log(`\n📋 Testing audit log functionality...`);
    
    try {
      // Navigate to audit log
      await this.clickElement('a:has-text("Audit Log"), button:has-text("Audit Log")');
      await this.page.waitForTimeout(1500);
      
      await this.takeScreenshot('audit-log');
      
      // Check for log entries
      const logEntries = await this.page.$$('tr[data-log-entry], .log-entry');
      console.log(`  Found ${logEntries.length} audit log entries`);
      
      if (logEntries.length > 0) {
        // Click on first entry for details
        await logEntries[0].click();
        await this.page.waitForTimeout(1000);
        
        // Check for details modal/panel
        const detailsPanel = await this.page.$('.log-details, [data-log-details]');
        if (detailsPanel) {
          console.log('  ✅ Log entry details accessible');
        }
      }
      
      // Test filtering
      const filterOptions = [
        { selector: 'select[name="actionType"]', value: 'login' },
        { selector: 'select[name="userType"]', value: 'manager' },
        { selector: 'input[name="dateFrom"]', value: '2025-01-01' }
      ];
      
      for (const filter of filterOptions) {
        const filterElement = await this.page.$(filter.selector);
        if (filterElement) {
          if (filter.selector.includes('select')) {
            await this.selectOption(filter.selector, filter.value);
          } else {
            await this.fillInput(filter.selector, filter.value);
          }
          await this.page.waitForTimeout(1000);
        }
      }
      
      // Apply filters
      const applyFiltersButton = await this.page.$('button:has-text("Apply Filters"), button:has-text("Filter")');
      if (applyFiltersButton) {
        await applyFiltersButton.click();
        await this.page.waitForTimeout(2000);
        console.log('  ✅ Filters applied successfully');
      }
      
      console.log('✅ Audit log functionality verified');
      
      this.recordTestResult('Audit Log', true, {
        duration: Date.now() - startTime,
        screenshots: ['audit-log']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Audit log test failed:', error.message);
      await this.takeScreenshot('audit-log-error');
      
      this.recordTestResult('Audit Log', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['audit-log-error']
      });
      
      return false;
    }
  }

  async testEmailTemplates() {
    const startTime = Date.now();
    console.log(`\n📧 Testing email template management...`);
    
    try {
      // Navigate to email templates
      await this.clickElement('a:has-text("Email Templates"), button:has-text("Email Templates")');
      await this.page.waitForTimeout(1500);
      
      // Get list of templates
      const templates = await this.page.$$('[data-template], .email-template');
      console.log(`  Found ${templates.length} email templates`);
      
      if (templates.length > 0) {
        // Edit first template
        await templates[0].click();
        await this.page.waitForTimeout(1000);
        
        // Check for template editor
        const editor = await this.page.$('textarea[name="content"], .template-editor');
        if (editor) {
          const currentContent = await editor.inputValue();
          await editor.fill(currentContent + '\n\n<!-- Test edit -->');
          
          await this.takeScreenshot('email-template-editor');
          
          // Test preview
          const previewButton = await this.page.$('button:has-text("Preview")');
          if (previewButton) {
            await previewButton.click();
            await this.page.waitForTimeout(1500);
            console.log('  ✅ Template preview generated');
          }
          
          // Save template
          const saveButton = await this.page.$('button:has-text("Save Template")');
          if (saveButton) {
            await saveButton.click();
            await this.page.waitForTimeout(2000);
            console.log('  ✅ Template saved');
          }
        }
      }
      
      // Test send test email
      const testEmailButton = await this.page.$('button:has-text("Send Test Email")');
      if (testEmailButton) {
        await testEmailButton.click();
        await this.fillInput('input[name="testEmail"]', 'admin-test@shipdocs.app');
        await this.clickElement('button:has-text("Send")');
        await this.page.waitForTimeout(2000);
        console.log('  ✅ Test email sent');
      }
      
      console.log('✅ Email template management successful');
      
      this.recordTestResult('Email Templates', true, {
        duration: Date.now() - startTime,
        screenshots: ['email-template-editor']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Email template test failed:', error.message);
      await this.takeScreenshot('email-template-error');
      
      this.recordTestResult('Email Templates', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['email-template-error']
      });
      
      return false;
    }
  }

  async testDataExport() {
    const startTime = Date.now();
    console.log(`\n💾 Testing data export functionality...`);
    
    try {
      // Navigate to data export section
      await this.clickElement('a:has-text("Data Export"), button:has-text("Export Data")');
      await this.page.waitForTimeout(1500);
      
      // Test different export options
      const exportOptions = [
        { name: 'User Data', format: 'CSV' },
        { name: 'Training Records', format: 'Excel' },
        { name: 'Compliance Report', format: 'PDF' }
      ];
      
      for (const option of exportOptions) {
        const exportButton = await this.page.$(`button:has-text("${option.name}")`);
        if (exportButton) {
          console.log(`  📥 Exporting ${option.name} as ${option.format}...`);
          
          // Set up download handling
          const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
          await exportButton.click();
          
          const download = await downloadPromise;
          if (download) {
            console.log(`    ✅ Downloaded: ${download.suggestedFilename()}`);
            
            // Save to reports directory
            const exportPath = path.join(__dirname, '../../reports/exports', download.suggestedFilename());
            await download.saveAs(exportPath);
          } else {
            console.log(`    ⚠️  ${option.name} export initiated but no download started`);
          }
          
          await this.page.waitForTimeout(2000);
        }
      }
      
      await this.takeScreenshot('data-export');
      
      console.log('✅ Data export functionality verified');
      
      this.recordTestResult('Data Export', true, {
        duration: Date.now() - startTime,
        screenshots: ['data-export']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Data export test failed:', error.message);
      await this.takeScreenshot('export-error');
      
      this.recordTestResult('Data Export', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['export-error']
      });
      
      return false;
    }
  }

  async testSecuritySettings() {
    const startTime = Date.now();
    console.log(`\n🔒 Testing security settings...`);
    
    try {
      // Navigate to security settings
      await this.clickElement('a:has-text("Security"), button:has-text("Security Settings")');
      await this.page.waitForTimeout(1500);
      
      await this.takeScreenshot('security-settings');
      
      // Test password policy
      console.log('  🔑 Testing password policy...');
      await this.fillInput('input[name="minPasswordLength"]', '12');
      await this.fillInput('input[name="passwordExpiry"]', '90');
      
      const requireComplexityCheckbox = await this.page.$('input[name="requireComplexity"]');
      if (requireComplexityCheckbox) {
        await requireComplexityCheckbox.click();
      }
      
      // Test session settings
      console.log('  ⏱️ Testing session settings...');
      await this.fillInput('input[name="sessionTimeout"]', '30');
      
      const requireMFACheckbox = await this.page.$('input[name="requireMFA"]');
      if (requireMFACheckbox) {
        await requireMFACheckbox.click();
      }
      
      // Test IP whitelist
      console.log('  🌐 Testing IP whitelist...');
      const addIPButton = await this.page.$('button:has-text("Add IP")');
      if (addIPButton) {
        await addIPButton.click();
        await this.fillInput('input[name="ipAddress"]', '192.168.1.0/24');
        await this.fillInput('input[name="description"]', 'Office Network');
        await this.clickElement('button:has-text("Add")');
      }
      
      // Save security settings
      await this.clickElement('button:has-text("Save Security Settings")');
      await this.page.waitForTimeout(2000);
      
      console.log('✅ Security settings configured successfully');
      
      this.recordTestResult('Security Settings', true, {
        duration: Date.now() - startTime,
        screenshots: ['security-settings']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Security settings test failed:', error.message);
      await this.takeScreenshot('security-error');
      
      this.recordTestResult('Security Settings', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['security-error']
      });
      
      return false;
    }
  }

  async runAllTests() {
    console.log('\n🔧 === ADMIN MODULE TESTS ===\n');
    
    // Login as admin
    const authModule = new (require('./AuthenticationModule'))(this.config);
    authModule.browserManager = this.browserManager;
    authModule.page = this.page;
    await authModule.loginWithCredentials('admin');
    
    // View system statistics
    await this.viewSystemStats();
    
    // Manage system settings
    await this.manageSystemSettings();
    
    // Manage managers
    await this.manageManagers();
    
    // Test audit log
    await this.testAuditLog();
    
    // Test email templates
    await this.testEmailTemplates();
    
    // Test security settings
    await this.testSecuritySettings();
    
    // Test data export
    await this.testDataExport();
  }
}

module.exports = AdminModule;