// Fix missing training sessions for existing crew members
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingTrainingSessions() {
  console.log('🔧 Fixing missing training sessions for existing crew members...');
  
  try {
    // Find all crew members
    const { data: crewMembers, error: crewError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'crew');
    
    if (crewError) {
      console.error('❌ Error fetching crew members:', crewError);
      return;
    }
    
    console.log(`✅ Found ${crewMembers.length} crew members`);
    
    // Check each crew member for missing training sessions
    for (const crew of crewMembers) {
      console.log(`\n📋 Checking crew member: ${crew.email}`);
      
      // Get existing training sessions
      const { data: existingSessions, error: sessionError } = await supabase
        .from('training_sessions')
        .select('phase')
        .eq('user_id', crew.id);
      
      if (sessionError) {
        console.error(`❌ Error checking sessions for ${crew.email}:`, sessionError);
        continue;
      }
      
      const existingPhases = existingSessions.map(s => s.phase);
      const missingPhases = [1, 2, 3].filter(phase => !existingPhases.includes(phase));
      
      if (missingPhases.length === 0) {
        console.log(`✅ ${crew.email} has all training sessions`);
        continue;
      }
      
      console.log(`⚠️  ${crew.email} is missing phases: ${missingPhases.join(', ')}`);
      
      // Create missing training sessions
      const sessionsToCreate = missingPhases.map(phase => ({
        user_id: crew.id,
        phase: phase,
        status: 'not_started',
        due_date: new Date(Date.now() + (phase * 7 * 24 * 60 * 60 * 1000)).toISOString()
      }));
      
      const { error: createError } = await supabase
        .from('training_sessions')
        .insert(sessionsToCreate);
      
      if (createError) {
        console.error(`❌ Error creating sessions for ${crew.email}:`, createError);
      } else {
        console.log(`✅ Created ${sessionsToCreate.length} training sessions for ${crew.email}`);
      }
    }
    
    console.log('\n✅ Finished fixing missing training sessions');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

fixMissingTrainingSessions();