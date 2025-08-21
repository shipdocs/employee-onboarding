#!/usr/bin/env node

const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTestAccounts() {
  console.log('🔧 Fixing test account statuses...\n');
  
  // Update manager to have active status (fully_completed)
  const { data: manager, error: managerError } = await supabase
    .from('users')
    .update({ status: 'fully_completed' })
    .eq('email', 'test-manager-001@shipdocs.app')
    .select()
    .single();
    
  if (managerError) {
    console.error('❌ Failed to update manager:', managerError.message);
  } else {
    console.log('✅ Updated manager status to fully_completed');
  }
  
  // Update admin to have active status (fully_completed)
  const { data: admin, error: adminError } = await supabase
    .from('users')
    .update({ status: 'fully_completed' })
    .eq('email', 'test-admin-001@shipdocs.app')
    .select()
    .single();
    
  if (adminError) {
    console.error('❌ Failed to update admin:', adminError.message);
  } else {
    console.log('✅ Updated admin status to fully_completed');
  }
  
  // Update crew to in_progress so they can at least use the system
  const { data: crew1, error: crew1Error } = await supabase
    .from('users')
    .update({ status: 'in_progress' })
    .eq('email', 'test-crew-001@shipdocs.app')
    .select()
    .single();
    
  if (crew1Error) {
    console.error('❌ Failed to update crew 1:', crew1Error.message);
  } else {
    console.log('✅ Updated crew 1 status to in_progress');
  }
  
  console.log('\n✨ Status updates complete!');
}

fixTestAccounts().catch(console.error);