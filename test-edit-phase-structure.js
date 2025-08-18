#!/usr/bin/env node

/**
 * Edit Phase Structure Button Test
 * 
 * Focused test for the Edit Phase Structure button functionality
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://onboarding.burando.online';
const ADMIN_EMAIL = 'adminmartexx@shipdocs.app';
const ADMIN_PASSWORD = 'Yumminova211@#';

async function testEditPhaseStructure() {
  console.log('🏗️ EDIT PHASE STRUCTURE BUTTON TEST');
  console.log('===================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Quick navigation to the target
    console.log('📍 Navigating and logging in...');
    await page.goto(BASE_URL);
    await page.click('text=need help logging in');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("administrator")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Admin Dashboard', { timeout: 30000 });
    console.log('✅ Logged in successfully');

    // Navigate to the specific workflow
    console.log('\n📋 Navigating to Content > Training Programs > Manage Phases...');
    await page.click('text=Content');
    await page.waitForURL('**/content');
    await page.click('button:has-text("Training Programs")');
    await page.waitForSelector('.content-grid');
    
    // Find and click the specific workflow
    const targetWorkflow = page.locator('.content-card').filter({ hasText: 'Onboarding new managers to this app' });
    if (await targetWorkflow.isVisible({ timeout: 5000 })) {
      await targetWorkflow.locator('button:has-text("Manage Phases")').click();
      console.log('✅ Found and clicked target workflow');
    } else {
      await page.locator('button:has-text("Manage Phases")').first().click();
      console.log('✅ Clicked first available workflow');
    }

    await page.waitForSelector('.workflow-phases-view');
    console.log('✅ Workflow phases view loaded');

    // Test Edit Phase Structure Button
    console.log('\n🏗️ TESTING EDIT PHASE STRUCTURE BUTTON');
    console.log('======================================');
    
    const editStructureBtn = page.locator('button:has-text("Edit Phase Structure")').first();
    const isVisible = await editStructureBtn.isVisible({ timeout: 5000 });
    
    if (!isVisible) {
      throw new Error('Edit Phase Structure button not found');
    }
    
    console.log('✅ Edit Phase Structure button is visible');
    
    // Get current URL and page info
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Listen for console logs
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Opening FlowsEditor')) {
        console.log(`📝 Console: ${msg.text()}`);
      }
    });
    
    // Click the button
    console.log('🔄 Clicking Edit Phase Structure button...');
    await editStructureBtn.click();
    
    // Wait for navigation/processing
    await page.waitForTimeout(5000);
    
    // Check the result
    const newUrl = page.url();
    console.log(`📍 New URL after click: ${newUrl}`);
    
    // Analyze the result
    console.log('\n📊 EDIT PHASE STRUCTURE BUTTON RESULTS:');
    console.log('=======================================');
    
    if (newUrl.includes('/flows')) {
      console.log('✅ SUCCESS: Navigated to FlowsEditor (/flows)');
      
      // Check URL parameters
      const url = new URL(newUrl);
      const workflowParam = url.searchParams.get('workflow');
      const phaseParam = url.searchParams.get('phase');
      
      if (workflowParam) {
        console.log(`✅ SUCCESS: Workflow parameter found: ${workflowParam}`);
      } else {
        console.log('⚠️ WARNING: Workflow parameter missing');
      }
      
      if (phaseParam) {
        console.log(`✅ SUCCESS: Phase parameter found: ${phaseParam}`);
      } else {
        console.log('⚠️ WARNING: Phase parameter missing');
      }
      
      // Check if FlowsEditor loaded
      const flowsEditorElements = [
        'text=Flows Editor',
        'text=Workflow Editor',
        '.flows-editor-page',
        '.workflow-editor'
      ];
      
      let editorLoaded = false;
      for (const selector of flowsEditorElements) {
        if (await page.locator(selector).isVisible({ timeout: 10000 }).catch(() => false)) {
          console.log(`✅ SUCCESS: FlowsEditor interface detected (${selector})`);
          editorLoaded = true;
          break;
        }
      }
      
      if (!editorLoaded) {
        console.log('⚠️ WARNING: FlowsEditor interface not clearly detected');
        console.log('📝 Page title:', await page.title());
        
        // Check for any workflow-related content
        const workflowContent = await page.locator('text=workflow').count();
        if (workflowContent > 0) {
          console.log(`✅ Found ${workflowContent} workflow-related elements on page`);
        }
      }
      
    } else if (newUrl.includes('/admin')) {
      console.log('❌ ISSUE: Redirected to /admin instead of /flows');
      console.log('🔧 This indicates authentication context was lost');
      
    } else if (newUrl === currentUrl) {
      console.log('⚠️ ISSUE: No navigation occurred (same URL)');
      console.log('🔧 Button may not be working or navigation failed');
      
    } else {
      console.log(`⚠️ UNEXPECTED: Navigated to unexpected URL: ${newUrl}`);
    }
    
    // Additional checks
    console.log('\n🔍 Additional Information:');
    console.log('=========================');
    console.log(`📄 Page title: ${await page.title()}`);
    
    // Check for any error messages
    const errorElements = await page.locator('[role="alert"], .error, .toast-error').count();
    if (errorElements > 0) {
      console.log(`⚠️ Found ${errorElements} error elements on page`);
    } else {
      console.log('✅ No error elements detected');
    }
    
    console.log('\n🎯 EDIT PHASE STRUCTURE TEST COMPLETED!');
    console.log('=======================================');
    
    // Keep browser open for inspection
    console.log('\n👀 Browser will remain open for manual inspection.');
    console.log('Press Enter to close...');
    
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
    await page.screenshot({ path: 'edit-phase-structure-error.png' });
    console.log('📸 Screenshot saved as edit-phase-structure-error.png');
  } finally {
    await browser.close();
  }
}

testEditPhaseStructure().catch(console.error);
