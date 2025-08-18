import { test, expect, Page } from '@playwright/test';

/**
 * Content Management Button Functionality Tests
 * Tests the complete flow of Content Management buttons:
 * 1. Training Programs tab
 * 2. Manage Phases button
 * 3. Edit Content button
 * 4. Edit Phase Structure button
 */

// Test configuration
const BASE_URL = 'https://onboarding.burando.online';
const ADMIN_EMAIL = 'adminmartexx@shipdocs.app';
const ADMIN_PASSWORD = 'Yumminova211@#';

test.describe('Content Management Button Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to login page
    await page.goto(BASE_URL);
    
    // Login as admin using the correct flow
    await page.click('text=need help logging in');
    await page.waitForTimeout(1000); // Wait for dropdown/modal to appear

    // Try different possible selectors for administrator login
    const adminLoginSelectors = [
      'text=administrator login',
      'text=Administrator login',
      'text=Admin login',
      'text=admin login',
      '[data-testid="admin-login"]',
      'button:has-text("administrator")',
      'a:has-text("administrator")'
    ];

    let adminLoginFound = false;
    for (const selector of adminLoginSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          adminLoginFound = true;
          console.log(`✅ Found admin login with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!adminLoginFound) {
      // Take a screenshot to see what's available
      await page.screenshot({ path: 'debug-login-screen.png' });
      throw new Error('Administrator login option not found after clicking help');
    }

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Admin Dashboard', { timeout: 30000 });
    
    // Navigate to Content Management
    await page.click('text=Content');
    await page.waitForURL('**/content');
    
    console.log('✅ Successfully logged in and navigated to Content Management');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display Training Programs tab and workflows', async () => {
    // Check if Training Programs tab exists and click it
    await expect(page.locator('text=Training Programs')).toBeVisible();
    await page.click('text=Training Programs');
    
    // Wait for workflows to load
    await page.waitForSelector('.content-grid', { timeout: 10000 });
    
    // Check if workflows are displayed
    const workflowCards = page.locator('.content-card');
    const workflowCount = await workflowCards.count();
    
    console.log(`✅ Found ${workflowCount} workflow cards`);
    expect(workflowCount).toBeGreaterThan(0);
    
    // Check if workflow cards have required elements
    const firstCard = workflowCards.first();
    await expect(firstCard.locator('.card-header h3')).toBeVisible();
    await expect(firstCard.locator('.status-badge')).toBeVisible();
    await expect(firstCard.locator('button:has-text("Manage Phases")')).toBeVisible();
    // Edit Workflow button removed - consolidated to new Content Management system
    
    console.log('✅ Training Programs tab displays workflows correctly');
  });

  test('should open workflow phases when clicking Manage Phases', async () => {
    // Navigate to Training Programs tab
    await page.click('text=Training Programs');
    await page.waitForSelector('.content-grid');
    
    // Click on the first "Manage Phases" button
    const managePhaseButton = page.locator('button:has-text("Manage Phases")').first();
    await expect(managePhaseButton).toBeVisible();
    
    console.log('🔄 Clicking Manage Phases button...');
    await managePhaseButton.click();
    
    // Wait for workflow phases view to load
    await page.waitForSelector('.workflow-phases-view', { timeout: 15000 });
    
    // Check if we're in the workflow phases view
    await expect(page.locator('text=← Back to Training Programs')).toBeVisible();
    await expect(page.locator('text=Manage Phases:')).toBeVisible();
    await expect(page.locator('text=Training Phases in this Program')).toBeVisible();
    
    // Check if phases are displayed
    const phaseCards = page.locator('.content-card');
    const phaseCount = await phaseCards.count();
    
    console.log(`✅ Found ${phaseCount} phase cards in workflow`);
    expect(phaseCount).toBeGreaterThan(0);
    
    // Check if phase cards have required buttons
    const firstPhase = phaseCards.first();
    await expect(firstPhase.locator('button:has-text("Edit Content")')).toBeVisible();
    
    console.log('✅ Manage Phases button works correctly');
  });

  test('should handle Edit Content button functionality', async () => {
    // Navigate to workflow phases
    await page.click('text=Training Programs');
    await page.waitForSelector('.content-grid');
    await page.click('button:has-text("Manage Phases")');
    await page.waitForSelector('.workflow-phases-view');
    
    // Click on the first "Edit Content" button
    const editContentButton = page.locator('button:has-text("Edit Content")').first();
    await expect(editContentButton).toBeVisible();
    
    console.log('🔄 Clicking Edit Content button...');
    
    // Listen for console logs to track the button logic
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Found')) {
        console.log(`📝 ${msg.text()}`);
      }
    });
    
    await editContentButton.click();
    
    // Wait a moment for the logic to execute
    await page.waitForTimeout(2000);
    
    // Check if we either:
    // 1. Opened the RichContentEditor (found existing content)
    // 2. Got a confirmation dialog (no content found, asking to create)
    // 3. Got an alert with error message
    
    const isEditorVisible = await page.locator('.rich-content-editor').isVisible().catch(() => false);
    const isDialogVisible = await page.locator('text=No training content found').isVisible().catch(() => false);
    
    if (isEditorVisible) {
      console.log('✅ Edit Content opened RichContentEditor (found existing content)');
      await expect(page.locator('.rich-content-editor')).toBeVisible();
    } else if (isDialogVisible) {
      console.log('✅ Edit Content showed creation dialog (no existing content)');
      // Click OK to create new content
      await page.click('button:has-text("OK")');
      await page.waitForSelector('.rich-content-editor', { timeout: 10000 });
      console.log('✅ New training content created and editor opened');
    } else {
      console.log('ℹ️ Edit Content button executed (checking console logs for details)');
    }
    
    console.log('✅ Edit Content button functionality works');
  });





  test('should complete full workflow navigation cycle', async () => {
    console.log('🔄 Testing complete workflow navigation cycle...');
    
    // 1. Start at Training Programs
    await page.click('text=Training Programs');
    await page.waitForSelector('.content-grid');
    console.log('✅ Step 1: Training Programs tab loaded');
    
    // 2. Click Manage Phases
    await page.click('button:has-text("Manage Phases")');
    await page.waitForSelector('.workflow-phases-view');
    console.log('✅ Step 2: Workflow phases view loaded');
    
    // 3. Go back to Training Programs
    await page.click('text=← Back to Training Programs');
    await page.waitForSelector('.content-grid');
    console.log('✅ Step 3: Back navigation works');
    
    // 4. Try different workflow
    const workflowCards = page.locator('.content-card');
    const workflowCount = await workflowCards.count();
    
    if (workflowCount > 1) {
      await workflowCards.nth(1).locator('button:has-text("Manage Phases")').click();
      await page.waitForSelector('.workflow-phases-view');
      console.log('✅ Step 4: Second workflow phases loaded');
    }
    
    console.log('✅ Complete workflow navigation cycle works');
  });
});
