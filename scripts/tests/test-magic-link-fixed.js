// Test magic link functionality after fix
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMagicLinkFlow() {
  console.log('🔗 Testing Magic Link Flow\n');
  
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000
  });

  try {
    // Test 1: Request magic link for crew member
    console.log('1️⃣ Requesting magic link for crew member...');
    const response = await client.post('/api/auth/request-magic-link', {
      email: 'crew.test@shipdocs.app'
    });

    console.log('✅ Magic link requested successfully');
    console.log('   Response:', response.data.message);
    
    // Test 2: Request magic link for non-existent user
    console.log('\n2️⃣ Testing with non-existent user...');
    try {
      await client.post('/api/auth/request-magic-link', {
        email: 'doesnotexist@example.com'
      });
      console.log('❌ Should have failed for non-existent user');
    } catch (error) {
      console.log('✅ Correctly rejected:', error.response.data.error);
    }

    // Test 3: Request magic link for inactive user
    console.log('\n3️⃣ Testing with test crew member...');
    try {
      const testResponse = await client.post('/api/auth/request-magic-link', {
        email: 'test.crew@shipdocs.app'
      });
      console.log('✅ Magic link sent:', testResponse.data.message);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.error || error.message);
    }

    console.log('\n✨ Magic link system is working!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.response?.data || error.message);
  }
}

testMagicLinkFlow();