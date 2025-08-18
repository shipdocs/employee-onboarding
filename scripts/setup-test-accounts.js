#!/usr/bin/env node

/**
 * Script to create test accounts in the database
 * Run this once to set up accounts for integration testing
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_ACCOUNTS = [
  {
    email: 'test-crew-001@shipdocs.app',
    first_name: 'Test',
    last_name: 'Crew 001',
    role: 'crew',
    vessel_assignment: 'Test Vessel',
    position: 'Test Officer',
    expected_boarding_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Date only
    status: 'not_started',
    is_active: true,
    contact_phone: '+31612345678',
    emergency_contact_name: 'Emergency Contact 001',
    emergency_contact_phone: '+31687654321'
  },
  {
    email: 'test-crew-002@shipdocs.app',
    first_name: 'Test',
    last_name: 'Crew 002',
    role: 'crew',
    vessel_assignment: 'Test Vessel',
    position: 'Test Engineer',
    expected_boarding_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Date only
    status: 'not_started',
    is_active: true,
    contact_phone: '+31612345679',
    emergency_contact_name: 'Emergency Contact 002',
    emergency_contact_phone: '+31687654322'
  },
  {
    email: 'test-manager-001@shipdocs.app',
    first_name: 'Test',
    last_name: 'Manager 001',
    role: 'manager',
    position: 'Test HR Manager',
    status: 'active',
    is_active: true,
    password: 'TestPass123!' // Only for test accounts
  },
  {
    email: 'test-admin-001@shipdocs.app',
    first_name: 'Test',
    last_name: 'Admin 001',
    role: 'admin',
    position: 'Test Administrator',
    status: 'active',
    is_active: true,
    password: 'TestPass123!' // Only for test accounts
  }
];

async function createTestAccounts() {
  console.log('🔧 Setting up test accounts...\n');

  for (const account of TEST_ACCOUNTS) {
    try {
      // Check if account already exists
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', account.email)
        .single();

      if (existing) {
        console.log(`⚠️  Account already exists: ${account.email}`);
        continue;
      }

      // Hash password for manager/admin accounts
      let userData = { ...account };
      if (account.password) {
        userData.password_hash = await bcrypt.hash(account.password, 10);
        delete userData.password;
      }

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        console.error(`❌ Failed to create ${account.email}:`, createError.message);
        continue;
      }

      console.log(`✅ Created: ${account.email} (ID: ${newUser.id})`);

      // Add manager permissions if needed
      if (account.role === 'manager') {
        const permissions = [
          'view_crew',
          'manage_onboarding',
          'view_reports',
          'send_emails'
        ];

        for (const permission of permissions) {
          await supabase
            .from('manager_permissions')
            .insert({
              manager_id: newUser.id,
              permission_key: permission
            });
        }
        
        console.log(`   📋 Added manager permissions`);
      }

      // Create onboarding record for crew
      if (account.role === 'crew') {
        const { error: onboardingError } = await supabase
          .from('onboarding')
          .insert({
            user_id: newUser.id,
            phase: 1,
            status: 'not_started',
            form_data: {},
            started_at: new Date().toISOString()
          });

        if (!onboardingError) {
          console.log(`   📝 Created onboarding record`);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error.message);
    }
  }

  console.log('\n✨ Test account setup complete!\n');
  console.log('📋 Account Summary:');
  console.log('  - Crew accounts: test-crew-001@shipdocs.app, test-crew-002@shipdocs.app');
  console.log('  - Manager account: test-manager-001@shipdocs.app (password: TestPass123!)');
  console.log('  - Admin account: test-admin-001@shipdocs.app (password: TestPass123!)');
  console.log('\n⚠️  IMPORTANT: These are TEST accounts only. Never use these passwords in production!');
}

async function cleanupTestAccounts() {
  console.log('\n🧹 Cleaning up test accounts...\n');
  
  const testEmails = TEST_ACCOUNTS.map(a => a.email);
  
  // First, get all test user IDs
  const { data: testUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', testEmails);
    
  if (fetchError || !testUsers) {
    console.error('❌ Failed to fetch test users:', fetchError);
    return;
  }
  
  const userIds = testUsers.map(u => u.id);
  
  // Delete related records
  console.log('🗑️  Deleting related records...');
  
  // Delete onboarding records
  await supabase.from('onboarding').delete().in('user_id', userIds);
  
  // Delete manager permissions
  await supabase.from('manager_permissions').delete().in('manager_id', userIds);
  
  // Delete audit logs
  await supabase.from('audit_log').delete().in('user_id', userIds);
  
  // Delete magic links
  await supabase.from('magic_links').delete().in('user_id', userIds);
  
  // Finally, delete users
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .in('email', testEmails);
    
  if (deleteError) {
    console.error('❌ Failed to delete test users:', deleteError);
  } else {
    console.log('✅ Test accounts cleaned up successfully');
  }
}

// Command line argument handling
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupTestAccounts().catch(console.error);
} else {
  createTestAccounts().catch(console.error);
}