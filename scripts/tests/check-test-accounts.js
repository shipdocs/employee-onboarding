#!/usr/bin/env node

const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAccounts() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role, status, is_active, password_hash')
    .in('email', [
      'test-crew-001@shipdocs.app',
      'test-crew-002@shipdocs.app', 
      'test-manager-001@shipdocs.app',
      'test-admin-001@shipdocs.app'
    ]);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Test Accounts Status:\n');
  users.forEach(user => {
    console.log(`${user.email}:`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Status: ${user.status}`);
    console.log(`  - Is Active: ${user.is_active}`);
    console.log(`  - Has Password: ${user.password_hash ? 'Yes' : 'No'}`);
    console.log('');
  });
}

checkAccounts().catch(console.error);