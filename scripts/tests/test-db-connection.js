// Test database connection and schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Connection and Schema\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data: test, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError);
      return;
    }
    console.log('✅ Connected to database\n');

    // Test 2: Check users table
    console.log('2️⃣ Checking users table schema...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table exists');
      if (users.length > 0) {
        console.log('   Sample columns:', Object.keys(users[0]).join(', '));
      }
    }

    // Test 3: Check magic_links table
    console.log('\n3️⃣ Checking magic_links table schema...');
    const { data: magicLinks, error: magicLinksError } = await supabase
      .from('magic_links')
      .select('*')
      .limit(1);
    
    if (magicLinksError) {
      console.error('❌ Magic links table error:', magicLinksError);
    } else {
      console.log('✅ Magic links table exists');
      if (magicLinks.length > 0) {
        console.log('   Sample columns:', Object.keys(magicLinks[0]).join(', '));
      }
    }

    // Test 4: Try to insert a test magic link
    console.log('\n4️⃣ Testing magic link insertion...');
    
    // First create a test user
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: 'db-test@example.com',
        first_name: 'DB',
        last_name: 'Test',
        role: 'crew',
        status: 'active'
      })
      .select()
      .single();

    if (userError && userError.code !== '23505') {
      console.error('❌ Failed to create test user:', userError);
      return;
    }

    let userId = testUser?.id;
    
    // If user already exists, fetch it
    if (!userId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'db-test@example.com')
        .single();
      userId = existingUser?.id;
    }

    if (userId) {
      // Try to insert magic link
      const { data: magicLink, error: linkError } = await supabase
        .from('magic_links')
        .insert({
          user_id: userId,
          token: 'test-token-' + Date.now(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select();

      if (linkError) {
        console.error('❌ Magic link insertion failed:', linkError);
      } else {
        console.log('✅ Magic link created successfully');
        
        // Clean up
        await supabase.from('magic_links').delete().eq('id', magicLink[0].id);
      }

      // Clean up test user
      await supabase.from('users').delete().eq('id', userId);
    }

    // Test 5: Check all important tables
    console.log('\n5️⃣ Checking all required tables...');
    const tables = [
      'users',
      'magic_links',
      'training_sessions',
      'training_items',
      'quiz_results',
      'certificates'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ ${table}: NOT FOUND or ERROR`);
      } else {
        console.log(`✅ ${table}: EXISTS`);
      }
    }

    console.log('\n✨ Database schema test complete!');
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  }
}

testDatabaseSchema();