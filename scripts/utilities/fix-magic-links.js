// Script to diagnose and fix magic_links table issue
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a fresh client instance to avoid any caching
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function diagnoseMagicLinks() {
  console.log('🔍 Diagnosing magic_links table issue\n');

  try {
    // Test 1: Simple select to see what columns are visible
    console.log('1️⃣ Testing simple select on magic_links...');
    const { data: selectTest, error: selectError } = await supabase
      .from('magic_links')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ Select error:', selectError);
    } else {
      console.log('✅ Select works');
      if (selectTest && selectTest.length > 0) {
        console.log('   Visible columns:', Object.keys(selectTest[0]));
      } else {
        console.log('   No data in table, trying insert...');
      }
    }

    // Test 2: Get a user to test with
    console.log('\n2️⃣ Getting a test user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'crew')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.log('❌ No crew users found, creating one...');
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'fix-test@example.com',
          first_name: 'Fix',
          last_name: 'Test',
          role: 'crew',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Cannot create test user:', createError);
        return;
      }
      
      users[0] = newUser;
    }
    
    const testUser = users[0];
    console.log('✅ Using user:', testUser.email, 'ID:', testUser.id);

    // Test 3: Try different insert methods
    console.log('\n3️⃣ Testing different insert methods...');
    
    // Method A: Insert with object notation
    console.log('\n   Method A: Object notation');
    const insertA = await supabase
      .from('magic_links')
      .insert({
        user_id: testUser.id,
        token: 'test-a-' + Date.now(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      })
      .select();
    
    console.log('   Result:', insertA.error ? `❌ ${insertA.error.message}` : '✅ Success');

    // Method B: Insert with array notation
    console.log('\n   Method B: Array notation');
    const insertB = await supabase
      .from('magic_links')
      .insert([{
        user_id: testUser.id,
        token: 'test-b-' + Date.now(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      }])
      .select();
    
    console.log('   Result:', insertB.error ? `❌ ${insertB.error.message}` : '✅ Success');

    // Test 4: Check if it's a schema visibility issue
    console.log('\n4️⃣ Testing with explicit schema...');
    const { data: schemaTest, error: schemaError } = await supabase
      .schema('public')
      .from('magic_links')
      .insert({
        user_id: testUser.id,
        token: 'test-schema-' + Date.now(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      })
      .select();
    
    console.log('   Result:', schemaError ? `❌ ${schemaError.message}` : '✅ Success');

    // Clean up successful inserts
    if (!insertA.error && insertA.data) {
      await supabase.from('magic_links').delete().eq('id', insertA.data[0].id);
    }
    if (!insertB.error && insertB.data) {
      await supabase.from('magic_links').delete().eq('id', insertB.data[0].id);
    }
    if (!schemaError && schemaTest) {
      await supabase.from('magic_links').delete().eq('id', schemaTest[0].id);
    }

    // Clean up test user if we created it
    if (testUser.email === 'fix-test@example.com') {
      await supabase.from('users').delete().eq('id', testUser.id);
    }

    console.log('\n✨ Diagnosis complete!');
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  }
}

// Run diagnosis
diagnoseMagicLinks();