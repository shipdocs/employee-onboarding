// Check database connection and sync status
require('dotenv').config();
const { supabase } = require('../lib/database-supabase-compat');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...\n');
  
  try {
    // 1. Test connection
    console.log('1️⃣ Testing database connection...');
    const { data: test, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return;
    }
    console.log('✅ Database connection successful\n');
    
    // 2. Check key tables
    console.log('2️⃣ Checking key tables...');
    const tables = [
      'users',
      'training_phases',
      'training_sessions',
      'training_items',
      'quiz_results',
      'certificates'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} records`);
      }
    }
    
    // 3. Check schema version
    console.log('\n3️⃣ Checking for migrations table...');
    const { data: migrations, error: migError } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: false })
      .limit(1);
    
    if (migError) {
      console.log('⚠️  No migrations table found (might be using Supabase migrations)');
    } else if (migrations && migrations.length > 0) {
      console.log(`✅ Latest migration: ${migrations[0].version}`);
    }
    
    // 4. Check environment
    console.log('\n4️⃣ Environment info:');
    console.log(`Database URL: ${process.env.SUPABASE_URL}`);
    console.log(`Project Ref: ${process.env.SUPABASE_PROJECT_REF || 'Not set'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // 5. Check test users
    console.log('\n5️⃣ Checking test users for dev mode...');
    const testUsers = [
      'adminmartexx@shipdocs.app',
      'manager@shipdocs.app',
      'm.splinter@protonmail.com'
    ];
    
    for (const email of testUsers) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('email', email)
        .single();
      
      if (error || !user) {
        console.log(`❌ ${email}: Not found`);
      } else {
        console.log(`✅ ${email}: ${user.role} (${user.status})`);
      }
    }
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkDatabaseStatus();