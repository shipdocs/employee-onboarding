/**
 * Manager Complete Flow E2E Test
 * Tests comprehensive manager functionality using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { CrewOnboardingPage } from './pages/CrewOnboardingPage';
import { testUsers, generateRandomEmail, testWorkflows } from './fixtures/testData';
import { AuthHelper } from './helpers/authHelper';

test.describe('Manager Complete Flow', () => {
  let managerDashboard: ManagerDashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    managerDashboard = new ManagerDashboardPage(page);
    loginPage = new LoginPage(page);
    
    // Login as manager
    await AuthHelper.loginAsManager(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Logout
    await managerDashboard.logout();
  });

  test('should manage complete crew member lifecycle', async ({ page }) => {
    const crewEmail = generateRandomEmail();
    const crewData = {
      email: crewEmail,
      name: 'Test Crew Member',
      position: 'Deck Officer',
      workflowId: 'workflow-1',
      message: 'Welcome aboard! Please complete your onboarding.'
    };

    // Step 1: Check initial dashboard stats
    await test.step('Verify dashboard statistics', async () => {
      const initialStats = await managerDashboard.getDashboardStats();
      expect(typeof initialStats.totalCrewMembers).toBe('number');
      expect(typeof initialStats.activeOnboardings).toBe('number');
    });

    // Step 2: Invite new crew member
    await test.step('Invite new crew member', async () => {
      await managerDashboard.inviteCrewMember(crewData);
      
      // Verify success message
      await expect(page.locator('text=Invitation sent successfully')).toBeVisible();
      
      // Check pending invites increased
      const stats = await managerDashboard.getDashboardStats();
      expect(stats.pendingInvites).toBeGreaterThan(0);
    });

    // Step 3: Navigate to crew section and verify invite
    await test.step('Verify crew member in list', async () => {
      await managerDashboard.navigateToSection('crew');
      await managerDashboard.searchCrewMembers(crewEmail);
      
      const crewTable = await managerDashboard.getCrewTableData();
      const crewMember = crewTable.find(row => row.email?.includes(crewEmail));
      expect(crewMember).toBeTruthy();
      expect(crewMember?.status).toContain('Invited');
    });

    // Step 4: View crew member details
    await test.step('View crew member details', async () => {
      await managerDashboard.viewCrewMemberDetails(crewEmail);
      
      // Check tabs are available
      await expect(page.locator(managerDashboard.personalInfoTab)).toBeVisible();
      await expect(page.locator(managerDashboard.documentsTab)).toBeVisible();
      await expect(page.locator(managerDashboard.trainingTab)).toBeVisible();
      await expect(page.locator(managerDashboard.progressTab)).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    // Step 5: Assign workflow
    await test.step('Assign workflow to crew member', async () => {
      await managerDashboard.assignWorkflow({
        crewMemberId: crewEmail,
        workflowId: 'workflow-basic',
        dueDate: '2024-12-31'
      });
      
      await expect(page.locator('text=Workflow assigned successfully')).toBeVisible();
    });

    // Step 6: Simulate crew member progress
    await test.step('Monitor crew member progress', async () => {
      // In real scenario, crew member would complete onboarding
      // Here we'll check progress tracking
      
      await managerDashboard.viewCrewMemberDetails(crewEmail);
      await page.click(managerDashboard.progressTab);
      
      const progress = await managerDashboard.getCrewMemberProgress(crewEmail);
      expect(progress.overall).toBeGreaterThanOrEqual(0);
      expect(progress.overall).toBeLessThanOrEqual(100);
    });

    // Step 7: Check notifications
    await test.step('Check manager notifications', async () => {
      const notifications = await managerDashboard.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.includes('crew'))).toBeTruthy();
      
      // Mark as read
      await managerDashboard.markNotificationsAsRead();
    });

    // Step 8: Export crew data
    await test.step('Export crew data', async () => {
      await managerDashboard.navigateToSection('crew');
      
      const exportPath = await managerDashboard.exportCrewData('csv');
      expect(exportPath).toBeTruthy();
    });
  });

  test('should handle bulk crew operations', async ({ page }) => {
    // Generate multiple crew members
    const crewMembers = Array.from({ length: 3 }, (_, i) => ({
      email: generateRandomEmail(),
      name: `Bulk Crew ${i + 1}`,
      position: 'Able Seaman'
    }));

    // Bulk invite
    await test.step('Send bulk invitations', async () => {
      await managerDashboard.bulkInviteCrewMembers(crewMembers);
      
      await expect(page.locator('text=invitations sent')).toBeVisible();
    });

    // Select multiple crew members
    await test.step('Select crew for bulk action', async () => {
      await managerDashboard.navigateToSection('crew');
      
      const emails = crewMembers.map(c => c.email);
      await managerDashboard.selectCrewMembers(emails);
      
      // Perform bulk assign
      await managerDashboard.performBulkAction('assign');
      
      await expect(page.locator('text=Workflow assigned to')).toBeVisible();
    });
  });

  test('should filter and search crew effectively', async ({ page }) => {
    await managerDashboard.navigateToSection('crew');
    
    // Apply multiple filters
    await test.step('Apply filters', async () => {
      await managerDashboard.applyFilters({
        status: 'active',
        position: 'Officer',
        dateRange: 'this_month'
      });
      
      // Verify filters are applied
      const activeFilter = page.locator('.filter-tag:has-text("Active")');
      await expect(activeFilter).toBeVisible();
    });

    // Clear filters
    await test.step('Clear filters', async () => {
      await managerDashboard.clearFilters();
      
      // Verify filters are cleared
      const filterTags = page.locator('.filter-tag');
      await expect(filterTags).toHaveCount(0);
    });

    // Search functionality
    await test.step('Search crew members', async () => {
      await managerDashboard.searchCrewMembers('Officer');
      
      // Verify search results
      const results = await managerDashboard.getCrewTableData();
      expect(results.every(r => r.position?.includes('Officer'))).toBeTruthy();
    });
  });

  test('should track workflow statistics', async ({ page }) => {
    await managerDashboard.navigateToSection('workflows');
    
    // Get stats for a specific workflow
    const workflowStats = await managerDashboard.getWorkflowStats('workflow-basic');
    
    expect(typeof workflowStats.assigned).toBe('number');
    expect(typeof workflowStats.inProgress).toBe('number');
    expect(typeof workflowStats.completed).toBe('number');
    expect(workflowStats.averageTime).toBeTruthy();
  });

  test('should handle resending invitations', async ({ page }) => {
    const testEmail = 'pending-crew@test.com';
    
    await test.step('Resend invitation', async () => {
      await managerDashboard.navigateToSection('crew');
      await managerDashboard.searchCrewMembers(testEmail);
      
      // Resend invite
      await managerDashboard.resendInvite(testEmail);
      
      await expect(page.locator('text=Invitation resent')).toBeVisible();
    });
  });

  test('should view crew member documents', async ({ page }) => {
    const crewEmail = 'existing-crew@test.com';
    
    await test.step('View uploaded documents', async () => {
      await managerDashboard.navigateToSection('crew');
      
      const documents = await managerDashboard.viewCrewDocuments(crewEmail);
      
      // Should have standard documents
      expect(documents).toContain('passport');
      expect(documents).toContain('medical');
    });
  });

  test('should monitor recent activity', async ({ page }) => {
    const activities = await managerDashboard.getRecentActivity();
    
    expect(activities.length).toBeGreaterThan(0);
    expect(activities.some(a => 
      a.includes('invited') || 
      a.includes('completed') || 
      a.includes('assigned')
    )).toBeTruthy();
  });

  test('should handle multiple companies (if applicable)', async ({ page }) => {
    // Check if company selector exists
    const companySelector = page.locator('select[name="company"]');
    
    if (await companySelector.isVisible()) {
      await test.step('Switch between companies', async () => {
        // Get current company
        const currentCompany = await companySelector.inputValue();
        
        // Switch to another company
        await managerDashboard.switchCompany('Secondary Company');
        
        // Verify dashboard updated
        await page.waitForLoadState('networkidle');
        const stats = await managerDashboard.getDashboardStats();
        expect(stats).toBeTruthy();
      });
    }
  });

  test('should archive crew members', async ({ page }) => {
    const inactiveCrewEmail = 'inactive-crew@test.com';
    
    await test.step('Archive crew member', async () => {
      await managerDashboard.navigateToSection('crew');
      await managerDashboard.searchCrewMembers(inactiveCrewEmail);
      
      await managerDashboard.archiveCrewMember(inactiveCrewEmail);
      
      await expect(page.locator('text=Crew member archived')).toBeVisible();
      
      // Verify removed from active list
      await managerDashboard.applyFilters({ status: 'active' });
      const crewTable = await managerDashboard.getCrewTableData();
      const archived = crewTable.find(row => row.email?.includes(inactiveCrewEmail));
      expect(archived).toBeFalsy();
    });
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network error for crew invite
    await page.route('**/api/manager/invite-crew', route => route.abort());
    
    await test.step('Handle invite error', async () => {
      const crewData = {
        email: generateRandomEmail(),
        name: 'Error Test',
        position: 'Test Position'
      };
      
      await managerDashboard.inviteCrewMember(crewData);
      
      // Should show error message
      await expect(page.locator('.error-message, [role="alert"]')).toBeVisible();
    });
  });

  test('should validate crew invitation form', async ({ page }) => {
    await page.click(managerDashboard.inviteCrewButton);
    
    // Try to submit empty form
    await page.click(managerDashboard.sendInviteButton);
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Position is required')).toBeVisible();
    
    // Test invalid email
    await page.fill(managerDashboard.crewEmailInput, 'invalid-email');
    await page.click(managerDashboard.sendInviteButton);
    
    await expect(page.locator('text=Invalid email')).toBeVisible();
  });

  test('should maintain state across page refreshes', async ({ page }) => {
    await managerDashboard.navigateToSection('crew');
    
    // Apply filters
    await managerDashboard.applyFilters({
      status: 'active',
      position: 'Officer'
    });
    
    // Search
    await managerDashboard.searchCrewMembers('Test');
    
    // Refresh page
    await page.reload();
    
    // Filters should persist (if implemented)
    const urlParams = new URL(page.url()).searchParams;
    expect(urlParams.get('status') || '').toBe('active');
    expect(urlParams.get('position') || '').toBe('Officer');
    expect(urlParams.get('search') || '').toBe('Test');
  });

  test('should handle responsive design for tablets', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify navigation works on tablet
    await managerDashboard.navigateToSection('crew');
    await expect(page).toHaveURL(/\/manager\/crew/);
    
    // Verify table is responsive
    const table = page.locator(managerDashboard.crewTable);
    await expect(table).toBeVisible();
    
    // Check if mobile menu is used
    const mobileMenu = page.locator('.mobile-menu-toggle, [aria-label="Menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator(managerDashboard.navMenu)).toBeVisible();
    }
  });
});