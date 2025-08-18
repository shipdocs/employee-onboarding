/**
 * Admin Complete Flow E2E Test
 * Tests comprehensive admin functionality using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { testUsers, testCompanies, testWorkflows, generateCompanyName, generateRandomEmail } from './fixtures/testData';
import { AuthHelper } from './helpers/authHelper';

test.describe('Admin Complete Flow', () => {
  let adminDashboard: AdminDashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    adminDashboard = new AdminDashboardPage(page);
    loginPage = new LoginPage(page);
    
    // Login as admin
    await AuthHelper.loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Logout
    await adminDashboard.logout();
  });

  test('should manage complete company lifecycle', async ({ page }) => {
    // Test data
    const companyName = generateCompanyName();
    const company = {
      ...testCompanies.default,
      name: companyName
    };
    const managerEmail = generateRandomEmail();

    // Step 1: Navigate to companies section
    await test.step('Navigate to companies management', async () => {
      await adminDashboard.navigateToSection('companies');
      await expect(page).toHaveURL(/\/admin\/companies/);
    });

    // Step 2: Add new company
    await test.step('Create new company', async () => {
      const initialStats = await adminDashboard.getDashboardStats();
      
      await adminDashboard.addCompany(company);
      
      // Verify company was added
      await adminDashboard.search(companyName);
      const tableData = await adminDashboard.getTableData('companies');
      expect(tableData.some(row => Object.values(row).some(val => val?.includes(companyName)))).toBeTruthy();
    });

    // Step 3: Add manager to company
    await test.step('Add manager to company', async () => {
      await adminDashboard.navigateToSection('managers');
      
      const manager = {
        email: managerEmail,
        name: 'Test Manager',
        password: 'SecurePass123!',
        phone: '+31612345678',
        department: 'Operations'
      };
      
      await adminDashboard.addManager(manager, companyName);
      
      // Verify manager was added
      await adminDashboard.search(managerEmail);
      const tableData = await adminDashboard.getTableData('managers');
      expect(tableData.some(row => Object.values(row).some(val => val?.includes(managerEmail)))).toBeTruthy();
    });

    // Step 4: Create workflow for company
    await test.step('Create workflow for company', async () => {
      await adminDashboard.navigateToSection('workflows');
      
      const workflow = {
        ...testWorkflows.basic,
        name: `${companyName} Onboarding`
      };
      
      await adminDashboard.createWorkflow(workflow);
      
      // Verify workflow was created
      const workflowCard = page.locator(`.workflow-card:has-text("${workflow.name}")`);
      await expect(workflowCard).toBeVisible();
    });

    // Step 5: Edit company details
    await test.step('Edit company information', async () => {
      await adminDashboard.navigateToSection('companies');
      
      const updates = {
        phone: '+31698765432',
        address: 'Updated Address 123'
      };
      
      await adminDashboard.editCompany(companyName, updates);
      
      // Verify updates
      await adminDashboard.search(companyName);
      await page.waitForTimeout(1000); // Wait for update
      const tableData = await adminDashboard.getTableData('companies');
      expect(tableData.some(row => Object.values(row).some(val => val?.includes(updates.phone)))).toBeTruthy();
    });

    // Step 6: Check activity logs
    await test.step('Verify activity logs', async () => {
      await adminDashboard.gotoDashboard();
      
      const activities = await adminDashboard.getRecentActivity();
      expect(activities.some(activity => activity.includes('company'))).toBeTruthy();
      expect(activities.some(activity => activity.includes('manager'))).toBeTruthy();
    });

    // Step 7: Export data
    await test.step('Export company data', async () => {
      await adminDashboard.navigateToSection('companies');
      
      const exportPath = await adminDashboard.exportData('csv');
      expect(exportPath).toBeTruthy();
    });

    // Step 8: Delete company (cleanup)
    await test.step('Delete company', async () => {
      await adminDashboard.deleteCompany(companyName);
      
      // Verify deletion
      await adminDashboard.search(companyName);
      const tableData = await adminDashboard.getTableData('companies');
      expect(tableData.some(row => Object.values(row).some(val => val?.includes(companyName)))).toBeFalsy();
    });
  });

  test('should handle permissions and access control', async ({ page }) => {
    // Check admin has all permissions
    const canAddCompany = await adminDashboard.hasPermission('Add Company');
    expect(canAddCompany).toBeTruthy();
    
    const canAddManager = await adminDashboard.hasPermission('Add Manager');
    expect(canAddManager).toBeTruthy();
    
    const canCreateWorkflow = await adminDashboard.hasPermission('Create Workflow');
    expect(canCreateWorkflow).toBeTruthy();
  });

  test('should filter and search companies effectively', async ({ page }) => {
    await adminDashboard.navigateToSection('companies');
    
    // Apply filters
    await adminDashboard.applyFilters({
      status: 'active',
      dateRange: 'this_month'
    });
    
    // Verify filters are applied
    await expect(page.locator('.active-filters')).toBeVisible();
    
    // Search for specific company
    await adminDashboard.search('Test');
    
    // Verify search results
    const results = await adminDashboard.getTableData('companies');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  test('should display dashboard statistics correctly', async ({ page }) => {
    const stats = await adminDashboard.getDashboardStats();
    
    // Verify stats are numbers
    expect(typeof stats.totalCompanies).toBe('number');
    expect(typeof stats.activeUsers).toBe('number');
    expect(typeof stats.completedOnboardings).toBe('number');
    expect(typeof stats.pendingOnboardings).toBe('number');
    
    // Stats should be non-negative
    expect(stats.totalCompanies).toBeGreaterThanOrEqual(0);
    expect(stats.activeUsers).toBeGreaterThanOrEqual(0);
  });

  test('should handle modal interactions properly', async ({ page }) => {
    await adminDashboard.navigateToSection('companies');
    
    // Open add company modal
    await page.click(adminDashboard.addCompanyButton);
    expect(await adminDashboard.isModalOpen()).toBeTruthy();
    
    // Close modal
    await adminDashboard.closeModal();
    expect(await adminDashboard.isModalOpen()).toBeFalsy();
    
    // Open again and cancel
    await page.click(adminDashboard.addCompanyButton);
    await page.click(adminDashboard.cancelButton);
    expect(await adminDashboard.isModalOpen()).toBeFalsy();
  });

  test('should validate form inputs when adding company', async ({ page }) => {
    await adminDashboard.navigateToSection('companies');
    await page.click(adminDashboard.addCompanyButton);
    
    // Try to save without required fields
    await page.click(adminDashboard.saveCompanyButton);
    
    // Should show validation errors
    const nameError = await page.locator('input[name="companyName"] ~ .error-message').isVisible();
    expect(nameError).toBeTruthy();
    
    const emailError = await page.locator('input[name="companyEmail"] ~ .error-message').isVisible();
    expect(emailError).toBeTruthy();
  });

  test('should handle concurrent admin sessions', async ({ browser }) => {
    // Create two admin contexts
    const context1 = await AuthHelper.createAuthenticatedContext(browser, 'admin');
    const context2 = await AuthHelper.createAuthenticatedContext(browser, 'admin');
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const admin1 = new AdminDashboardPage(page1);
    const admin2 = new AdminDashboardPage(page2);
    
    // Both admins navigate to dashboard
    await admin1.gotoDashboard();
    await admin2.gotoDashboard();
    
    // Admin 1 adds a company
    const company1 = generateCompanyName();
    await admin1.navigateToSection('companies');
    await admin1.addCompany({
      ...testCompanies.default,
      name: company1
    });
    
    // Admin 2 should see the new company after refresh
    await admin2.navigateToSection('companies');
    await page2.reload();
    await admin2.search(company1);
    
    const tableData = await admin2.getTableData('companies');
    expect(tableData.some(row => Object.values(row).some(val => val?.includes(company1)))).toBeTruthy();
    
    await context1.close();
    await context2.close();
  });

  test('should handle reports and analytics', async ({ page }) => {
    await adminDashboard.navigateToSection('reports');
    
    // Check reports are available
    const reportTypes = ['Company Overview', 'User Activity', 'Onboarding Progress', 'System Performance'];
    
    for (const reportType of reportTypes) {
      const reportCard = page.locator(`.report-card:has-text("${reportType}")`);
      await expect(reportCard).toBeVisible();
    }
    
    // Generate a report
    await page.click('.report-card:has-text("Company Overview") button:has-text("Generate")');
    
    // Wait for report generation
    await page.waitForSelector('.report-preview', { state: 'visible', timeout: 30000 });
    
    // Export report
    const exportButton = page.locator('button:has-text("Export PDF")');
    await expect(exportButton).toBeVisible();
  });

  test('should manage system settings', async ({ page }) => {
    await adminDashboard.navigateToSection('settings');
    
    // Check settings sections
    const settingsSections = ['General', 'Email', 'Security', 'Integrations'];
    
    for (const section of settingsSections) {
      const sectionTab = page.locator(`button:has-text("${section}")`);
      await expect(sectionTab).toBeVisible();
    }
    
    // Modify a setting
    await page.click('button:has-text("Email")');
    
    const emailFromInput = page.locator('input[name="emailFrom"]');
    await expect(emailFromInput).toBeVisible();
    
    // Update email setting
    await emailFromInput.clear();
    await emailFromInput.fill('noreply@testcompany.com');
    
    await page.click('button:has-text("Save Settings")');
    
    // Verify save
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/admin/companies', route => route.abort());
    
    await adminDashboard.navigateToSection('companies');
    
    // Should show error message
    const errorMessage = await page.locator('.error-message, [role="alert"]').textContent();
    expect(errorMessage).toContain('error');
    
    // Should offer retry
    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });

  test('should maintain session across navigation', async ({ page }) => {
    // Navigate through different sections
    const sections: Array<'companies' | 'managers' | 'workflows' | 'reports' | 'settings'> = 
      ['companies', 'managers', 'workflows', 'reports', 'settings'];
    
    for (const section of sections) {
      await adminDashboard.navigateToSection(section);
      
      // Verify session is still valid
      const isValid = await adminDashboard.isSessionValid();
      expect(isValid).toBeTruthy();
      
      // Verify user info is displayed
      const userProfile = await adminDashboard.getUserProfile();
      expect(userProfile?.role).toBe('admin');
    }
  });

  test('should handle pagination in tables', async ({ page }) => {
    await adminDashboard.navigateToSection('companies');
    
    // Check if pagination exists
    const pagination = page.locator('.pagination, [role="navigation"][aria-label="Pagination"]');
    
    if (await pagination.isVisible()) {
      // Go to next page
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        
        // Verify page changed
        await expect(page.locator('.current-page, [aria-current="page"]')).toContainText('2');
      }
      
      // Go back to first page
      const firstButton = page.locator('button:has-text("First"), [aria-label="First page"]');
      if (await firstButton.isVisible()) {
        await firstButton.click();
        await expect(page.locator('.current-page, [aria-current="page"]')).toContainText('1');
      }
    }
  });
});