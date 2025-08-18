// Test direct SQL queries
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectSQL() {
  console.log('🔍 Testing Direct SQL Queries\n');

  try {
    // Test 1: Check magic_links table structure with raw SQL
    console.log('1️⃣ Checking magic_links table structure...');
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'magic_links'
    }).catch(async () => {
      // If RPC doesn't exist, try a different approach
      const { data, error } = await supabase
        .from('magic_links')
        .select()
        .limit(0);
      
      return { data: null, error: error || 'No RPC function' };
    });

    if (columnsError) {
      console.log('   RPC not available, trying alternative method...');
      
      // Try to get table info through information_schema
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'magic_links')
        .eq('table_schema', 'public');
      
      if (schemaError) {
        console.log('   Cannot access information_schema');
        
        // Last resort: try a direct insert to see what error we get
        const { error: insertError } = await supabase
          .from('magic_links')
          .insert({
            test_field: 'test'
          });
        
        console.log('   Insert error details:', insertError);
      } else {
        console.log('   Schema info:', schemaInfo);
      }
    }

    // Test 2: Try raw SQL through RPC if available
    console.log('\n2️⃣ Testing if we can create a proper magic link entry...');
    
    // First, get a valid user ID
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      const userId = users[0].id;
      console.log('   Using user ID:', userId);
      
      // Try different approaches to insert
      console.log('\n   Approach 1: Standard insert with explicit columns');
      const { data: ml1, error: err1 } = await supabase
        .from('magic_links')
        .insert([{
          user_id: userId,
          token: 'test-' + Date.now(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        }])
        .select();
      
      if (err1) {
        console.log('   ❌ Error:', err1.message);
        console.log('   Full error:', JSON.stringify(err1, null, 2));
      } else {
        console.log('   ✅ Success! Created:', ml1);
        // Clean up
        if (ml1 && ml1[0]) {
          await supabase.from('magic_links').delete().eq('id', ml1[0].id);
        }
      }
    }

    // Test 3: Check if this is a PostgREST issue
    console.log('\n3️⃣ Checking PostgREST configuration...');
    const { data: apiTest, error: apiError } = await supabase
      .from('magic_links')
      .select('*')
      .is('user_id', null)
      .limit(1);
    
    if (apiError) {
      console.log('   PostgREST error:', apiError);
    } else {
      console.log('   PostgREST can query the table');
    }

  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  }
}

testDirectSQL();