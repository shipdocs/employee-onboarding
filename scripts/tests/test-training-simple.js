// Simplified training workflow test
// Tests the training workflow by directly using the database and API endpoints

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class SimpleTrainingTest {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000
    });
  }

  async setupTestUser() {
    console.log('🔧 Setting up test user...\n');
    
    // Clean up any existing test user
    await supabase.from('users').delete().eq('email', 'training-test@example.com');
    
    // Create test crew member
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: 'training-test@example.com',
        first_name: 'Training',
        last_name: 'Test',
        role: 'crew',
        status: 'active',
        vessel_assignment: 'Test Vessel',
        position: 'Deck Officer'
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    
    console.log('✅ Created test user:', user.email);
    
    // Generate JWT token for the user
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h', issuer: 'crew-onboarding-app' }
    );
    console.log('✅ Generated JWT token for authentication');
    
    return { user, token };
  }

  async testTrainingWorkflow(token) {
    console.log('\n📚 Testing Training Workflow...\n');
    
    // Test 1: Get crew profile
    console.log('1️⃣ Getting crew profile...');
    try {
      const profileResponse = await this.client.get('/api/crew/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Profile retrieved:', profileResponse.data.user.email);
    } catch (error) {
      console.log('❌ Profile error:', error.response?.data || error.message);
    }

    // Test 2: Get training progress
    console.log('\n2️⃣ Getting training progress...');
    try {
      const progressResponse = await this.client.get('/api/crew/training/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Training progress:', progressResponse.data);
    } catch (error) {
      console.log('❌ Progress error:', error.response?.data || error.message);
    }

    // Test 3: Get Phase 1 data
    console.log('\n3️⃣ Getting Phase 1 training data...');
    try {
      const phase1Response = await this.client.get('/api/crew/training/phase/1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Phase 1 data retrieved');
      console.log('   Status:', phase1Response.data.status);
      console.log('   Items:', phase1Response.data.trainingItems?.length || 0);
    } catch (error) {
      console.log('❌ Phase 1 error:', error.response?.data || error.message);
    }

    // Test 4: Start Phase 1
    console.log('\n4️⃣ Starting Phase 1 training...');
    try {
      const startResponse = await this.client.post('/api/crew/training/phase/1/start', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Phase 1 started:', startResponse.data.message);
    } catch (error) {
      console.log('❌ Start error:', error.response?.data || error.message);
    }

    // Test 5: Complete a training item
    console.log('\n5️⃣ Completing training item...');
    try {
      const completeResponse = await this.client.post('/api/training/phase/1/item/1/complete', {
        instructorSignature: 'Test Instructor'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Item completed:', completeResponse.data.message);
    } catch (error) {
      console.log('❌ Complete error:', error.response?.data || error.message);
    }

    // Test 6: Get updated progress
    console.log('\n6️⃣ Getting updated progress...');
    try {
      const updatedProgress = await this.client.get('/api/crew/training/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Updated progress:', updatedProgress.data);
    } catch (error) {
      console.log('❌ Updated progress error:', error.response?.data || error.message);
    }
  }

  async cleanup(userId) {
    console.log('\n🧹 Cleaning up...');
    
    // Delete test data
    await supabase.from('training_items').delete().eq('session_id', userId);
    await supabase.from('training_sessions').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    
    console.log('✅ Test data cleaned up');
  }

  async run() {
    console.log('🚀 Starting Simple Training Workflow Test\n');
    console.log('================================\n');
    
    let testData = null;
    
    try {
      // Setup
      testData = await this.setupTestUser();
      
      // Run tests
      await this.testTrainingWorkflow(testData.token);
      
      console.log('\n✨ Test completed!');
      
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      console.error(error);
    } finally {
      // Cleanup
      if (testData?.user?.id) {
        await this.cleanup(testData.user.id);
      }
    }
  }
}

// Run the test
const test = new SimpleTrainingTest();
test.run();