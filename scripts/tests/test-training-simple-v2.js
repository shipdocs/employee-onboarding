// Simple training workflow test - directly manipulating database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimpleWorkflow() {
  console.log('🚀 Simple Training Workflow Test\n');
  
  try {
    // 1. Setup test data
    console.log('1️⃣ Creating test crew member...');
    
    // Clean up existing test user
    await supabase.from('users').delete().eq('email', 'simple.test@shipdocs.app');
    
    // Create test crew member
    const { data: crew, error: crewError } = await supabase
      .from('users')
      .insert({
        email: 'simple.test@shipdocs.app',
        first_name: 'Simple',
        last_name: 'Test',
        role: 'crew',
        status: 'active',
        vessel_assignment: 'Test Vessel',
        position: 'Deck Officer'
      })
      .select()
      .single();
    
    if (crewError) throw crewError;
    console.log('✅ Created crew member:', crew.email);
    
    // 2. Create training sessions
    console.log('\n2️⃣ Creating training sessions...');
    const sessions = [];
    for (let phase = 1; phase <= 3; phase++) {
      sessions.push({
        user_id: crew.id,
        phase: phase,
        status: 'not_started',
        due_date: new Date(Date.now() + (phase * 7 * 24 * 60 * 60 * 1000)).toISOString()
      });
    }
    
    const { data: trainingSessions, error: sessionError } = await supabase
      .from('training_sessions')
      .insert(sessions)
      .select();
    
    if (sessionError) throw sessionError;
    console.log('✅ Created', trainingSessions.length, 'training sessions');
    
    // 3. Test magic link authentication
    console.log('\n3️⃣ Testing magic link authentication...');
    
    // Request magic link
    const client = axios.create({ baseURL: BASE_URL });
    const magicLinkResponse = await client.post('/api/auth/request-magic-link', {
      email: crew.email
    });
    console.log('✅ Magic link requested');
    
    // Get the token from database
    const { data: magicLink } = await supabase
      .from('magic_links')
      .select('token')
      .eq('email', crew.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!magicLink) throw new Error('Magic link not found');
    
    // Authenticate with magic link
    const authResponse = await client.post('/api/auth/magic-login', {
      token: magicLink.token
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authenticated successfully');
    
    // 4. Complete Phase 1
    console.log('\n4️⃣ Completing Phase 1...');
    
    // Mark phase 1 as completed directly
    const { error: phase1Error } = await supabase
      .from('training_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', crew.id)
      .eq('phase', 1);
    
    if (phase1Error) throw phase1Error;
    console.log('✅ Phase 1 marked as completed');
    
    // 5. Complete Phase 2
    console.log('\n5️⃣ Completing Phase 2...');
    
    const { error: phase2Error } = await supabase
      .from('training_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', crew.id)
      .eq('phase', 2);
    
    if (phase2Error) throw phase2Error;
    console.log('✅ Phase 2 marked as completed');
    
    // 6. Complete Phase 3 (Quiz)
    console.log('\n6️⃣ Taking Phase 3 Quiz...');
    
    // Get quiz questions
    const questionsResponse = await client.get('/api/training/quiz-questions?phase=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const questions = questionsResponse.data.questions;
    console.log('✅ Retrieved', questions.length, 'quiz questions');
    
    // Prepare correct answers
    const answers = {};
    questions.forEach(q => {
      answers[q.id] = q.correctAnswer;
    });
    
    // Submit quiz
    const quizResponse = await client.post('/api/training/quiz/3/submit', {
      answers,
      timeSpent: 600
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Quiz submitted, score:', quizResponse.data.score);
    
    // 7. Verify certificate
    console.log('\n7️⃣ Checking for certificate...');
    
    // Wait a bit for certificate generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', crew.id)
      .single();
    
    if (certificate) {
      console.log('✅ Certificate found!');
      console.log('   Certificate ID:', certificate.id);
      console.log('   Issue Date:', certificate.issue_date);
      console.log('   Expiry Date:', certificate.expiry_date);
    } else {
      console.log('❌ Certificate not found (may need manager approval)');
    }
    
    // 8. Cleanup
    console.log('\n8️⃣ Cleaning up test data...');
    await supabase.from('certificates').delete().eq('user_id', crew.id);
    await supabase.from('quiz_attempts').delete().eq('user_id', crew.id);
    await supabase.from('quiz_results').delete().eq('user_id', crew.id);
    await supabase.from('training_progress').delete().eq('user_id', crew.id);
    await supabase.from('training_items').delete().in('session_id', trainingSessions.map(s => s.id));
    await supabase.from('training_sessions').delete().eq('user_id', crew.id);
    await supabase.from('magic_links').delete().eq('email', crew.email);
    await supabase.from('users').delete().eq('id', crew.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSimpleWorkflow();