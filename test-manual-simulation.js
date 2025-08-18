#!/usr/bin/env node

/**
 * Manual User Simulation Test
 * 
 * This test simulates exactly what a human user would do:
 * 1. Click buttons manually
 * 2. Wait and observe what happens
 * 3. Check for any visual feedback or errors
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://onboarding.burando.online';
const ADMIN_EMAIL = 'adminmartexx@shipdocs.app';
const ADMIN_PASSWORD = 'Yumminova211@#';

async function testManualSimulation() {
  console.log('👤 MANUAL USER SIMULATION TEST');
  console.log('==============================\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 3000 // Very slow to simulate human interaction
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login and navigate to the exact same state
    console.log('📍 Step 1: Login and navigate...');
    await page.goto(BASE_URL);
    await page.click('text=need help logging in');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("administrator")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Admin Dashboard', { timeout: 30000 });

    await page.click('text=Content');
    await page.waitForURL('**/content');
    await page.click('button:has-text("Training Programs")');
    await page.waitForSelector('.content-grid');
    
    const targetWorkflow = page.locator('.content-card').filter({ hasText: 'Onboarding new managers to this app' });
    await targetWorkflow.locator('button:has-text("Manage Phases")').click();
    await page.waitForSelector('.workflow-phases-view');
    
    console.log('✅ Successfully navigated to the exact same state as user');

    // Now test EXACTLY what the user experiences
    console.log('\n👤 Step 2: Testing Edit Content button (manual simulation)...');
    
    // Listen for ALL console messages
    page.on('console', msg => {
      console.log(`🖥️ Browser Console [${msg.type()}]: ${msg.text()}`);
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`🌐 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Find the Edit Content button
    const editContentBtn = page.locator('button:has-text("Edit Content")').first();
    
    // Check if button is visible and enabled
    const isVisible = await editContentBtn.isVisible();
    const isEnabled = await editContentBtn.isEnabled();
    
    console.log(`📝 Edit Content button state: visible=${isVisible}, enabled=${isEnabled}`);

    if (!isVisible || !isEnabled) {
      console.log('❌ Button is not clickable!');
      await page.screenshot({ path: 'button-not-clickable.png' });
      return;
    }

    // Get current URL before clicking
    const urlBefore = page.url();
    console.log(`📍 URL before click: ${urlBefore}`);

    // Click the button and wait for any changes
    console.log('🖱️ Clicking Edit Content button...');
    await editContentBtn.click();

    // Wait a bit to see what happens
    await page.waitForTimeout(5000);

    // Check what happened
    const urlAfter = page.url();
    console.log(`📍 URL after click: ${urlAfter}`);

    const navigationOccurred = urlBefore !== urlAfter;
    console.log(`🔄 Navigation occurred: ${navigationOccurred}`);

    if (navigationOccurred) {
      console.log('✅ Edit Content button caused navigation');
      
      // Check if we're in the right place
      const isTrainingPhases = page.url().includes('content') && await page.locator('text=Training Phases').isVisible().catch(() => false);
      const isRichEditor = await page.locator('.rich-content-editor').isVisible().catch(() => false);
      
      console.log(`📝 Training Phases tab: ${isTrainingPhases}`);
      console.log(`📝 Rich Content Editor: ${isRichEditor}`);
      
    } else {
      console.log('❌ Edit Content button did NOT cause navigation');
      
      // Check for any visual changes
      const hasModal = await page.locator('.modal, .dialog').isVisible().catch(() => false);
      const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);
      const hasToast = await page.locator('.toast, .notification').isVisible().catch(() => false);
      
      console.log(`🔍 Modal appeared: ${hasModal}`);
      console.log(`🔍 Alert appeared: ${hasAlert}`);
      console.log(`🔍 Toast appeared: ${hasToast}`);
    }

    // Now test Edit Phase Structure button
    console.log('\n🏗️ Step 3: Testing Edit Phase Structure button...');
    
    // Navigate back if needed
    if (navigationOccurred) {
      console.log('🔄 Navigating back to workflow phases...');
      await page.goBack();
      await page.waitForSelector('.workflow-phases-view');
    }

    const editStructureBtn = page.locator('button:has-text("Edit Phase Structure")').first();
    
    const isStructureVisible = await editStructureBtn.isVisible();
    const isStructureEnabled = await editStructureBtn.isEnabled();
    
    console.log(`🏗️ Edit Phase Structure button state: visible=${isStructureVisible}, enabled=${isStructureEnabled}`);

    if (!isStructureVisible || !isStructureEnabled) {
      console.log('❌ Edit Phase Structure button is not clickable!');
      await page.screenshot({ path: 'structure-button-not-clickable.png' });
      return;
    }

    const urlBeforeStructure = page.url();
    console.log(`📍 URL before Edit Phase Structure click: ${urlBeforeStructure}`);

    console.log('🖱️ Clicking Edit Phase Structure button...');
    await editStructureBtn.click();

    // Wait for navigation or changes
    await page.waitForTimeout(5000);

    const urlAfterStructure = page.url();
    console.log(`📍 URL after Edit Phase Structure click: ${urlAfterStructure}`);

    const structureNavigationOccurred = urlBeforeStructure !== urlAfterStructure;
    console.log(`🔄 Structure navigation occurred: ${structureNavigationOccurred}`);

    if (structureNavigationOccurred) {
      console.log('✅ Edit Phase Structure button caused navigation');
      
      if (urlAfterStructure.includes('/flows')) {
        console.log('✅ Successfully navigated to FlowsEditor');
        
        // Check if FlowsEditor loaded properly
        const flowsEditorLoaded = await page.locator('.flows-editor-page, .workflow-editor').isVisible({ timeout: 10000 }).catch(() => false);
        console.log(`🏗️ FlowsEditor loaded: ${flowsEditorLoaded}`);
        
      } else {
        console.log(`⚠️ Navigated to unexpected URL: ${urlAfterStructure}`);
      }
    } else {
      console.log('❌ Edit Phase Structure button did NOT cause navigation');
    }

    console.log('\n🎯 MANUAL SIMULATION COMPLETE');
    console.log('============================');
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'manual-simulation-error.png' });
  } finally {
    await browser.close();
  }
}

testManualSimulation().catch(console.error);
