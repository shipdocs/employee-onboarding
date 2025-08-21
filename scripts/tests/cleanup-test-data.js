#!/usr/bin/env node

const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  console.log('🧹 Comprehensive Test Data Cleanup\n');
  
  const testEmails = [
    'test-crew-001@shipdocs.app',
    'test-crew-002@shipdocs.app', 
    'test-manager-001@shipdocs.app',
    'test-admin-001@shipdocs.app'
  ];
  
  // Get test user IDs
  const { data: testUsers } = await supabase
    .from('users')
    .select('id, email')
    .in('email', testEmails);
    
  if (!testUsers || testUsers.length === 0) {
    console.log('✅ No test accounts found to clean up');
    return;
  }
  
  const userIds = testUsers.map(u => u.id);
  console.log(`Found ${testUsers.length} test accounts to clean up\n`);
  
  // Clean up in correct order to respect foreign keys
  
  // 1. Delete workflows created by test users
  console.log('🗑️  Deleting test workflows...');
  const { error: workflowError } = await supabase
    .from('workflows')
    .delete()
    .in('created_by', userIds);
  if (!workflowError) console.log('✅ Workflows deleted');
  
  // 2. Delete workflow instances
  console.log('🗑️  Deleting workflow instances...');
  await db.from('workflow_instances').delete().in('user_id', userIds);
  
  // 3. Delete training progress
  console.log('🗑️  Deleting training progress...');
  await db.from('training_progress').delete().in('user_id', userIds);
  
  // 4. Delete quiz attempts
  console.log('🗑️  Deleting quiz attempts...');
  await db.from('quiz_attempts').delete().in('user_id', userIds);
  
  // 5. Delete onboarding records
  console.log('🗑️  Deleting onboarding records...');
  await db.from('onboarding').delete().in('user_id', userIds);
  
  // 6. Delete manager permissions
  console.log('🗑️  Deleting manager permissions...');
  await db.from('manager_permissions').delete().in('manager_id', userIds);
  
  // 7. Delete audit logs
  console.log('🗑️  Deleting audit logs...');
  await db.from('audit_log').delete().in('user_id', userIds);
  
  // 8. Delete magic links
  console.log('🗑️  Deleting magic links...');
  await db.from('magic_links').delete().in('user_id', userIds);
  
  // 9. Delete certificates
  console.log('🗑️  Deleting certificates...');
  await db.from('certificates').delete().in('user_id', userIds);
  
  // 10. Finally, delete users
  console.log('🗑️  Deleting test users...');
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .in('email', testEmails);
    
  if (deleteError) {
    console.error('❌ Failed to delete users:', deleteError.message);
  } else {
    console.log('✅ Test users deleted');
  }
  
  console.log('\n✨ Cleanup complete!');
  
  // Show what was cleaned
  console.log('\n📋 Cleaned up:');
  testUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
}

cleanup().catch(console.error);