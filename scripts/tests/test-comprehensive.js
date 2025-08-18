#!/usr/bin/env node

/**
 * Comprehensive production test suite
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'https://onboarding.burando.online';
const TEST_ACCOUNTS = {
  admin: { email: 'test-admin-001@shipdocs.app', password: 'TestPass123!' },
  crew: { email: 'test-crew-001@shipdocs.app' }
};

let adminToken = null;
let testWorkflowId = null;
let testResults = [];

// Helper to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };
  
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }
  
  return axios(config);
}

// Test runner
async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✅ ${name}`);
    testResults.push({ name, passed: true });
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    testResults.push({ name, passed: false, error: error.response?.data || error.message });
  }
}

async function runAllTests() {
  console.log('🧪 Comprehensive Production Test Suite\n');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`📅 Date: ${new Date().toISOString()}\n`);
  
  // 1. Health & Infrastructure Tests
  console.log('1️⃣ Infrastructure Tests\n');
  
  await runTest('Health check returns healthy status', async () => {
    const res = await apiCall('GET', '/api/health');
    if (res.data.status !== 'healthy') throw new Error('Unhealthy status');
  });
  
  await runTest('Database connection is active', async () => {
    const res = await apiCall('GET', '/api/health');
    if (!res.data.database?.connected) throw new Error('Database not connected');
  });
  
  await runTest('Storage connection is active', async () => {
    const res = await apiCall('GET', '/api/health');
    if (!res.data.storage?.connected) throw new Error('Storage not connected');
  });
  
  // 2. Authentication Tests
  console.log('\n2️⃣ Authentication Tests\n');
  
  await runTest('Admin login with valid credentials', async () => {
    const res = await apiCall('POST', '/api/auth/admin-login', TEST_ACCOUNTS.admin);
    adminToken = res.data.token;
    if (!adminToken) throw new Error('No token received');
  });
  
  await runTest('Magic link request for crew member', async () => {
    const res = await apiCall('POST', '/api/auth/request-magic-link', {
      email: TEST_ACCOUNTS.crew.email
    });
    if (!res.data.message) throw new Error('No success message');
  });
  
  await runTest('Invalid login returns proper error', async () => {
    try {
      await apiCall('POST', '/api/auth/admin-login', {
        email: 'invalid@test.com',
        password: 'wrongpass'
      });
      throw new Error('Should have failed');
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
  });
  
  // 3. Workflow Management Tests
  console.log('\n3️⃣ Workflow Management Tests\n');
  
  await runTest('Create new workflow', async () => {
    const timestamp = Date.now();
    const res = await apiCall('POST', '/api/workflows', {
      name: `Test Workflow ${timestamp}`,
      slug: `test-workflow-${timestamp}`,
      description: 'Comprehensive test workflow',
      type: 'onboarding',
      config: {
        phases: [
          {
            name: 'Documentation Phase',
            type: 'content',
            description: 'Complete required documentation',
            required: true
          },
          {
            name: 'Training Phase',
            type: 'training',
            description: 'Complete safety training',
            required: true
          }
        ]
      }
    }, adminToken);
    
    testWorkflowId = res.data.id;
    if (!testWorkflowId) throw new Error('No workflow ID returned');
  });
  
  await runTest('Retrieve created workflow', async () => {
    const res = await apiCall('GET', '/api/workflows', null, adminToken);
    const found = res.data.find(w => w.id === testWorkflowId);
    if (!found) throw new Error('Workflow not found in list');
  });
  
  await runTest('Update workflow status', async () => {
    const res = await apiCall('PATCH', `/api/workflows?id=${testWorkflowId}`, {
      status: 'active',
      description: 'Updated description'
    }, adminToken);
    if (res.data.status !== 'active') throw new Error('Status not updated');
  });
  
  // 4. Admin Management Tests
  console.log('\n4️⃣ Admin Management Tests\n');
  
  await runTest('Fetch admin statistics', async () => {
    const res = await apiCall('GET', '/api/admin/stats', null, adminToken);
    if (!res.data.hasOwnProperty('totalUsers')) throw new Error('Missing stats data');
  });
  
  await runTest('Fetch system settings', async () => {
    const res = await apiCall('GET', '/api/admin/system-settings', null, adminToken);
    if (!res.data) throw new Error('No settings returned');
  });
  
  // 5. Content Management Tests
  console.log('\n5️⃣ Content Management Tests\n');
  
  await runTest('Fetch training phases', async () => {
    const res = await apiCall('GET', '/api/content/training/phases', null, adminToken);
    if (!Array.isArray(res.data)) throw new Error('Phases not an array');
  });
  
  await runTest('Fetch quiz questions', async () => {
    const res = await apiCall('GET', '/api/content/quizzes', null, adminToken);
    if (!res.data) throw new Error('No quiz data returned');
  });
  
  // 6. Error Handling Tests
  console.log('\n6️⃣ Error Handling Tests\n');
  
  await runTest('404 for non-existent endpoint', async () => {
    try {
      await apiCall('GET', '/api/non-existent-endpoint');
      throw new Error('Should return 404');
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }
  });
  
  await runTest('401 for protected endpoint without auth', async () => {
    try {
      await apiCall('GET', '/api/admin/stats');
      throw new Error('Should return 401');
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
  });
  
  // 7. Performance Tests
  console.log('\n7️⃣ Performance Tests\n');
  
  await runTest('Health check responds within 1 second', async () => {
    const start = Date.now();
    await apiCall('GET', '/api/health');
    const duration = Date.now() - start;
    if (duration > 1000) throw new Error(`Took ${duration}ms`);
  });
  
  await runTest('Workflow list responds within 2 seconds', async () => {
    const start = Date.now();
    await apiCall('GET', '/api/workflows', null, adminToken);
    const duration = Date.now() - start;
    if (duration > 2000) throw new Error(`Took ${duration}ms`);
  });
  
  // Cleanup
  console.log('\n8️⃣ Cleanup\n');
  
  await runTest('Archive test workflow', async () => {
    if (!testWorkflowId) return;
    const res = await apiCall('PATCH', `/api/workflows?id=${testWorkflowId}`, {
      status: 'archived'
    }, adminToken);
    if (res.data.status !== 'archived') throw new Error('Not archived');
  });
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const total = testResults.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}`));
  }
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});