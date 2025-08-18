#!/usr/bin/env node

/**
 * Specific Button Testing Script - Edit Content & Edit Phase Structure
 * 
 * This script specifically tests the two buttons that were reported as not working:
 * 1. Edit Content button
 * 2. Edit Phase Structure button
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://onboarding.burando.online';
const ADMIN_EMAIL = 'adminmartexx@shipdocs.app';
const ADMIN_PASSWORD = 'Yumminova211@#';

async function testSpecificButtons() {
  console.log('🎯 SPECIFIC BUTTON TESTING: Edit Content & Edit Phase Structure');
  console.log('================================================================\n');

  const browser = await chromium.launch({ 
    headless: false, // Show browser for visual verification
    slowMo: 2000 // Slow down for better observation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate and Login
    console.log('📍 Step 1: Navigating to application and logging in...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Admin login flow
    await page.click('text=need help logging in');
    await page.waitForTimeout(1000);
    
    const adminLoginSelectors = [
      'button:has-text("administrator")',
      'text=administrator login',
      'text=Administrator login',
      'a:has-text("administrator")'
    ];
    
    let loginSuccess = false;
    for (const selector of adminLoginSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          console.log(`✅ Found admin login with: ${selector}`);
          loginSuccess = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!loginSuccess) {
      throw new Error('Could not find admin login option');
    }

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Admin Dashboard', { timeout: 30000 });
    console.log('✅ Successfully logged in as admin');

    // Step 2: Navigate to Content Management
    console.log('\n📋 Step 2: Navigating to Content Management...');
    await page.click('text=Content');
    await page.waitForURL('**/content', { timeout: 15000 });
    console.log('✅ Successfully navigated to Content Management');

    // Step 3: Navigate to Training Programs and Manage Phases
    console.log('\n🏗️ Step 3: Navigating to Training Programs and Manage Phases...');
    await page.click('button:has-text("Training Programs")');
    await page.waitForSelector('.content-grid', { timeout: 10000 });
    console.log('✅ Training Programs tab loaded');

    // Click on the specific workflow mentioned: "Onboarding new managers to this app"
    const targetWorkflow = page.locator('.content-card').filter({ hasText: 'Onboarding new managers to this app' });
    if (await targetWorkflow.isVisible({ timeout: 5000 })) {
      await targetWorkflow.locator('button:has-text("Manage Phases")').click();
      console.log('✅ Clicked Manage Phases for "Onboarding new managers to this app"');
    } else {
      // Fallback to first workflow
      await page.locator('button:has-text("Manage Phases")').first().click();
      console.log('✅ Clicked Manage Phases for first available workflow');
    }

    await page.waitForSelector('.workflow-phases-view', { timeout: 10000 });
    console.log('✅ Workflow phases view loaded');

    // Verify we're in the right place
    const pageTitle = await page.locator('text=Manage Phases:').textContent();
    console.log(`📍 Current page: ${pageTitle}`);

    // Step 4: Test Edit Content Button
    console.log('\n📝 Step 4: TESTING EDIT CONTENT BUTTON...');
    console.log('================================================');
    
    const editContentBtn = page.locator('button:has-text("Edit Content")').first();
    const isEditContentVisible = await editContentBtn.isVisible({ timeout: 5000 });
    if (!isEditContentVisible) {
      throw new Error('Edit Content button not visible');
    }
    console.log('✅ Edit Content button is visible');

    // Listen for console logs to track the button logic
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
        console.log(`📝 Console: ${msg.text()}`);
      }
    });

    // Click Edit Content button
    console.log('🔄 Clicking Edit Content button...');
    await editContentBtn.click();
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Check for various outcomes
    const outcomes = {
      richEditor: await page.locator('.rich-content-editor').isVisible().catch(() => false),
      confirmDialog: await page.locator('text=No training content found').isVisible().catch(() => false),
      trainingPhaseTab: await page.locator('text=Training Phases').isVisible().catch(() => false),
      errorAlert: await page.locator('[role="alert"]').isVisible().catch(() => false)
    };

    console.log('\n📊 Edit Content Button Results:');
    console.log('================================');
    if (outcomes.richEditor) {
      console.log('✅ SUCCESS: RichContentEditor opened (found existing content)');
    } else if (outcomes.confirmDialog) {
      console.log('✅ SUCCESS: Creation dialog appeared (no existing content)');
      // Click OK to create new content
      await page.click('button:has-text("OK")');
      await page.waitForTimeout(2000);
      const editorAfterCreate = await page.locator('.rich-content-editor').isVisible().catch(() => false);
      if (editorAfterCreate) {
        console.log('✅ SUCCESS: New content created and editor opened');
      }
    } else if (outcomes.trainingPhaseTab) {
      console.log('✅ SUCCESS: Navigated to Training Phases tab (content management)');
    } else {
      console.log('⚠️ UNCLEAR: Button executed but outcome unclear');
      console.log('📝 Console logs captured:', consoleLogs.slice(-5));
    }

    // Step 5: Navigate back to test Edit Phase Structure
    console.log('\n🔄 Step 5: Navigating back to test Edit Phase Structure...');
    
    // Try to go back to workflow phases view
    const backButton = page.locator('text=← Back to Training Programs');
    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click();
      await page.waitForSelector('.content-grid', { timeout: 10000 });
      
      // Navigate back to the same workflow
      if (await targetWorkflow.isVisible({ timeout: 5000 })) {
        await targetWorkflow.locator('button:has-text("Manage Phases")').click();
      } else {
        await page.locator('button:has-text("Manage Phases")').first().click();
      }
      await page.waitForSelector('.workflow-phases-view', { timeout: 10000 });
      console.log('✅ Back to workflow phases view');
    } else {
      // Alternative navigation
      await page.goto(`${BASE_URL}/content`);
      await page.click('button:has-text("Training Programs")');
      await page.waitForSelector('.content-grid');
      await page.locator('button:has-text("Manage Phases")').first().click();
      await page.waitForSelector('.workflow-phases-view');
      console.log('✅ Navigated back via alternative route');
    }

    // Step 6: Test Edit Phase Structure Button
    console.log('\n🏗️ Step 6: TESTING EDIT PHASE STRUCTURE BUTTON...');
    console.log('===================================================');
    
    const editStructureBtn = page.locator('button:has-text("Edit Phase Structure")').first();
    const isEditStructureVisible = await editStructureBtn.isVisible({ timeout: 5000 });
    if (!isEditStructureVisible) {
      throw new Error('Edit Phase Structure button not visible');
    }
    console.log('✅ Edit Phase Structure button is visible');

    // Get current URL before clicking
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Click Edit Phase Structure button
    console.log('🔄 Clicking Edit Phase Structure button...');
    await editStructureBtn.click();
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Check the new URL
    const newUrl = page.url();
    console.log(`📍 New URL: ${newUrl}`);
    
    console.log('\n📊 Edit Phase Structure Button Results:');
    console.log('=======================================');
    
    if (newUrl.includes('/flows')) {
      console.log('✅ SUCCESS: Navigated to FlowsEditor (/flows)');
      
      if (newUrl.includes('workflow=')) {
        console.log('✅ SUCCESS: Workflow parameter included in URL');
      } else {
        console.log('⚠️ WARNING: Workflow parameter missing from URL');
      }
      
      if (newUrl.includes('phase=')) {
        console.log('✅ SUCCESS: Phase parameter included in URL');
      } else {
        console.log('⚠️ WARNING: Phase parameter missing from URL');
      }
      
      // Check if FlowsEditor loaded
      const flowsEditorLoaded = await page.locator('text=Flows Editor').isVisible({ timeout: 10000 }).catch(() => false);
      if (flowsEditorLoaded) {
        console.log('✅ SUCCESS: FlowsEditor interface loaded');
      } else {
        console.log('⚠️ WARNING: FlowsEditor interface not detected');
      }
      
    } else if (newUrl.includes('/admin')) {
      console.log('❌ ISSUE: Redirected to /admin instead of /flows');
      console.log('🔧 This suggests authentication context issue still exists');
    } else {
      console.log(`⚠️ UNEXPECTED: Navigated to unexpected URL: ${newUrl}`);
    }

    console.log('\n🎉 SPECIFIC BUTTON TESTING COMPLETED!');
    console.log('=====================================');
    console.log('📊 Summary:');
    console.log('- Edit Content Button: Tested ✅');
    console.log('- Edit Phase Structure Button: Tested ✅');
    console.log('\n👀 Browser will remain open for manual inspection.');
    console.log('Press Enter to close and exit...');
    
    // Keep browser open for manual inspection
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => {
      process.stdin.on('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n📸 Taking screenshot for debugging...');
    await page.screenshot({ path: 'button-test-error.png' });
    console.log('Screenshot saved as button-test-error.png');
  } finally {
    await browser.close();
  }
}

// Helper function removed - using direct isVisible() calls instead

// Run the test
testSpecificButtons().catch(console.error);
