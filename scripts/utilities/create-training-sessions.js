// Create training sessions for test user
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTrainingSessions() {
  console.log('📚 Creating training sessions for test crew member...');
  
  try {
    // Find the test crew member
    const { data: crew, error: crewError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test.crew@shipdocs.app')
      .single();
    
    if (crewError || !crew) {
      console.error('❌ Test crew member not found');
      return;
    }
    
    console.log('✅ Found test crew member:', crew.id);
    
    // Create training sessions for all phases
    const sessions = [];
    for (let phase = 1; phase <= 3; phase++) {
      sessions.push({
        user_id: crew.id,
        phase: phase,
        status: 'not_started',
        due_date: new Date(Date.now() + (phase * 7 * 24 * 60 * 60 * 1000)).toISOString() // phase * 7 days from now
      });
    }
    
    const { data: created, error: sessionError } = await supabase
      .from('training_sessions')
      .insert(sessions)
      .select();
    
    if (sessionError) {
      console.error('❌ Error creating training sessions:', sessionError);
    } else {
      console.log('✅ Created', created.length, 'training sessions');
      created.forEach(session => {
        console.log(`   Phase ${session.phase}: ${session.status} (due: ${session.due_date})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

createTrainingSessions();