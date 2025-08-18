/**
 * Manager Workflows E2E Tests
 * Tests complete manager functionality including crew management, monitoring, and reporting
 */

import { test, expect } from '@playwright/test';

// Test data
const testManager = {
  email: 'test.manager@shipping-company.com',
  name: 'Test Manager',
  company: 'Test Shipping Company',
  password: 'SecurePassword123!',
  permissions: ['manage_crew', 'view_reports', 'edit_training']
};

const testCrewMembers = [
  {
    email: 'crew1@shipping-company.com',
    name: 'John Doe',
    position: 'Deck Officer',
    status: 'active'
  },
  {
    email: 'crew2@shipping-company.com',
    name: 'Jane Smith',
    position: 'Chief Engineer',
    status: 'onboarding'
  },
  {
    email: 'crew3@shipping-company.com',
    name: 'Bob Johnson',
    position: 'Second Officer',
    status: 'pending'
  }
];

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/manager/login');
    await page.fill('input[type="email"]', testManager.email);
    await page.click('button:has-text("Send Magic Link")');
    
    // Simulate magic link access
    await page.goto('/manager/dashboard?token=test-manager-token');
  });

  test('should display manager dashboard overview', async ({ page }) => {
    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Manager Dashboard');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    
    // Check key metrics
    await expect(page.locator('[data-testid="total-crew"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-onboarding"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-actions"]')).toBeVisible();
  });

  test('should display crew member list with filters', async ({ page }) => {
    // Navigate to crew management
    await page.click('a:has-text("Crew Management")');
    await expect(page).toHaveURL('/manager/crew');
    
    // Check crew list
    await expect(page.locator('h2')).toContainText('Crew Members');
    await expect(page.locator('table')).toBeVisible();
    
    // Verify crew members are displayed
    for (const crew of testCrewMembers) {
      await expect(page.locator(`text=${crew.name}`)).toBeVisible();
    }
    
    // Test status filter
    await page.selectOption('select[name="status-filter"]', 'onboarding');
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=John Doe')).not.toBeVisible();
    
    // Test search
    await page.selectOption('select[name="status-filter"]', 'all');
    await page.fill('input[placeholder="Search crew..."]', 'John');
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).not.toBeVisible();
  });

  test('should add new crew member', async ({ page }) => {
    await page.click('a:has-text("Crew Management")');
    await page.click('button:has-text("Add New Crew Member")');
    
    // Fill new crew member form
    await expect(page.locator('h3')).toContainText('Add New Crew Member');
    await page.fill('input[name="firstName"]', 'New');
    await page.fill('input[name="lastName"]', 'Member');
    await page.fill('input[name="email"]', 'new.member@shipping-company.com');
    await page.selectOption('select[name="position"]', 'Third Officer');
    await page.fill('input[name="nationality"]', 'United States');
    await page.fill('input[name="dateOfBirth"]', '1995-05-15');
    
    // Submit form
    await page.click('button:has-text("Add Crew Member")');
    
    // Verify success message
    await expect(page.locator('text=Crew member added successfully')).toBeVisible();
    await expect(page.locator('text=New Member')).toBeVisible();
  });

  test('should validate crew member form', async ({ page }) => {
    await page.click('a:has-text("Crew Management")');
    await page.click('button:has-text("Add New Crew Member")');
    
    // Try to submit empty form
    await page.click('button:has-text("Add Crew Member")');
    
    // Check validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button:has-text("Add Crew Member")');
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });
});

test.describe('Crew Member Details', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to crew management
    await page.goto('/manager/dashboard?token=test-manager-token');
    await page.click('a:has-text("Crew Management")');
  });

  test('should view crew member details', async ({ page }) => {
    // Click on crew member
    await page.click('text=Jane Smith');
    
    // Check details page
    await expect(page).toHaveURL(/\/manager\/crew\/\d+/);
    await expect(page.locator('h2')).toContainText('Jane Smith');
    
    // Check tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Documents")')).toBeVisible();
    await expect(page.locator('button:has-text("Training")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();
    
    // Check overview information
    await expect(page.locator('text=Position: Chief Engineer')).toBeVisible();
    await expect(page.locator('text=Status: Onboarding')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  });

  test('should manage crew member documents', async ({ page }) => {
    await page.click('text=Jane Smith');
    await page.click('button:has-text("Documents")');
    
    // Check document list
    await expect(page.locator('h3')).toContainText('Documents');
    await expect(page.locator('text=Passport')).toBeVisible();
    await expect(page.locator('text=Medical Certificate')).toBeVisible();
    
    // Request document update
    await page.click('button:has-text("Request Update")', { hasText: 'Medical Certificate' });
    await page.fill('textarea[placeholder="Add a note..."]', 'Medical certificate expires next month');
    await page.click('button:has-text("Send Request")');
    
    // Verify request sent
    await expect(page.locator('text=Update request sent')).toBeVisible();
  });

  test('should monitor training progress', async ({ page }) => {
    await page.click('text=Jane Smith');
    await page.click('button:has-text("Training")');
    
    // Check training modules
    await expect(page.locator('h3')).toContainText('Training Progress');
    await expect(page.locator('text=Safety Training')).toBeVisible();
    await expect(page.locator('text=Security Awareness')).toBeVisible();
    
    // Check progress indicators
    const safetyProgress = page.locator('[data-testid="safety-training-progress"]');
    await expect(safetyProgress).toHaveAttribute('aria-valuenow', '100');
    
    const securityProgress = page.locator('[data-testid="security-awareness-progress"]');
    await expect(securityProgress).toHaveAttribute('aria-valuenow', '50');
    
    // View training details
    await page.click('button:has-text("View Details")', { hasText: 'Security Awareness' });
    await expect(page.locator('text=Module incomplete')).toBeVisible();
    await expect(page.locator('text=Time spent: 30 minutes')).toBeVisible();
  });

  test('should send reminders to crew members', async ({ page }) => {
    await page.click('text=Bob Johnson');
    
    // Check pending status
    await expect(page.locator('text=Status: Pending')).toBeVisible();
    
    // Send reminder
    await page.click('button:has-text("Send Reminder")');
    
    // Fill reminder form
    await expect(page.locator('h4')).toContainText('Send Reminder');
    await page.selectOption('select[name="reminderType"]', 'start_onboarding');
    await page.fill('textarea[name="customMessage"]', 'Please start your onboarding process as soon as possible.');
    await page.click('button:has-text("Send Email")');
    
    // Verify reminder sent
    await expect(page.locator('text=Reminder sent successfully')).toBeVisible();
    await expect(page.locator('text=Last reminder sent:')).toBeVisible();
  });
});

test.describe('Reports and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token');
    await page.click('a:has-text("Reports")');
  });

  test('should display onboarding analytics', async ({ page }) => {
    await expect(page).toHaveURL('/manager/reports');
    await expect(page.locator('h2')).toContainText('Reports & Analytics');
    
    // Check report filters
    await expect(page.locator('select[name="reportType"]')).toBeVisible();
    await expect(page.locator('input[name="dateFrom"]')).toBeVisible();
    await expect(page.locator('input[name="dateTo"]')).toBeVisible();
    
    // Check default analytics
    await expect(page.locator('[data-testid="completion-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-to-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="training-scores"]')).toBeVisible();
  });

  test('should generate custom report', async ({ page }) => {
    // Select report type
    await page.selectOption('select[name="reportType"]', 'training_completion');
    
    // Set date range
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    await page.fill('input[name="dateFrom"]', lastMonth.toISOString().split('T')[0]);
    await page.fill('input[name="dateTo"]', today.toISOString().split('T')[0]);
    
    // Generate report
    await page.click('button:has-text("Generate Report")');
    
    // Check report content
    await expect(page.locator('h3')).toContainText('Training Completion Report');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Average completion rate:')).toBeVisible();
    
    // Export options
    await expect(page.locator('button:has-text("Export PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('should display compliance dashboard', async ({ page }) => {
    await page.click('button:has-text("Compliance")');
    
    // Check compliance overview
    await expect(page.locator('h3')).toContainText('Compliance Overview');
    await expect(page.locator('[data-testid="compliance-score"]')).toBeVisible();
    
    // Check expiring documents
    await expect(page.locator('h4')).toContainText('Expiring Documents');
    await expect(page.locator('text=Medical Certificate - Jane Smith')).toBeVisible();
    await expect(page.locator('text=Expires in 30 days')).toBeVisible();
    
    // Check overdue training
    await expect(page.locator('h4')).toContainText('Overdue Training');
    await expect(page.locator('text=Bob Johnson - Not started')).toBeVisible();
  });
});

test.describe('Training Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token');
    await page.click('a:has-text("Training")');
  });

  test('should view training catalog', async ({ page }) => {
    await expect(page).toHaveURL('/manager/training');
    await expect(page.locator('h2')).toContainText('Training Management');
    
    // Check training modules
    await expect(page.locator('[data-testid="training-grid"]')).toBeVisible();
    await expect(page.locator('text=Safety Training')).toBeVisible();
    await expect(page.locator('text=Security Awareness')).toBeVisible();
    await expect(page.locator('text=Environmental Protection')).toBeVisible();
    
    // Check module details
    await page.click('[data-testid="safety-training-card"]');
    await expect(page.locator('text=Duration: 2 hours')).toBeVisible();
    await expect(page.locator('text=Passing Score: 70%')).toBeVisible();
    await expect(page.locator('text=Completion Rate: 85%')).toBeVisible();
  });

  test('should assign training to crew', async ({ page }) => {
    await page.click('[data-testid="safety-training-card"]');
    await page.click('button:has-text("Assign Training")');
    
    // Select crew members
    await expect(page.locator('h3')).toContainText('Assign Training');
    await page.check('input[value="crew3"]'); // Bob Johnson
    await page.fill('input[name="dueDate"]', '2024-03-01');
    await page.click('button:has-text("Assign to Selected")');
    
    // Verify assignment
    await expect(page.locator('text=Training assigned successfully')).toBeVisible();
    await expect(page.locator('text=1 crew member(s) assigned')).toBeVisible();
  });

  test('should customize training content if permitted', async ({ page }) => {
    // Assuming manager has edit_training permission
    await page.click('[data-testid="safety-training-card"]');
    await page.click('button:has-text("Edit Content")');
    
    // Check editor
    await expect(page.locator('h3')).toContainText('Edit Training Content');
    await expect(page.locator('[data-testid="content-editor"]')).toBeVisible();
    
    // Make changes
    await page.fill('input[name="moduleTitle"]', 'Updated Safety Training');
    await page.fill('textarea[name="moduleDescription"]', 'Updated description for safety training module.');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Training content updated')).toBeVisible();
  });
});

test.describe('Communication Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token');
  });

  test('should send bulk communications', async ({ page }) => {
    await page.click('button:has-text("Send Message")');
    
    // Compose message
    await expect(page.locator('h3')).toContainText('Send Message');
    await page.selectOption('select[name="recipientType"]', 'all_crew');
    await page.fill('input[name="subject"]', 'Important: Updated Safety Procedures');
    await page.fill('textarea[name="message"]', 'Please review the updated safety procedures before your next voyage.');
    
    // Add attachment
    await page.click('button:has-text("Add Attachment")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'safety-procedures.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    
    // Send message
    await page.click('button:has-text("Send to All Crew")');
    await expect(page.locator('text=Message sent to 3 recipients')).toBeVisible();
  });

  test('should manage notifications', async ({ page }) => {
    await page.click('button[aria-label="Notifications"]');
    
    // Check notification panel
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
    await expect(page.locator('text=Jane Smith completed Safety Training')).toBeVisible();
    await expect(page.locator('text=Bob Johnson - Onboarding overdue')).toBeVisible();
    
    // Mark as read
    await page.click('button:has-text("Mark all as read")');
    await expect(page.locator('[data-testid="unread-count"]')).toHaveText('0');
  });
});

test.describe('Settings and Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token');
    await page.click('a:has-text("Settings")');
  });

  test('should display manager profile and permissions', async ({ page }) => {
    await expect(page).toHaveURL('/manager/settings');
    
    // Check profile section
    await expect(page.locator('h3')).toContainText('Profile');
    await expect(page.locator('input[name="name"]')).toHaveValue(testManager.name);
    await expect(page.locator('input[name="email"]')).toHaveValue(testManager.email);
    
    // Check permissions
    await page.click('button:has-text("Permissions")');
    await expect(page.locator('h3')).toContainText('Your Permissions');
    
    for (const permission of testManager.permissions) {
      await expect(page.locator(`text=${permission}`)).toBeVisible();
      await expect(page.locator(`[data-testid="${permission}-enabled"]`)).toBeVisible();
    }
  });

  test('should update notification preferences', async ({ page }) => {
    await page.click('button:has-text("Notifications")');
    
    // Check notification settings
    await expect(page.locator('h3')).toContainText('Notification Preferences');
    
    // Toggle settings
    await page.uncheck('input[name="emailOnCrewCompletion"]');
    await page.check('input[name="emailDailyDigest"]');
    await page.selectOption('select[name="digestTime"]', '09:00');
    
    // Save preferences
    await page.click('button:has-text("Save Preferences")');
    await expect(page.locator('text=Preferences updated')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/manager/dashboard?token=test-manager-token');
    
    // Check mobile menu
    await page.click('button[aria-label="Menu"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Navigate to crew management
    await page.click('a:has-text("Crew Management")');
    
    // Check mobile layout
    await expect(page.locator('[data-testid="crew-cards"]')).toBeVisible();
    
    // Should show cards instead of table on mobile
    const crewCard = page.locator('[data-testid="crew-card"]').first();
    await expect(crewCard).toBeVisible();
    await expect(crewCard.locator('text=John Doe')).toBeVisible();
    await expect(crewCard.locator('text=Deck Officer')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/manager/dashboard?token=test-manager-token');
    await page.click('a:has-text("Crew Management")');
    
    // Should show error message
    await expect(page.locator('text=Unable to load crew data')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should handle permission errors', async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token-limited');
    
    // Try to access training management without permission
    await page.goto('/manager/training');
    
    // Should show permission error
    await expect(page.locator('text=You do not have permission')).toBeVisible();
    await expect(page.locator('text=edit_training permission required')).toBeVisible();
  });
});