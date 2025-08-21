// Script to set up test users for E2E testing
const { supabase } = require('../lib/database-supabase-compat');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USERS = [
  {
    email: 'manager@shipdocs.app',
    firstName: 'Test',
    lastName: 'Manager',
    role: 'manager',
    password: 'manager123',
    position: 'Test Manager'
  },
  {
    email: 'crew@shipdocs.app',
    firstName: 'Test',
    lastName: 'Crew',
    role: 'crew',
    password: 'crew123',
    vesselAssignment: 'Test Vessel',
    position: 'Test Crew Member'
  }
];

async function createTestUser(userConfig) {
  try {
    console.log(`\n👤 Creating ${userConfig.role}: ${userConfig.email}`);

    // Check if user already exists
    const existingUserResult = await db.query('SELECT * FROM users WHERE email = $1', [userConfig.email]);
    const existingUser = existingUserResult.rows[0];
    const checkError = !existingUser;

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      console.log(`   ✅ User already exists - updating password`);
      
      // Update existing user with new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userConfig.password, saltRounds);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          status: 'in_progress',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`   ✅ Password updated for ${userConfig.email}`);
      return existingUser;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userConfig.password, saltRounds);

    // Create new user
    const userData = {
      email: userConfig.email.toLowerCase(),
      first_name: userConfig.firstName,
      last_name: userConfig.lastName,
      role: userConfig.role,
      status: 'in_progress',
      is_active: true,
      password_hash: passwordHash,
      position: userConfig.position,
      preferred_language: 'en'
    };

    // Add role-specific fields
    if (userConfig.role === 'crew') {
      userData.vessel_assignment = userConfig.vesselAssignment;
      userData.expected_boarding_date = new Date().toISOString().split('T')[0];
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log(`   ✅ Created ${userConfig.role}: ${newUser.email}`);

    // If manager, create manager permissions
    if (userConfig.role === 'manager') {
      const { error: permError } = await supabase
        .from('manager_permissions')
        .insert({
          manager_id: newUser.id,
          can_manage_crew: true,
          can_view_reports: true,
          can_send_notifications: true,
          can_approve_quizzes: true,
          can_generate_certificates: true,
          created_at: new Date().toISOString()
        });

      if (permError) {
        console.log(`   ⚠️  Warning: Could not create manager permissions - ${permError.message}`);
      } else {
        console.log(`   ✅ Manager permissions created`);
      }
    }

    return newUser;

  } catch (error) {
    console.error(`   ❌ Failed to create ${userConfig.role}:`, error.message);
    throw error;
  }
}

async function setupE2ETestUsers() {
  try {
    console.log('🧪 E2E Test Users Setup');
    console.log('========================');
    console.log('Setting up test users for maritime onboarding E2E tests...\n');

    const createdUsers = [];

    for (const userConfig of TEST_USERS) {
      const user = await createTestUser(userConfig);
      createdUsers.push(user);
    }

    console.log('\n🎉 E2E test users setup completed!');
    console.log('\n📋 Created/Updated Users:');
    
    createdUsers.forEach(user => {
      console.log(`   ${user.role}: ${user.email}`);
    });

    console.log('\n🧪 Ready for E2E Testing!');
    console.log('You can now run:');
    console.log('   cd e2e-tests');
    console.log('   ./run-tests.sh smoke');
    console.log('   ./run-tests.sh full');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupE2ETestUsers()
    .then(() => {
      console.log('\nSetup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupE2ETestUsers, createTestUser };