/**
 * Manager Dashboard Page Object
 * Handles manager dashboard functionality and crew management
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CrewInviteData {
  email: string;
  name: string;
  position: string;
  workflowId?: string;
  message?: string;
}

export interface WorkflowAssignment {
  crewMemberId: string;
  workflowId: string;
  dueDate?: string;
}

export class ManagerDashboardPage extends BasePage {
  // Navigation
  readonly navMenu = '.manager-nav, nav[role="navigation"]';
  readonly dashboardLink = 'a:has-text("Dashboard")';
  readonly crewLink = 'a:has-text("Crew Members")';
  readonly workflowsLink = 'a:has-text("Workflows")';
  readonly reportsLink = 'a:has-text("Reports")';
  readonly settingsLink = 'a:has-text("Settings")';
  readonly logoutButton = 'button:has-text("Logout")';
  
  // Dashboard widgets
  readonly statsWidget = '.stats-widget';
  readonly totalCrewMembers = '[data-stat="total-crew"]';
  readonly activeOnboardings = '[data-stat="active-onboardings"]';
  readonly completedThisMonth = '[data-stat="completed-month"]';
  readonly pendingInvites = '[data-stat="pending-invites"]';
  
  // Crew management
  readonly inviteCrewButton = 'button:has-text("Invite Crew Member")';
  readonly crewEmailInput = 'input[name="crewEmail"]';
  readonly crewNameInput = 'input[name="crewName"]';
  readonly crewPositionInput = 'input[name="position"]';
  readonly workflowSelect = 'select[name="workflowId"]';
  readonly inviteMessageInput = 'textarea[name="inviteMessage"]';
  readonly sendInviteButton = 'button:has-text("Send Invite")';
  readonly crewTable = '.crew-table, table[data-table="crew"]';
  readonly viewCrewButton = 'button[aria-label="View crew member"]';
  readonly resendInviteButton = 'button[aria-label="Resend invite"]';
  readonly archiveCrewButton = 'button[aria-label="Archive crew member"]';
  
  // Workflow management
  readonly assignWorkflowButton = 'button:has-text("Assign Workflow")';
  readonly workflowGrid = '.workflow-grid';
  readonly workflowCard = '.workflow-card';
  readonly crewMemberSelect = 'select[name="crewMemberId"]';
  readonly dueDateInput = 'input[name="dueDate"]';
  readonly assignButton = 'button:has-text("Assign")';
  
  // Progress tracking
  readonly progressChart = '.progress-chart';
  readonly progressBar = '.progress-bar';
  readonly statusBadge = '.status-badge';
  readonly timelineView = '.timeline-view';
  
  // Filters and search
  readonly searchInput = 'input[type="search"], input[placeholder*="Search"]';
  readonly statusFilter = 'select[name="status"]';
  readonly positionFilter = 'select[name="position"]';
  readonly dateRangeFilter = 'input[name="dateRange"]';
  readonly applyFiltersButton = 'button:has-text("Apply")';
  readonly clearFiltersButton = 'button:has-text("Clear")';
  
  // Crew member details
  readonly crewDetailsModal = '.crew-details-modal';
  readonly personalInfoTab = 'button:has-text("Personal Info")';
  readonly documentsTab = 'button:has-text("Documents")';
  readonly trainingTab = 'button:has-text("Training")';
  readonly progressTab = 'button:has-text("Progress")';
  
  // Bulk actions
  readonly selectAllCheckbox = 'input[type="checkbox"][aria-label="Select all"]';
  readonly bulkActionsButton = 'button:has-text("Bulk Actions")';
  readonly bulkInviteButton = 'button:has-text("Send Bulk Invites")';
  readonly bulkAssignButton = 'button:has-text("Bulk Assign Workflow")';
  
  // Notifications
  readonly notificationBell = '.notification-bell';
  readonly notificationDropdown = '.notification-dropdown';
  readonly notificationItem = '.notification-item';
  readonly markAllReadButton = 'button:has-text("Mark all as read")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to manager dashboard
   */
  async gotoDashboard() {
    await this.goto('/manager/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to specific section
   */
  async navigateToSection(section: 'crew' | 'workflows' | 'reports' | 'settings') {
    switch (section) {
      case 'crew':
        await this.page.click(this.crewLink);
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
    totalCrewMembers: number;
    activeOnboardings: number;
    completedThisMonth: number;
    pendingInvites: number;
  }> {
    return {
      totalCrewMembers: parseInt(await this.getTextContent(this.totalCrewMembers) || '0'),
      activeOnboardings: parseInt(await this.getTextContent(this.activeOnboardings) || '0'),
      completedThisMonth: parseInt(await this.getTextContent(this.completedThisMonth) || '0'),
      pendingInvites: parseInt(await this.getTextContent(this.pendingInvites) || '0')
    };
  }

  /**
   * Invite crew member
   */
  async inviteCrewMember(invite: CrewInviteData) {
    await this.page.click(this.inviteCrewButton);
    await this.page.waitForSelector('.invite-modal', { state: 'visible' });
    
    await this.fillInput(this.crewEmailInput, invite.email);
    await this.fillInput(this.crewNameInput, invite.name);
    await this.fillInput(this.crewPositionInput, invite.position);
    
    if (invite.workflowId) {
      await this.selectOption(this.workflowSelect, invite.workflowId);
    }
    
    if (invite.message) {
      await this.fillInput(this.inviteMessageInput, invite.message);
    }
    
    await this.page.click(this.sendInviteButton);
    await this.waitForResponse(/\/api\/manager\/invite-crew/);
  }

  /**
   * Bulk invite crew members
   */
  async bulkInviteCrewMembers(invites: CrewInviteData[]) {
    await this.page.click(this.bulkInviteButton);
    await this.page.waitForSelector('.bulk-invite-modal', { state: 'visible' });
    
    // Implementation depends on UI - could be CSV upload or form fields
    for (let i = 0; i < invites.length; i++) {
      const invite = invites[i];
      await this.fillInput(`input[name="crew[${i}].email"]`, invite.email);
      await this.fillInput(`input[name="crew[${i}].name"]`, invite.name);
      await this.fillInput(`input[name="crew[${i}].position"]`, invite.position);
    }
    
    await this.page.click('button:has-text("Send All Invites")');
    await this.waitForResponse(/\/api\/manager\/bulk-invite/);
  }

  /**
   * View crew member details
   */
  async viewCrewMemberDetails(crewEmail: string) {
    const row = this.page.locator(`tr:has-text("${crewEmail}")`);
    await row.locator(this.viewCrewButton).click();
    await this.page.waitForSelector(this.crewDetailsModal, { state: 'visible' });
  }

  /**
   * Get crew member progress
   */
  async getCrewMemberProgress(crewEmail: string): Promise<{
    overall: number;
    personalInfo: boolean;
    documents: boolean;
    training: number;
    quiz: number;
  }> {
    await this.viewCrewMemberDetails(crewEmail);
    await this.page.click(this.progressTab);
    
    // Extract progress data from UI
    const overallProgress = await this.page.locator('.overall-progress').getAttribute('data-progress');
    const personalInfoComplete = await this.isElementVisible('.personal-info.complete');
    const documentsComplete = await this.isElementVisible('.documents.complete');
    const trainingProgress = await this.page.locator('.training-progress').getAttribute('data-progress');
    const quizScore = await this.page.locator('.quiz-score').getAttribute('data-score');
    
    return {
      overall: parseInt(overallProgress || '0'),
      personalInfo: personalInfoComplete,
      documents: documentsComplete,
      training: parseInt(trainingProgress || '0'),
      quiz: parseInt(quizScore || '0')
    };
  }

  /**
   * Assign workflow to crew member
   */
  async assignWorkflow(assignment: WorkflowAssignment) {
    await this.page.click(this.assignWorkflowButton);
    await this.page.waitForSelector('.assign-workflow-modal', { state: 'visible' });
    
    await this.selectOption(this.crewMemberSelect, assignment.crewMemberId);
    await this.selectOption(this.workflowSelect, assignment.workflowId);
    
    if (assignment.dueDate) {
      await this.fillInput(this.dueDateInput, assignment.dueDate);
    }
    
    await this.page.click(this.assignButton);
    await this.waitForResponse(/\/api\/manager\/assign-workflow/);
  }

  /**
   * Resend invite to crew member
   */
  async resendInvite(crewEmail: string) {
    const row = this.page.locator(`tr:has-text("${crewEmail}")`);
    await row.locator(this.resendInviteButton).click();
    
    // Confirm action
    await this.page.click(this.confirmButton);
    await this.waitForResponse(/\/api\/manager\/resend-invite/);
  }

  /**
   * Archive crew member
   */
  async archiveCrewMember(crewEmail: string) {
    const row = this.page.locator(`tr:has-text("${crewEmail}")`);
    await row.locator(this.archiveCrewButton).click();
    
    // Confirm action
    await this.page.waitForSelector('.confirm-modal', { state: 'visible' });
    await this.page.click(this.confirmButton);
    await this.waitForResponse(/\/api\/manager\/archive-crew/);
  }

  /**
   * Search crew members
   */
  async searchCrewMembers(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForResponse(/\/api\/manager\/crew/);
  }

  /**
   * Apply filters
   */
  async applyFilters(filters: {
    status?: string;
    position?: string;
    dateRange?: string;
  }) {
    if (filters.status) {
      await this.selectOption(this.statusFilter, filters.status);
    }
    if (filters.position) {
      await this.selectOption(this.positionFilter, filters.position);
    }
    if (filters.dateRange) {
      await this.fillInput(this.dateRangeFilter, filters.dateRange);
    }
    
    await this.page.click(this.applyFiltersButton);
    await this.waitForResponse(/\/api\/manager\/crew/);
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.page.click(this.clearFiltersButton);
    await this.waitForPageLoad();
  }

  /**
   * Get crew table data
   */
  async getCrewTableData(): Promise<any[]> {
    const rows = this.page.locator(`${this.crewTable} tbody tr`);
    const count = await rows.count();
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      data.push({
        name: await row.locator('td:nth-child(1)').textContent(),
        email: await row.locator('td:nth-child(2)').textContent(),
        position: await row.locator('td:nth-child(3)').textContent(),
        status: await row.locator('td:nth-child(4)').textContent(),
        progress: await row.locator('td:nth-child(5)').textContent()
      });
    }
    
    return data;
  }

  /**
   * Select crew members for bulk action
   */
  async selectCrewMembers(emails: string[]) {
    for (const email of emails) {
      const row = this.page.locator(`tr:has-text("${email}")`);
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check();
    }
  }

  /**
   * Perform bulk action
   */
  async performBulkAction(action: 'invite' | 'assign' | 'archive') {
    await this.page.click(this.bulkActionsButton);
    
    switch (action) {
      case 'invite':
        await this.page.click('button:has-text("Resend Invites")');
        break;
      case 'assign':
        await this.page.click('button:has-text("Assign Workflow")');
        break;
      case 'archive':
        await this.page.click('button:has-text("Archive Selected")');
        break;
    }
    
    await this.page.click(this.confirmButton);
    await this.waitForResponse(/\/api\/manager\/bulk-action/);
  }

  /**
   * Get notifications
   */
  async getNotifications(): Promise<string[]> {
    await this.page.click(this.notificationBell);
    await this.page.waitForSelector(this.notificationDropdown, { state: 'visible' });
    
    const notifications = this.page.locator(this.notificationItem);
    const count = await notifications.count();
    
    const items = [];
    for (let i = 0; i < count; i++) {
      const text = await notifications.nth(i).textContent();
      if (text) items.push(text.trim());
    }
    
    return items;
  }

  /**
   * Mark all notifications as read
   */
  async markNotificationsAsRead() {
    await this.page.click(this.notificationBell);
    await this.page.waitForSelector(this.notificationDropdown, { state: 'visible' });
    await this.page.click(this.markAllReadButton);
  }

  /**
   * Export crew data
   */
  async exportCrewData(format: 'csv' | 'pdf' | 'excel') {
    const exportButton = this.page.locator(`button:has-text("Export ${format.toUpperCase()}")`);
    return await this.downloadFile(exportButton);
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    assigned: number;
    inProgress: number;
    completed: number;
    averageTime: string;
  }> {
    const workflowCard = this.page.locator(`${this.workflowCard}[data-workflow-id="${workflowId}"]`);
    
    return {
      assigned: parseInt(await workflowCard.locator('[data-stat="assigned"]').textContent() || '0'),
      inProgress: parseInt(await workflowCard.locator('[data-stat="in-progress"]').textContent() || '0'),
      completed: parseInt(await workflowCard.locator('[data-stat="completed"]').textContent() || '0'),
      averageTime: await workflowCard.locator('[data-stat="avg-time"]').textContent() || 'N/A'
    };
  }

  /**
   * View crew member documents
   */
  async viewCrewDocuments(crewEmail: string): Promise<string[]> {
    await this.viewCrewMemberDetails(crewEmail);
    await this.page.click(this.documentsTab);
    
    const documents = this.page.locator('.document-item');
    const count = await documents.count();
    
    const docs = [];
    for (let i = 0; i < count; i++) {
      const name = await documents.nth(i).locator('.document-name').textContent();
      if (name) docs.push(name.trim());
    }
    
    return docs;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(): Promise<string[]> {
    const activityFeed = this.page.locator('.activity-feed li');
    const count = await activityFeed.count();
    
    const activities = [];
    for (let i = 0; i < count; i++) {
      const text = await activityFeed.nth(i).textContent();
      if (text) activities.push(text.trim());
    }
    
    return activities;
  }

  /**
   * Change company (if manager manages multiple)
   */
  async switchCompany(companyName: string) {
    const companySelector = this.page.locator('select[name="company"]');
    if (await companySelector.isVisible()) {
      await this.selectOption(companySelector, companyName);
      await this.waitForPageLoad();
    }
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click(this.logoutButton);
    await this.waitForNavigation('/manager/login');
  }
}