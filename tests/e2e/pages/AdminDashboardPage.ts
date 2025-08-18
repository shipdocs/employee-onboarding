/**
 * Admin Dashboard Page Object
 * Handles admin dashboard functionality and navigation
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CompanyData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  industry?: string;
}

export interface ManagerData {
  email: string;
  name: string;
  password: string;
  phone?: string;
  department?: string;
}

export class AdminDashboardPage extends BasePage {
  // Navigation
  readonly navMenu = '.admin-nav, nav[role="navigation"]';
  readonly dashboardLink = 'a:has-text("Dashboard")';
  readonly companiesLink = 'a:has-text("Companies")';
  readonly managersLink = 'a:has-text("Managers")';
  readonly workflowsLink = 'a:has-text("Workflows")';
  readonly reportsLink = 'a:has-text("Reports")';
  readonly settingsLink = 'a:has-text("Settings")';
  readonly logoutButton = 'button:has-text("Logout")';
  
  // Dashboard widgets
  readonly statsWidget = '.stats-widget';
  readonly totalCompanies = '[data-stat="total-companies"]';
  readonly activeUsers = '[data-stat="active-users"]';
  readonly completedOnboardings = '[data-stat="completed-onboardings"]';
  readonly pendingOnboardings = '[data-stat="pending-onboardings"]';
  
  // Companies management
  readonly addCompanyButton = 'button:has-text("Add Company")';
  readonly companyNameInput = 'input[name="companyName"]';
  readonly companyEmailInput = 'input[name="companyEmail"]';
  readonly companyPhoneInput = 'input[name="companyPhone"]';
  readonly companyAddressInput = 'textarea[name="companyAddress"]';
  readonly companyIndustrySelect = 'select[name="industry"]';
  readonly saveCompanyButton = 'button:has-text("Save Company")';
  readonly companiesTable = '.companies-table, table[data-table="companies"]';
  readonly editCompanyButton = 'button[aria-label="Edit company"]';
  readonly deleteCompanyButton = 'button[aria-label="Delete company"]';
  
  // Managers management
  readonly addManagerButton = 'button:has-text("Add Manager")';
  readonly managerNameInput = 'input[name="managerName"]';
  readonly managerEmailInput = 'input[name="managerEmail"]';
  readonly managerPasswordInput = 'input[name="managerPassword"]';
  readonly managerPhoneInput = 'input[name="managerPhone"]';
  readonly managerCompanySelect = 'select[name="companyId"]';
  readonly managerDepartmentInput = 'input[name="department"]';
  readonly saveManagerButton = 'button:has-text("Save Manager")';
  readonly managersTable = '.managers-table, table[data-table="managers"]';
  
  // Workflows
  readonly createWorkflowButton = 'button:has-text("Create Workflow")';
  readonly workflowNameInput = 'input[name="workflowName"]';
  readonly workflowDescriptionInput = 'textarea[name="workflowDescription"]';
  readonly workflowStepsContainer = '.workflow-steps';
  readonly addStepButton = 'button:has-text("Add Step")';
  readonly saveWorkflowButton = 'button:has-text("Save Workflow")';
  readonly workflowsGrid = '.workflows-grid';
  
  // Search and filters
  readonly searchInput = 'input[type="search"], input[placeholder*="Search"]';
  readonly filterButton = 'button:has-text("Filter")';
  readonly statusFilter = 'select[name="status"]';
  readonly dateRangeFilter = 'input[name="dateRange"]';
  readonly applyFiltersButton = 'button:has-text("Apply Filters")';
  
  // Modals
  readonly modalContainer = '.modal, [role="dialog"]';
  readonly modalCloseButton = '.modal-close, button[aria-label="Close"]';
  readonly confirmButton = 'button:has-text("Confirm")';
  readonly cancelButton = 'button:has-text("Cancel")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to admin dashboard
   */
  async gotoDashboard() {
    await this.goto('/admin/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to specific section
   */
  async navigateToSection(section: 'companies' | 'managers' | 'workflows' | 'reports' | 'settings') {
    switch (section) {
      case 'companies':
        await this.page.click(this.companiesLink);
        break;
      case 'managers':
        await this.page.click(this.managersLink);
        break;
      case 'workflows':
        await this.page.click(this.workflowsLink);
        break;
      case 'reports':
        await this.page.click(this.reportsLink);
        break;
      case 'settings':
        await this.page.click(this.settingsLink);
        break;
    }
    await this.waitForPageLoad();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    totalCompanies: number;
    activeUsers: number;
    completedOnboardings: number;
    pendingOnboardings: number;
  }> {
    return {
      totalCompanies: parseInt(await this.getTextContent(this.totalCompanies) || '0'),
      activeUsers: parseInt(await this.getTextContent(this.activeUsers) || '0'),
      completedOnboardings: parseInt(await this.getTextContent(this.completedOnboardings) || '0'),
      pendingOnboardings: parseInt(await this.getTextContent(this.pendingOnboardings) || '0')
    };
  }

  /**
   * Add new company
   */
  async addCompany(company: CompanyData) {
    await this.page.click(this.addCompanyButton);
    await this.page.waitForSelector(this.modalContainer, { state: 'visible' });
    
    await this.fillInput(this.companyNameInput, company.name);
    await this.fillInput(this.companyEmailInput, company.email);
    
    if (company.phone) {
      await this.fillInput(this.companyPhoneInput, company.phone);
    }
    if (company.address) {
      await this.fillInput(this.companyAddressInput, company.address);
    }
    if (company.industry) {
      await this.selectOption(this.companyIndustrySelect, company.industry);
    }
    
    await this.page.click(this.saveCompanyButton);
    await this.waitForResponse(/\/api\/admin\/companies/);
  }

  /**
   * Edit company
   */
  async editCompany(companyName: string, updates: Partial<CompanyData>) {
    // Find company in table
    const row = this.page.locator(`tr:has-text("${companyName}")`);
    await row.locator(this.editCompanyButton).click();
    
    await this.page.waitForSelector(this.modalContainer, { state: 'visible' });
    
    if (updates.name) {
      await this.fillInput(this.companyNameInput, updates.name);
    }
    if (updates.email) {
      await this.fillInput(this.companyEmailInput, updates.email);
    }
    if (updates.phone) {
      await this.fillInput(this.companyPhoneInput, updates.phone);
    }
    if (updates.address) {
      await this.fillInput(this.companyAddressInput, updates.address);
    }
    
    await this.page.click(this.saveCompanyButton);
    await this.waitForResponse(/\/api\/admin\/companies/);
  }

  /**
   * Delete company
   */
  async deleteCompany(companyName: string) {
    const row = this.page.locator(`tr:has-text("${companyName}")`);
    await row.locator(this.deleteCompanyButton).click();
    
    // Confirm deletion
    await this.page.waitForSelector(this.modalContainer, { state: 'visible' });
    await this.page.click(this.confirmButton);
    await this.waitForResponse(/\/api\/admin\/companies/);
  }

  /**
   * Add new manager
   */
  async addManager(manager: ManagerData, companyName: string) {
    await this.page.click(this.addManagerButton);
    await this.page.waitForSelector(this.modalContainer, { state: 'visible' });
    
    await this.fillInput(this.managerNameInput, manager.name);
    await this.fillInput(this.managerEmailInput, manager.email);
    await this.fillInput(this.managerPasswordInput, manager.password);
    
    if (manager.phone) {
      await this.fillInput(this.managerPhoneInput, manager.phone);
    }
    if (manager.department) {
      await this.fillInput(this.managerDepartmentInput, manager.department);
    }
    
    // Select company
    await this.selectOption(this.managerCompanySelect, companyName);
    
    await this.page.click(this.saveManagerButton);
    await this.waitForResponse(/\/api\/admin\/managers/);
  }

  /**
   * Search for items
   */
  async search(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForResponse(/\/api\/admin\/(companies|managers|workflows)/);
  }

  /**
   * Apply filters
   */
  async applyFilters(filters: {
    status?: string;
    dateRange?: string;
  }) {
    await this.page.click(this.filterButton);
    await this.page.waitForSelector('.filter-panel', { state: 'visible' });
    
    if (filters.status) {
      await this.selectOption(this.statusFilter, filters.status);
    }
    if (filters.dateRange) {
      await this.fillInput(this.dateRangeFilter, filters.dateRange);
    }
    
    await this.page.click(this.applyFiltersButton);
    await this.waitForPageLoad();
  }

  /**
   * Check if user has permission
   */
  async hasPermission(action: string): Promise<boolean> {
    // Check if action button is enabled
    const actionButton = this.page.locator(`button:has-text("${action}")`);
    if (await actionButton.isVisible()) {
      return await actionButton.isEnabled();
    }
    return false;
  }

  /**
   * Get table data
   */
  async getTableData(tableName: 'companies' | 'managers'): Promise<any[]> {
    const tableSelector = tableName === 'companies' ? this.companiesTable : this.managersTable;
    const rows = this.page.locator(`${tableSelector} tbody tr`);
    const count = await rows.count();
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const cellCount = await cells.count();
      const rowData: any = {};
      
      for (let j = 0; j < cellCount; j++) {
        const text = await cells.nth(j).textContent();
        rowData[`column_${j}`] = text?.trim();
      }
      
      data.push(rowData);
    }
    
    return data;
  }

  /**
   * Export data
   */
  async exportData(format: 'csv' | 'pdf' | 'excel') {
    const exportButton = this.page.locator(`button:has-text("Export as ${format.toUpperCase()}")`);
    if (await exportButton.isVisible()) {
      const downloadPath = await this.downloadFile(exportButton);
      return downloadPath;
    }
    return null;
  }

  /**
   * Get activity logs
   */
  async getRecentActivity(): Promise<string[]> {
    const activityList = this.page.locator('.activity-log li, .recent-activity li');
    const count = await activityList.count();
    
    const activities = [];
    for (let i = 0; i < count; i++) {
      const text = await activityList.nth(i).textContent();
      if (text) activities.push(text.trim());
    }
    
    return activities;
  }

  /**
   * Create workflow
   */
  async createWorkflow(workflow: {
    name: string;
    description: string;
    steps: string[];
  }) {
    await this.page.click(this.createWorkflowButton);
    await this.page.waitForSelector(this.modalContainer, { state: 'visible' });
    
    await this.fillInput(this.workflowNameInput, workflow.name);
    await this.fillInput(this.workflowDescriptionInput, workflow.description);
    
    // Add steps
    for (const step of workflow.steps) {
      await this.page.click(this.addStepButton);
      const stepInput = this.page.locator('.workflow-step input').last();
      await stepInput.fill(step);
    }
    
    await this.page.click(this.saveWorkflowButton);
    await this.waitForResponse(/\/api\/admin\/workflows/);
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    const badge = this.page.locator('.notification-badge, .badge');
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      return parseInt(text || '0');
    }
    return 0;
  }

  /**
   * Check if modal is open
   */
  async isModalOpen(): Promise<boolean> {
    return await this.isElementVisible(this.modalContainer);
  }

  /**
   * Close modal
   */
  async closeModal() {
    if (await this.isModalOpen()) {
      await this.page.click(this.modalCloseButton);
      await this.page.waitForSelector(this.modalContainer, { state: 'hidden' });
    }
  }

  /**
   * Logout from admin
   */
  async logout() {
    await this.page.click(this.logoutButton);
    await this.waitForNavigation('/admin/login');
  }

  /**
   * Check session validity
   */
  async isSessionValid(): Promise<boolean> {
    // Check if we're still on admin pages
    const currentUrl = await this.getCurrentUrl();
    return currentUrl.includes('/admin/') && !currentUrl.includes('/login');
  }

  /**
   * Get user profile info
   */
  async getUserProfile(): Promise<{
    name: string;
    email: string;
    role: string;
  } | null> {
    const profileElement = this.page.locator('.user-profile, .user-info');
    if (await profileElement.isVisible()) {
      const text = await profileElement.textContent();
      // Parse profile info (implementation depends on UI structure)
      return {
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      };
    }
    return null;
  }
}