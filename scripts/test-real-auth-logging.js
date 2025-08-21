#!/usr/bin/env node

/**
 * Test Real Authentication Logging
 * 
 * This script tests if real authentication failures are being logged
 * to the security_events table by making actual failed login attempts.
 */

const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maritime-onboarding.example.com';

async function testRealAuthLogging() {
  console.log('🔍 Testing Real Authentication Logging...\n');
  
  try {
    // Test 1: Failed Admin Login
    console.log('1. Testing failed admin login...');
    const adminResponse = await fetch(`${API_URL}/api/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuthTest/1.0 (Security Dashboard Test)'
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword123'
      })
    });
    
    console.log(`   Status: ${adminResponse.status}`);
    if (adminResponse.status === 400 || adminResponse.status === 401) {
      console.log('   ✅ Admin login properly rejected failed attempt');
    } else {
      console.log('   ⚠️  Unexpected response status');
    }
    
    // Test 2: Failed Manager Login
    console.log('\n2. Testing failed manager login...');
    const managerResponse = await fetch(`${API_URL}/api/auth/manager-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuthTest/1.0 (Security Dashboard Test)'
      },
      body: JSON.stringify({
        email: 'fake.manager@example.com',
        password: 'invalidpassword'
      })
    });
    
    console.log(`   Status: ${managerResponse.status}`);
    if (managerResponse.status === 400 || managerResponse.status === 401) {
      console.log('   ✅ Manager login properly rejected failed attempt');
    } else {
      console.log('   ⚠️  Unexpected response status');
    }
    
    // Wait a moment for async logging to complete
    console.log('\n3. Waiting for security events to be logged...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n✅ Test completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your security dashboard for new events');
    console.log('2. Look for authentication_failure events with:');
    console.log('   - Real IP addresses (not 192.168.x.x)');
    console.log('   - User-Agent: "AuthTest/1.0 (Security Dashboard Test)"');
    console.log('   - Recent timestamps');
    console.log('3. Verify "View Details" button works for new events');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if the application is running');
    console.log('2. Verify API endpoints are accessible');
    console.log('3. Check network connectivity');
  }
}

// Run the test
testRealAuthLogging();
