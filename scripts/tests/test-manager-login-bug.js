#!/usr/bin/env node

/**
 * Test to demonstrate the manager login bug
 */

const axios = require('axios');
const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE_URL = 'https://maritime-onboarding.example.com';

async function testBug() {
  console.log('🐛 Testing Manager Login Status Bug\n');
  
  // First, show what's in the database
  const { data: manager } = await supabase
    .from('users')
    .select('email, role, status, is_active')
    .eq('email', 'test-manager-001@shipdocs.app')
    .single();
    
  console.log('Manager in database:', manager);
  console.log('');
  
  // Now try to login
  console.log('Attempting login...');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/manager-login`, {
      email: 'test-manager-001@shipdocs.app',
      password: 'TestPass123!'
    });
    console.log('✅ Login successful!');
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data);
    console.log('');
    console.log('📝 Bug Analysis:');
    console.log('- Database has status: "fully_completed"');
    console.log('- manager-login.js checks for: status === "active"');
    console.log('- But "active" is not a valid status in the database constraint!');
    console.log('');
    console.log('🔧 This is a bug in manager-login.js line 125.');
    console.log('   It should check for "fully_completed" instead of "active"');
  }
}

testBug().catch(console.error);