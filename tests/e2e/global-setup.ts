/**
 * Global Setup for E2E Tests
 * Prepares test environment and data
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    console.log(`📡 Checking if application is ready at ${baseURL}`);
    
    // Store base URL for tests
    process.env.TEST_BASE_URL = baseURL;
    
    // Wait for server to be ready with retries
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await page.goto(`${baseURL}/api/health`, { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        
        if (response?.ok()) {
          console.log('✅ Application health check passed');
          break;
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Application failed to start within timeout');
        }
        console.log(`⏳ Waiting for application to start... (${retries} retries left)`);
        await page.waitForTimeout(1000);
      }
    }

    // Create auth states directory
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Setup authentication states for different roles
    await setupAuthStates(context, baseURL);

    // Setup test data if needed
    if (process.env.SETUP_TEST_DATA === 'true') {
      await setupTestData(page, baseURL);
    }

    // Store test run metadata
    process.env.TEST_RUN_ID = `e2e-${Date.now()}`;
    process.env.TEST_START_TIME = new Date().toISOString();

    console.log('✅ Global setup completed successfully');
    console.log(`📍 Test Run ID: ${process.env.TEST_RUN_ID}`);
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupAuthStates(context: any, baseURL: string) {
  console.log('🔐 Setting up authentication states...');

  // Admin auth state
  await context.addCookies([{
    name: 'auth-token',
    value: 'mock-admin-token',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Date.now() / 1000 + 3600
  }]);
  
  await context.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-admin-token');
    localStorage.setItem('userRole', 'admin');
  });
  
  await context.storageState({ path: 'tests/e2e/.auth/admin.json' });
  console.log('✅ Admin auth state saved');

  // Clear for next role
  await context.clearCookies();
  await context.addInitScript(() => {
    localStorage.clear();
  });

  // Manager auth state
  await context.addCookies([{
    name: 'auth-token',
    value: 'mock-manager-token',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Date.now() / 1000 + 3600
  }]);
  
  await context.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-manager-token');
    localStorage.setItem('userRole', 'manager');
  });
  
  await context.storageState({ path: 'tests/e2e/.auth/manager.json' });
  console.log('✅ Manager auth state saved');

  // Clear for next role
  await context.clearCookies();
  await context.addInitScript(() => {
    localStorage.clear();
  });

  // Crew auth state
  await context.addCookies([{
    name: 'auth-token',
    value: 'mock-crew-token',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Date.now() / 1000 + 3600
  }]);
  
  await context.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-crew-token');
    localStorage.setItem('userRole', 'crew');
  });
  
  await context.storageState({ path: 'tests/e2e/.auth/crew.json' });
  console.log('✅ Crew auth state saved');
}

async function setupTestData(page: any, baseURL: string) {
  console.log('📊 Setting up test data...');

  // Create test accounts via API if endpoints exist
  const testEndpoints = [
    { url: '/api/test/setup-admin', name: 'Admin account' },
    { url: '/api/test/setup-manager', name: 'Manager account' },
    { url: '/api/test/setup-crew', name: 'Crew accounts' },
    { url: '/api/test/setup-workflows', name: 'Test workflows' }
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await page.goto(`${baseURL}${endpoint.url}`, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      if (response?.ok()) {
        console.log(`✅ ${endpoint.name} setup completed`);
      } else {
        console.log(`⚠️ ${endpoint.name} setup skipped (endpoint returned ${response?.status()})`);
      }
    } catch (error) {
      console.log(`⚠️ ${endpoint.name} setup skipped (endpoint may not exist)`);
    }
  }

  // Verify test data was created
  try {
    const response = await page.goto(`${baseURL}/api/test/verify-setup`, { 
      waitUntil: 'networkidle',
      timeout: 5000 
    });
    
    if (response?.ok()) {
      const data = await response.json();
      console.log('📊 Test data statistics:', data);
    }
  } catch (error) {
    console.log('⚠️ Test data verification skipped');
  }
}

export default globalSetup;
