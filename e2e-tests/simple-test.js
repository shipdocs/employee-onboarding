#!/usr/bin/env node

/**
 * Simple test to see what the homepage looks like
 */

const { chromium } = require('playwright');

async function simpleTest() {
  console.log('🔍 Simple Homepage Test');
  console.log('======================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
    
    console.log('📋 Getting page title...');
    const title = await page.title();
    console.log(`   Title: "${title}"`);
    
    console.log('🔍 Getting page URL...');
    const url = page.url();
    console.log(`   URL: ${url}`);
    
    console.log('📝 Getting page content preview...');
    const bodyText = await page.textContent('body');
    const preview = bodyText ? bodyText.substring(0, 200) + '...' : 'No body text found';
    console.log(`   Content: ${preview}`);
    
    console.log('🔍 Looking for common elements...');
    
    // Check for login form elements
    const emailInput = await page.$('#primary-email');
    console.log(`   Email input (#primary-email): ${emailInput ? '✅ Found' : '❌ Not found'}`);
    
    const submitButton = await page.$('button[type="submit"]');
    console.log(`   Submit button: ${submitButton ? '✅ Found' : '❌ Not found'}`);
    
    // Check for navigation elements
    const dashboard = await page.$('[data-testid="dashboard"]');
    console.log(`   Dashboard: ${dashboard ? '✅ Found' : '❌ Not found'}`);
    
    // Check for any forms
    const forms = await page.$$('form');
    console.log(`   Forms found: ${forms.length}`);
    
    // Check for any inputs
    const inputs = await page.$$('input');
    console.log(`   Inputs found: ${inputs.length}`);
    
    // Check for any buttons
    const buttons = await page.$$('button');
    console.log(`   Buttons found: ${buttons.length}`);
    
    console.log('✅ Simple test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

simpleTest();
