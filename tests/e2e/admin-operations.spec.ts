/**
 * Admin Operations E2E Tests
 * Tests complete admin functionality including system management, user administration, and security controls
 */

import { test, expect } from '@playwright/test';

// Test data
const testAdmin = {
  email: 'admin@maritime-system.com',
  password: 'SuperSecureAdminPass123!',
  name: 'System Administrator',
  twoFactorEnabled: true
};

const testCompanies = [
  {
    name: 'Global Shipping Corp',
    email: 'contact@globalshipping.com',
    managers: 3,
    crew: 45,
    status: 'active'
  },
  {
    name: 'Pacific Maritime Ltd',
    email: 'info@pacificmaritime.com',
    managers: 2,
    crew: 28,
    status: 'active'
  },
  {
    name: 'Atlantic Freight Services',
    email: 'admin@atlanticfreight.com',
    managers: 1,
    crew: 12,
    status: 'suspended'
  }
];

test.describe('Admin Authentication', () => {
  test('should require strong authentication for admin access', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check security notice
    await expect(page.locator('text=Administrative Access')).toBeVisible();
    await expect(page.locator('text=This area is restricted')).toBeVisible();
    
    // Enter credentials
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button:has-text("Sign In")');
    
    // Should require 2FA
    await expect(page.locator('h2')).toContainText('Two-Factor Authentication');
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible();
    
    // Enter 2FA code
    await page.fill('input[name="2fa-code"]', '123456');
    await page.click('button:has-text("Verify")');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should enforce password complexity for admin accounts', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Try weak password
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', 'weak123');
    await page.click('button:has-text("Sign In")');
    
    // Should show error
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should lock account after failed attempts', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Make multiple failed attempts
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', testAdmin.email);
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(500);
    }
    
    // Account should be locked
    await expect(page.locator('text=Account temporarily locked')).toBeVisible();
    await expect(page.locator('text=Too many failed attempts')).toBeVisible();
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/dashboard?token=test-admin-token');
  });

  test('should display system overview', async ({ page }) => {
    // Check dashboard metrics
    await expect(page.locator('h1')).toContainText('System Administration');
    
    // System health indicators
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Operational');
    await expect(page.locator('[data-testid="api-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="database-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-service-health"]')).toBeVisible();
    
    // Usage statistics
    await expect(page.locator('[data-testid="total-companies"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-usage"]')).toBeVisible();
  });

  test('should display recent activity log', async ({ page }) => {
    // Check activity feed
    await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
    await expect(page.locator('text=Recent System Activity')).toBeVisible();
    
    // Should show various activities
    await expect(page.locator('text=New company registered')).toBeVisible();
    await expect(page.locator('text=Manager account created')).toBeVisible();
    await expect(page.locator('text=System backup completed')).toBeVisible();
  });

  test('should show system alerts and warnings', async ({ page }) => {
    // Check alerts section
    await expect(page.locator('[data-testid="system-alerts"]')).toBeVisible();
    
    // Example alerts
    await expect(page.locator('text=High API usage detected')).toBeVisible();
    await expect(page.locator('text=SSL certificate expires in 30 days')).toBeVisible();
    
    // Dismiss alert
    await page.click('button[aria-label="Dismiss alert"]', { hasText: 'High API usage' });
    await expect(page.locator('text=High API usage detected')).not.toBeVisible();
  });
});

test.describe('Company Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.click('a:has-text("Companies")');
  });

  test('should list all companies with details', async ({ page }) => {
    await expect(page).toHaveURL('/admin/companies');
    await expect(page.locator('h2')).toContainText('Company Management');
    
    // Check company list
    for (const company of testCompanies) {
      const row = page.locator(`tr:has-text("${company.name}")`);
      await expect(row).toBeVisible();
      await expect(row.locator(`text=${company.managers} managers`)).toBeVisible();
      await expect(row.locator(`text=${company.crew} crew`)).toBeVisible();
      await expect(row.locator(`[data-status="${company.status}"]`)).toBeVisible();
    }
  });

  test('should add new company', async ({ page }) => {
    await page.click('button:has-text("Add New Company")');
    
    // Fill company form
    await page.fill('input[name="companyName"]', 'New Shipping Company');
    await page.fill('input[name="registrationNumber"]', 'REG-2024-001');
    await page.fill('input[name="contactEmail"]', 'contact@newshipping.com');
    await page.fill('input[name="contactPhone"]', '+1234567890');
    await page.fill('textarea[name="address"]', '123 Maritime Way, Port City');
    
    // Set subscription plan
    await page.selectOption('select[name="subscriptionPlan"]', 'enterprise');
    await page.fill('input[name="maxUsers"]', '100');
    
    // Submit
    await page.click('button:has-text("Create Company")');
    
    // Verify creation
    await expect(page.locator('text=Company created successfully')).toBeVisible();
    await expect(page.locator('text=New Shipping Company')).toBeVisible();
  });

  test('should edit company details', async ({ page }) => {
    // Click on company
    await page.click('text=Global Shipping Corp');
    
    // Edit details
    await page.click('button:has-text("Edit Company")');
    await page.fill('input[name="maxUsers"]', '60');
    await page.selectOption('select[name="status"]', 'active');
    await page.click('button:has-text("Save Changes")');
    
    // Verify update
    await expect(page.locator('text=Company updated successfully')).toBeVisible();
  });

  test('should suspend/activate company', async ({ page }) => {
    // Find active company
    const activeCompany = page.locator('tr:has-text("Pacific Maritime Ltd")');
    await activeCompany.locator('button:has-text("Actions")').click();
    await page.click('button:has-text("Suspend Company")');
    
    // Confirm suspension
    await expect(page.locator('text=Suspend Company?')).toBeVisible();
    await page.fill('textarea[name="reason"]', 'Non-payment of subscription');
    await page.click('button:has-text("Confirm Suspension")');
    
    // Verify suspension
    await expect(page.locator('text=Company suspended')).toBeVisible();
    await expect(activeCompany.locator('[data-status="suspended"]')).toBeVisible();
  });

  test('should view company audit trail', async ({ page }) => {
    await page.click('text=Global Shipping Corp');
    await page.click('button:has-text("Audit Trail")');
    
    // Check audit log
    await expect(page.locator('h3')).toContainText('Company Activity Log');
    await expect(page.locator('text=Company created')).toBeVisible();
    await expect(page.locator('text=Manager added')).toBeVisible();
    await expect(page.locator('text=Subscription updated')).toBeVisible();
    
    // Filter by date
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("Apply Filter")');
  });
});

test.describe('User Administration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.click('a:has-text("Users")');
  });

  test('should list all system users', async ({ page }) => {
    await expect(page).toHaveURL('/admin/users');
    
    // Check user filters
    await expect(page.locator('select[name="roleFilter"]')).toBeVisible();
    await expect(page.locator('select[name="statusFilter"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Search users..."]')).toBeVisible();
    
    // Filter by role
    await page.selectOption('select[name="roleFilter"]', 'manager');
    await expect(page.locator('tbody tr')).toHaveCount(6); // Total managers from test data
  });

  test('should create manager account', async ({ page }) => {
    await page.click('button:has-text("Add User")');
    await page.selectOption('select[name="userType"]', 'manager');
    
    // Fill manager details
    await page.fill('input[name="firstName"]', 'New');
    await page.fill('input[name="lastName"]', 'Manager');
    await page.fill('input[name="email"]', 'new.manager@company.com');
    await page.selectOption('select[name="company"]', 'Global Shipping Corp');
    
    // Set permissions
    await page.check('input[name="permission_manage_crew"]');
    await page.check('input[name="permission_view_reports"]');
    await page.uncheck('input[name="permission_edit_training"]');
    
    // Create account
    await page.click('button:has-text("Create Manager Account")');
    
    // Verify creation
    await expect(page.locator('text=Manager account created')).toBeVisible();
    await expect(page.locator('text=Login credentials sent to email')).toBeVisible();
  });

  test('should reset user password', async ({ page }) => {
    // Find user
    await page.fill('input[placeholder="Search users..."]', 'john.doe');
    await page.click('tr:has-text("john.doe@company.com")');
    
    // Reset password
    await page.click('button:has-text("Reset Password")');
    await expect(page.locator('text=Reset Password?')).toBeVisible();
    await page.click('button:has-text("Send Reset Link")');
    
    // Verify
    await expect(page.locator('text=Password reset link sent')).toBeVisible();
  });

  test('should manage user permissions', async ({ page }) => {
    // Find manager
    await page.selectOption('select[name="roleFilter"]', 'manager');
    await page.click('tr:has-text("manager@globalshipping.com")');
    
    // Edit permissions
    await page.click('button:has-text("Edit Permissions")');
    await page.check('input[name="permission_edit_training"]');
    await page.uncheck('input[name="permission_delete_crew"]');
    await page.click('button:has-text("Update Permissions")');
    
    // Verify
    await expect(page.locator('text=Permissions updated')).toBeVisible();
  });

  test('should view user activity', async ({ page }) => {
    await page.click('tr:has-text("crew.member@company.com")');
    await page.click('button:has-text("Activity Log")');
    
    // Check activity
    await expect(page.locator('h3')).toContainText('User Activity');
    await expect(page.locator('text=Login from')).toBeVisible();
    await expect(page.locator('text=Training completed')).toBeVisible();
    await expect(page.locator('text=Document uploaded')).toBeVisible();
  });
});

test.describe('System Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.click('a:has-text("Settings")');
  });

  test('should configure email settings', async ({ page }) => {
    await page.click('button:has-text("Email Configuration")');
    
    // Check current settings
    await expect(page.locator('input[name="smtpHost"]')).toHaveValue('smtp.mailservice.com');
    await expect(page.locator('input[name="smtpPort"]')).toHaveValue('587');
    
    // Update settings
    await page.fill('input[name="fromEmail"]', 'noreply@maritime-system.com');
    await page.fill('input[name="fromName"]', 'Maritime Onboarding System');
    
    // Test configuration
    await page.click('button:has-text("Test Configuration")');
    await page.fill('input[name="testEmail"]', 'test@example.com');
    await page.click('button:has-text("Send Test Email")');
    
    await expect(page.locator('text=Test email sent successfully')).toBeVisible();
  });

  test('should manage API keys', async ({ page }) => {
    await page.click('button:has-text("API Management")');
    
    // View existing keys
    await expect(page.locator('text=Production API Key')).toBeVisible();
    await expect(page.locator('text=Development API Key')).toBeVisible();
    
    // Generate new key
    await page.click('button:has-text("Generate New Key")');
    await page.fill('input[name="keyName"]', 'Integration Testing');
    await page.selectOption('select[name="keyPermissions"]', 'read_only');
    await page.click('button:has-text("Generate")');
    
    // Copy key
    await expect(page.locator('[data-testid="new-api-key"]')).toBeVisible();
    await page.click('button:has-text("Copy Key")');
    await expect(page.locator('text=Key copied to clipboard')).toBeVisible();
  });

  test('should configure security settings', async ({ page }) => {
    await page.click('button:has-text("Security Settings")');
    
    // Password policy
    await page.fill('input[name="minPasswordLength"]', '14');
    await page.check('input[name="requireSpecialChars"]');
    await page.check('input[name="requirePasswordHistory"]');
    await page.fill('input[name="passwordHistoryCount"]', '5');
    
    // Session settings
    await page.fill('input[name="sessionTimeout"]', '30');
    await page.check('input[name="requireMFA"]');
    
    // IP restrictions
    await page.click('button:has-text("Add IP Whitelist")');
    await page.fill('input[name="ipAddress"]', '192.168.1.0/24');
    await page.fill('input[name="description"]', 'Office Network');
    await page.click('button:has-text("Add")');
    
    // Save all settings
    await page.click('button:has-text("Save Security Settings")');
    await expect(page.locator('text=Security settings updated')).toBeVisible();
  });

  test('should configure rate limiting', async ({ page }) => {
    await page.click('button:has-text("Rate Limiting")');
    
    // API rate limits
    await page.fill('input[name="apiRateLimit"]', '1000');
    await page.fill('input[name="apiRateWindow"]', '3600');
    
    // Auth rate limits
    await page.fill('input[name="authRateLimit"]', '5');
    await page.fill('input[name="authRateWindow"]', '900');
    
    // Save
    await page.click('button:has-text("Update Rate Limits")');
    await expect(page.locator('text=Rate limits updated')).toBeVisible();
  });
});

test.describe('Monitoring and Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.click('a:has-text("Monitoring")');
  });

  test('should view system logs', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('System Monitoring');
    
    // Log filters
    await page.selectOption('select[name="logLevel"]', 'error');
    await page.selectOption('select[name="logSource"]', 'api');
    await page.click('button:has-text("Apply Filters")');
    
    // Check log entries
    await expect(page.locator('[data-testid="log-entries"]')).toBeVisible();
    await expect(page.locator('text=ERROR')).toBeVisible();
    
    // View log details
    await page.click('[data-testid="log-entry"]', { index: 0 });
    await expect(page.locator('text=Stack Trace')).toBeVisible();
    await expect(page.locator('text=Request ID')).toBeVisible();
  });

  test('should view audit logs', async ({ page }) => {
    await page.click('button:has-text("Audit Logs")');
    
    // Filter by action type
    await page.selectOption('select[name="actionType"]', 'user_login');
    await page.click('button:has-text("Search")');
    
    // Check results
    await expect(page.locator('text=User Login')).toBeVisible();
    await expect(page.locator('text=IP Address')).toBeVisible();
    await expect(page.locator('text=User Agent')).toBeVisible();
  });

  test('should monitor API usage', async ({ page }) => {
    await page.click('button:has-text("API Usage")');
    
    // Check usage charts
    await expect(page.locator('[data-testid="api-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="endpoint-breakdown"]')).toBeVisible();
    
    // Check top consumers
    await expect(page.locator('text=Top API Consumers')).toBeVisible();
    await expect(page.locator('text=Global Shipping Corp')).toBeVisible();
    await expect(page.locator('text=1,234 requests')).toBeVisible();
  });

  test('should export logs', async ({ page }) => {
    // Set date range
    await page.fill('input[name="exportStartDate"]', '2024-01-01');
    await page.fill('input[name="exportEndDate"]', '2024-01-31');
    
    // Select log types
    await page.check('input[name="includeSystemLogs"]');
    await page.check('input[name="includeAuditLogs"]');
    await page.check('input[name="includeAPILogs"]');
    
    // Export
    await page.click('button:has-text("Export Logs")');
    
    // Should start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download CSV")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('logs-export');
  });
});

test.describe('Database Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.click('a:has-text("Database")');
  });

  test('should view database statistics', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Database Management');
    
    // Check stats
    await expect(page.locator('[data-testid="db-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-pool"]')).toBeVisible();
    
    // Table sizes
    await expect(page.locator('text=users')).toBeVisible();
    await expect(page.locator('text=training_progress')).toBeVisible();
    await expect(page.locator('text=audit_log')).toBeVisible();
  });

  test('should perform database backup', async ({ page }) => {
    await page.click('button:has-text("Backup")');
    
    // Configure backup
    await page.selectOption('select[name="backupType"]', 'full');
    await page.check('input[name="compressBackup"]');
    await page.check('input[name="encryptBackup"]');
    await page.fill('input[name="backupDescription"]', 'Monthly backup - January 2024');
    
    // Start backup
    await page.click('button:has-text("Start Backup")');
    
    // Monitor progress
    await expect(page.locator('[data-testid="backup-progress"]')).toBeVisible();
    await expect(page.locator('text=Backup completed')).toBeVisible({ timeout: 30000 });
  });

  test('should schedule automatic backups', async ({ page }) => {
    await page.click('button:has-text("Schedule")');
    
    // Configure schedule
    await page.selectOption('select[name="frequency"]', 'daily');
    await page.fill('input[name="time"]', '02:00');
    await page.selectOption('select[name="retention"]', '30');
    await page.check('input[name="notifyOnComplete"]');
    
    // Save schedule
    await page.click('button:has-text("Save Schedule")');
    await expect(page.locator('text=Backup schedule updated')).toBeVisible();
  });
});

test.describe('Emergency Procedures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
  });

  test('should activate maintenance mode', async ({ page }) => {
    await page.click('button:has-text("Emergency")');
    await page.click('button:has-text("Maintenance Mode")');
    
    // Configure maintenance
    await page.fill('textarea[name="maintenanceMessage"]', 'System maintenance in progress. We\'ll be back shortly.');
    await page.fill('input[name="estimatedDuration"]', '60');
    await page.check('input[name="allowAdminAccess"]');
    
    // Activate
    await page.click('button:has-text("Activate Maintenance Mode")');
    
    // Confirm
    await expect(page.locator('text=Are you sure?')).toBeVisible();
    await page.click('button:has-text("Confirm")');
    
    // Verify activation
    await expect(page.locator('[data-testid="maintenance-banner"]')).toBeVisible();
    await expect(page.locator('text=Maintenance mode active')).toBeVisible();
  });

  test('should handle security incident', async ({ page }) => {
    await page.click('button:has-text("Emergency")');
    await page.click('button:has-text("Security Incident")');
    
    // Report incident
    await page.selectOption('select[name="incidentType"]', 'unauthorized_access');
    await page.fill('textarea[name="description"]', 'Suspicious login attempts detected from multiple IPs');
    await page.selectOption('select[name="severity"]', 'high');
    
    // Immediate actions
    await page.check('input[name="forceLogoutAll"]');
    await page.check('input[name="disableExternalAccess"]');
    await page.check('input[name="notifyAdmins"]');
    
    // Execute
    await page.click('button:has-text("Execute Security Response")');
    
    // Verify actions
    await expect(page.locator('text=Security response activated')).toBeVisible();
    await expect(page.locator('text=All users logged out')).toBeVisible();
    await expect(page.locator('text=External access disabled')).toBeVisible();
  });
});

test.describe('Multi-language Support', () => {
  test('should support multiple languages in admin interface', async ({ page }) => {
    await page.goto('/admin/dashboard?token=test-admin-token');
    
    // Change language
    await page.click('button[aria-label="Language"]');
    await page.click('button:has-text("Español")');
    
    // Verify Spanish interface
    await expect(page.locator('h1')).toContainText('Administración del Sistema');
    await expect(page.locator('a')).toContainText('Empresas');
    await expect(page.locator('a')).toContainText('Usuarios');
    
    // Change back to English
    await page.click('button[aria-label="Idioma"]');
    await page.click('button:has-text("English")');
  });
});

test.describe('Performance and Optimization', () => {
  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/admin/dashboard?token=test-admin-token');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/admin/users?token=test-admin-token');
    
    // Load page with many users
    await page.selectOption('select[name="pageSize"]', '100');
    
    // Should show pagination
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    await expect(page.locator('text=1-100 of 500')).toBeVisible();
    
    // Navigate pages quickly
    await page.click('button[aria-label="Next page"]');
    await expect(page.locator('text=101-200 of 500')).toBeVisible();
  });
});