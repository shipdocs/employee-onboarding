const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserSchema() {
  try {
    // Try to get an existing user to see the schema
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (users && users.length > 0) {
      console.log('Existing user schema:');
      console.log(Object.keys(users[0]));
      console.log('\nSample user:');
      console.log(users[0]);
    } else {
      console.log('No users found in table');
    }

    // Try a minimal insert to see what fields are required/allowed
    console.log('\nTrying minimal insert...');
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        email: 'test-schema@shipdocs.app',
        first_name: 'Test',
        last_name: 'Schema',
        role: 'crew'
      });

    if (insertError) {
      console.log('Insert error:', insertError);
    } else {
      console.log('Minimal insert successful');
      
      // Clean up
      await supabase
        .from('users')
        .delete()
        .eq('email', 'test-schema@shipdocs.app');
    }

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkUserSchema();