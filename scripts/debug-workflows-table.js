#!/usr/bin/env node

/**
 * Debug script to check workflows table and related database issues
 */

const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Use production database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database connection and workflows table...\n');
  
  try {
    // 1. Test basic connection
    console.log('1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // 2. Test simple workflows query directly
    console.log('2. Testing workflows query...');
    const { data: workflowsData, error: workflowsError } = await supabase
      .from('workflows')
      .select('id, name, slug, type, status')
      .limit(5);
    
    if (workflowsError) {
      console.error('❌ Error querying workflows:', workflowsError.message);
      console.error('   Error details:', workflowsError);
      return;
    }
    
    console.log(`✅ workflows query successful - found ${workflowsData.length} workflows`);
    if (workflowsData.length > 0) {
      console.log('   Sample workflows:');
      workflowsData.forEach(w => {
        console.log(`   - ${w.name} (${w.slug}) - ${w.type} - ${w.status}`);
      });
    } else {
      console.log('   ℹ️  No workflows found in database');
    }
    console.log('');

    // 3. Check related tables
    console.log('3. Checking related workflow tables...');
    const relatedTables = ['workflow_phases', 'workflow_phase_items', 'workflow_instances'];
    
    for (const tableName of relatedTables) {
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (tableError) {
          console.error(`❌ ${tableName} table error:`, tableError.message);
        } else {
          console.log(`✅ ${tableName} table exists and accessible`);
        }
      } catch (error) {
        console.error(`❌ ${tableName} table not accessible:`, error.message);
      }
    }

    console.log('\n🎉 Database check completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('   Full error:', error);
  }
}

// Run the check
checkDatabase().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
