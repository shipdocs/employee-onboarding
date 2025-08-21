#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 * Validates all critical bug fixes from Sprint S01
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://maritime-onboarding.example.com';
const TIMEOUT = 10000; // 10 seconds

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test and track results
 */
async function runTest(name, testFn) {
  const startTime = performance.now();
  try {
    await testFn();
    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ ${name} (${duration}ms)`);
    results.passed++;
    results.tests.push({ name, status: 'PASSED', duration });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAILED', duration, error: error.message });
  }
}

/**
 * Make API call with timeout
 */
async function apiCall(method, path, data = null, headers = {}) {
  const config = {
    method,
    url: `${BASE_URL}${path}`,
    timeout: TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  return await axios(config);
}

/**
 * Main deployment verification
 */
async function verifyDeployment() {
  console.log('🚀 Production Deployment Verification');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`📅 Date: ${new Date().toISOString()}\n`);
  
  // 1. Infrastructure Health Checks
  console.log('1️⃣ Infrastructure Health Checks\n');
  
  await runTest('Health endpoint responds', async () => {
    const res = await apiCall('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error('System not healthy');
  });
  
  await runTest('Database connection active', async () => {
    const res = await apiCall('GET', '/api/health');
    if (!res.data.database?.connected) throw new Error('Database not connected');
  });
  
  await runTest('Storage connection active', async () => {
    const res = await apiCall('GET', '/api/health');
    if (!res.data.storage?.connected) throw new Error('Storage not connected');
  });
  
  // 2. Frontend Application Tests
  console.log('\n2️⃣ Frontend Application Tests\n');
  
  await runTest('Frontend loads successfully', async () => {
    const res = await axios.get(BASE_URL, { timeout: TIMEOUT });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.toLowerCase().includes('<!doctype html>')) throw new Error('Invalid HTML response');
  });
  
  await runTest('Security headers present', async () => {
    const res = await axios.head(BASE_URL, { timeout: TIMEOUT });
    const requiredHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];
    
    for (const header of requiredHeaders) {
      if (!res.headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  });
  
  // 3. API Error Handling Validation (T03 Fix)
  console.log('\n3️⃣ API Error Handling Validation\n');
  
  await runTest('Invalid login returns proper error format', async () => {
    try {
      await apiCall('POST', '/api/auth/manager-login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      throw new Error('Expected login to fail');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw new Error(`Expected 401, got ${error.response?.status}`);
      }
      // Check error format (should be standardized from T03)
      const errorData = error.response.data;
      if (!errorData.error) {
        throw new Error('Error response missing error field');
      }
    }
  });
  
  await runTest('Non-existent endpoint returns 404', async () => {
    try {
      await apiCall('GET', '/api/nonexistent-endpoint');
      throw new Error('Expected 404 error');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`Expected 404, got ${error.response?.status}`);
      }
    }
  });
  
  // 4. Performance Validation
  console.log('\n4️⃣ Performance Validation\n');
  
  await runTest('Health check responds within 1 second', async () => {
    const start = performance.now();
    await apiCall('GET', '/api/health');
    const duration = performance.now() - start;
    if (duration > 1000) {
      throw new Error(`Health check took ${Math.round(duration)}ms, expected < 1000ms`);
    }
  });
  
  await runTest('Frontend loads within 3 seconds', async () => {
    const start = performance.now();
    await axios.get(BASE_URL, { timeout: 3000 });
    const duration = performance.now() - start;
    if (duration > 3000) {
      throw new Error(`Frontend took ${Math.round(duration)}ms, expected < 3000ms`);
    }
  });
  
  // 5. SSL and Domain Validation
  console.log('\n5️⃣ SSL and Domain Validation\n');
  
  await runTest('SSL certificate valid', async () => {
    const res = await axios.get(BASE_URL, { timeout: TIMEOUT });
    // If we get here without SSL errors, certificate is valid
    if (res.status !== 200) throw new Error('SSL validation failed');
  });
  
  await runTest('Custom domain working', async () => {
    if (!BASE_URL.includes('maritime-onboarding.example.com')) {
      throw new Error('Not using custom domain');
    }
    const res = await axios.get(BASE_URL, { timeout: TIMEOUT });
    if (res.status !== 200) throw new Error('Custom domain not working');
  });
  
  // 6. Database Schema Consistency (T02 Fix)
  console.log('\n6️⃣ Database Schema Consistency\n');
  
  await runTest('Database version matches expected', async () => {
    const res = await apiCall('GET', '/api/health');
    const version = res.data.version;
    if (!version || !version.includes('schema-fix')) {
      throw new Error(`Unexpected version: ${version}`);
    }
  });
  
  // Print Summary
  console.log('\n📊 Deployment Verification Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => console.log(`  - ${test.name}: ${test.error}`));
    
    console.log('\n🚨 Deployment verification FAILED');
    process.exit(1);
  } else {
    console.log('\n🎉 All deployment verification tests PASSED');
    console.log('✅ Production deployment is successful and stable');
  }
}

// Run verification
verifyDeployment().catch(error => {
  console.error('\n💥 Verification script error:', error.message);
  process.exit(1);
});
