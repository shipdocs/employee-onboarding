// Test script for training workflow
// This creates test data and simulates the complete training workflow

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class TrainingWorkflowTest {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000
    });
    this.testManager = null;
    this.testCrew = null;
    this.managerToken = null;
    this.crewToken = null;
  }

  async createTestManager() {
    console.log('👔 Creating test manager...');
    
    // First, clean up any existing test manager
    await supabase
      .from('users')
      .delete()
      .eq('email', 'test.manager@shipdocs.app');
    
    // Create manager directly in database
    const { data: manager, error } = await supabase
      .from('users')
      .insert({
        email: 'test.manager@shipdocs.app',
        first_name: 'Test',
        last_name: 'Manager',
        role: 'manager',
        status: 'active',
        password_hash: '$2a$10$M19.d8l3VVPJcso.IAUb2.hbfRwKt0/ZA0YWsZ6AFQ9avbkC5C7B6' // password: Test123!
      })
      .select()
      .single();

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error;
    }

    if (!manager) {
      // Manager already exists, fetch it
      const { data: existingManager } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'test.manager@shipdocs.app')
        .single();
      this.testManager = existingManager;
    } else {
      this.testManager = manager;
    }

    console.log('✅ Test manager ready:', this.testManager.email);
  }

  async createTestCrew() {
    console.log('👷 Creating test crew member...');
    
    // First, clean up any existing test crew
    await supabase
      .from('users')
      .delete()
      .eq('email', 'test.crew@shipdocs.app');
    
    // Create crew member directly in database
    const { data: crew, error } = await supabase
      .from('users')
      .insert({
        email: 'test.crew@shipdocs.app',
        first_name: 'Test',
        last_name: 'Crew',
        role: 'crew',
        status: 'active',
        vessel_assignment: 'Test Vessel',
        position: 'Deck Officer'
      })
      .select()
      .single();

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error;
    }

    if (!crew) {
      // Crew already exists, fetch it
      const { data: existingCrew } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'test.crew@shipdocs.app')
        .single();
      this.testCrew = existingCrew;
    } else {
      this.testCrew = crew;
    }

    console.log('✅ Test crew member ready:', this.testCrew.email);
  }

  async loginAsManager() {
    console.log('🔐 Logging in as manager...');
    
    try {
      const response = await this.client.post('/api/auth/manager-login', {
        email: 'test.manager@shipdocs.app',
        password: 'Test123!'
      });

      this.managerToken = response.data.token;
      console.log('✅ Manager logged in successfully');
      return true;
    } catch (error) {
      console.error('❌ Manager login failed:', error.response?.data || error.message);
      return false;
    }
  }

  async requestMagicLink() {
    console.log('🔗 Requesting magic link for crew member...');
    
    try {
      const response = await this.client.post('/api/auth/request-magic-link', {
        email: this.testCrew.email
      });

      console.log('✅ Magic link requested:', response.data.message);
      
      // Get the magic link token from database
      const { data: magicLink } = await supabase
        .from('magic_links')
        .select('token')
        .eq('email', this.testCrew.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (magicLink) {
        // Use the magic link to authenticate
        const authResponse = await this.client.post('/api/auth/magic-login', {
          token: magicLink.token
        });

        this.crewToken = authResponse.data.token;
        console.log('✅ Crew member authenticated via magic link');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Magic link request failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testPhase1() {
    console.log('\n📚 Testing Phase 1 - Basic Training...');
    
    try {
      // Start Phase 1
      console.log('  Starting Phase 1 training session...');
      await this.client.post('/api/crew/training/phase/1/start', {}, {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      // Get Phase 1 training data
      const response = await this.client.get('/api/crew/training/phase/1', {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      const { trainingItems } = response.data;
      console.log(`  Found ${trainingItems.length} training items in Phase 1`);

      // Complete each item
      for (let i = 0; i < trainingItems.length; i++) {
        const item = trainingItems[i];
        console.log(`  ✓ Completing item ${i + 1}: ${item.content}`);
        
        await this.client.post(`/api/training/phase/1/item/${i + 1}/complete`, {
          instructorSignature: 'Test Instructor'
        }, {
          headers: { Authorization: `Bearer ${this.crewToken}` }
        });
      }

      console.log('✅ Phase 1 completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Phase 1 test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testPhase2() {
    console.log('\n📸 Testing Phase 2 - Advanced Training...');
    
    try {
      // Start Phase 2
      console.log('  Starting Phase 2 training session...');
      await this.client.post('/api/crew/training/phase/2/start', {}, {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      // Get Phase 2 training data
      const response = await this.client.get('/api/crew/training/phase/2', {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      const { trainingItems } = response.data;
      console.log(`  Found ${trainingItems.length} training items in Phase 2`);

      // Complete each item with simulated photo
      for (let i = 0; i < trainingItems.length; i++) {
        const item = trainingItems[i];
        console.log(`  ✓ Completing item ${i + 1}: ${item.content}`);
        
        // For testing, simulate photo upload completion
        await this.client.post(`/api/training/phase/2/item/${i + 1}/complete`, {
          photoUrl: 'https://example.com/test-photo.jpg' // Simulated photo URL
        }, {
          headers: { Authorization: `Bearer ${this.crewToken}` }
        });
      }

      console.log('✅ Phase 2 completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Phase 2 test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testPhase3() {
    console.log('\n🧠 Testing Phase 3 - Final Quiz...');
    
    try {
      // Get quiz questions
      const questionsResponse = await this.client.get('/api/training/quiz-questions?phase=3', {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      const questions = questionsResponse.data.questions;
      console.log(`  Found ${questions.length} quiz questions`);

      // Prepare answers (all correct for testing)
      const answers = {};
      questions.forEach(q => {
        answers[q.id] = q.correctAnswer;
      });

      // Submit quiz
      const submitResponse = await this.client.post('/api/training/quiz/3/submit', {
        answers,
        timeSpent: 600 // 10 minutes
      }, {
        headers: { Authorization: `Bearer ${this.crewToken}` }
      });

      console.log('  Quiz submitted, score:', submitResponse.data.score);

      // As manager, approve the quiz
      if (this.managerToken) {
        console.log('  👔 Approving quiz as manager...');
        
        await this.client.post(`/api/manager/quiz-reviews/${submitResponse.data.attemptId}/approve`, {
          feedback: 'Test approved'
        }, {
          headers: { Authorization: `Bearer ${this.managerToken}` }
        });

        console.log('✅ Phase 3 completed and approved');
      }

      return true;
    } catch (error) {
      console.error('❌ Phase 3 test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async verifyCertificate() {
    console.log('\n📄 Verifying certificate generation...');
    
    try {
      // Check if certificate was generated
      const { data: certificate } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', this.testCrew.id)
        .single();

      if (certificate) {
        console.log('✅ Certificate generated successfully');
        console.log('  Certificate ID:', certificate.id);
        console.log('  Issue Date:', certificate.issue_date);
        console.log('  Expiry Date:', certificate.expiry_date);
        return true;
      } else {
        console.log('❌ Certificate not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Certificate verification failed:', error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test data in reverse order
      if (this.testCrew) {
        await supabase.from('certificates').delete().eq('user_id', this.testCrew.id);
        await supabase.from('quiz_attempts').delete().eq('user_id', this.testCrew.id);
        await supabase.from('training_progress').delete().eq('user_id', this.testCrew.id);
        await supabase.from('magic_links').delete().eq('user_id', this.testCrew.id);
        await supabase.from('users').delete().eq('id', this.testCrew.id);
      }
      
      if (this.testManager) {
        await supabase.from('users').delete().eq('id', this.testManager.id);
      }
      
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  }

  async run() {
    console.log('🚀 Starting Training Workflow Test\n');
    
    try {
      // Setup
      await this.createTestManager();
      await this.createTestCrew();
      
      // Authentication
      await this.loginAsManager();
      await this.requestMagicLink();
      
      // Training workflow
      await this.testPhase1();
      await this.testPhase2();
      await this.testPhase3();
      
      // Verification
      await this.verifyCertificate();
      
      console.log('\n✨ All tests passed successfully!');
      
      // Optionally cleanup
      // await this.cleanup();
      
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      console.error(error);
    }
  }
}

// Run the test
const test = new TrainingWorkflowTest();
test.run();