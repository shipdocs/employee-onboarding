#!/usr/bin/env node

/**
 * Simple API test script to verify endpoints are working
 */

const axios = require('axios');

const BASE_URL = 'https://maritime-onboarding.example.com';

async function testAPI() {
  console.log('🧪 Testing Real API Endpoints\n');
  
  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', health.data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Test 2: Request magic link
  console.log('\n2️⃣ Testing magic link request...');
  try {
    const magicLink = await axios.post(`${BASE_URL}/api/auth/request-magic-link`, {
      email: 'test-crew-001@shipdocs.app'
    });
    console.log('✅ Magic link request:', magicLink.data);
  } catch (error) {
    console.log('❌ Magic link failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Test 3: Manager login
  console.log('\n3️⃣ Testing manager login...');
  try {
    const login = await axios.post(`${BASE_URL}/api/auth/manager-login`, {
      email: 'test-manager-001@shipdocs.app',
      password: 'TestPass123!'
    });
    console.log('✅ Manager login successful:', login.data.user?.email);
    return login.data.token;
  } catch (error) {
    console.log('❌ Manager login failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Test 4: Admin login
  console.log('\n4️⃣ Testing admin login...');
  try {
    const login = await axios.post(`${BASE_URL}/api/auth/admin-login`, {
      email: 'test-admin-001@shipdocs.app',
      password: 'TestPass123!'
    });
    console.log('✅ Admin login successful:', login.data.user?.email);
    return login.data.token;
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.status, error.response?.data || error.message);
  }
}

// Run tests
testAPI().then(token => {
  if (token) {
    console.log('\n✨ Basic API tests completed. Got auth token.');
  } else {
    console.log('\n⚠️ API tests completed with some failures.');
  }
}).catch(console.error);