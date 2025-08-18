/**
 * Global Teardown for E2E Tests
 * Cleans up test environment and data
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    // Clean up test data
    await cleanupTestData(page, baseURL);

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any, baseURL: string) {
  console.log('🗑️ Cleaning up test data...');

  // Clean up test accounts
  try {
    await page.goto(`${baseURL}/api/test/cleanup`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.log('⚠️ Test data cleanup skipped (endpoint may not exist)');
  }

  // Clear any uploaded test files
  try {
    await page.goto(`${baseURL}/api/test/cleanup-files`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Test files cleanup completed');
  } catch (error) {
    console.log('⚠️ Test files cleanup skipped (endpoint may not exist)');
  }
}

export default globalTeardown;
