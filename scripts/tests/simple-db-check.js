#!/usr/bin/env node

/**
 * Simple database connection and user check
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function simpleCheck() {
  console.log('🔍 Simple Database Check\n');
  
  // Check environment variables
  console.log('Environment check:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.log('');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Simple query to test connection
    const { data, error, count } = await supabase
      .from('users')
      .select('email, role, status', { count: 'exact' })
      .limit(5);
      
    if (error) {
      console.log('❌ Database error:', error.message);
      return;
    }
    
    console.log(`✅ Database connection successful`);
    console.log(`📊 Total users in database: ${count}`);
    console.log('');
    
    if (data && data.length > 0) {
      console.log('👥 Sample users:');
      data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.status}`);
      });
    } else {
      console.log('📭 No users found in database');
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

simpleCheck().catch(console.error);
