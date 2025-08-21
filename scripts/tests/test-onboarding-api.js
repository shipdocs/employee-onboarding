// Test script for onboarding API endpoints
import { supabase } from './lib/supabase.js';

const TEST_CONFIG = {
  testAccounts: [
    {
      email: 'crew1@test.com',
      password: 'test123',
      role: 'crew'
    }
  ]
};

async function testOnboardingAPI() {
  console.log('🧪 Testing Onboarding API Endpoints...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if onboarding tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('onboarding_progress')
      .select('count(*)')
      .limit(1);

    if (tablesError) {
      console.error('❌ Tables check failed:', tablesError.message);
      return;
    }
    console.log('✅ Onboarding tables exist');

    // Test 2: Get test user
    console.log('\n2. Getting test user...');
    const testAccount = TEST_CONFIG.testAccounts[0];
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      console.error('❌ Test user not found:', userError?.message);
      return;
    }
    console.log('✅ Test user found:', user.email);

    // Test 3: Test direct database insert
    console.log('\n3. Testing direct database insert...');
    const { data: progressData, error: progressError } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        current_step: 0,
        completed_steps: [],
        custom_preferences: { test: true }
      })
      .select()
      .single();

    if (progressError) {
      console.error('❌ Progress insert failed:', progressError.message);
      return;
    }
    console.log('✅ Progress insert successful:', progressData.id);

    // Test 4: Test analytics insert
    console.log('\n4. Testing analytics insert...');
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('onboarding_analytics')
      .insert({
        user_id: user.id,
        event_type: 'step_start',
        step_number: 0,
        event_data: { test: true },
        session_id: 'test_session'
      })
      .select()
      .single();

    if (analyticsError) {
      console.error('❌ Analytics insert failed:', analyticsError.message);
      return;
    }
    console.log('✅ Analytics insert successful:', analyticsData.id);

    // Test 5: Clean up test data
    console.log('\n5. Cleaning up test data...');
    await db.from('onboarding_analytics').delete().eq('id', analyticsData.id);
    await db.from('onboarding_progress').delete().eq('id', progressData.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All onboarding API tests passed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testOnboardingAPI();
