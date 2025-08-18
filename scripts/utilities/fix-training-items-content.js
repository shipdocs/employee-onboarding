// Fix training items to match the actual training phases content
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTrainingItems() {
  console.log('🔧 Fixing training items to match actual phase content...\n');
  
  try {
    // First, get all training phases with their correct items
    const { data: phases, error: phaseError } = await supabase
      .from('training_phases')
      .select('*')
      .eq('status', 'published')
      .order('phase_number');
    
    if (phaseError) {
      console.error('❌ Error fetching phases:', phaseError);
      return;
    }
    
    console.log(`Found ${phases.length} published training phases\n`);
    
    // Get all training sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*');
    
    if (sessionError) {
      console.error('❌ Error fetching sessions:', sessionError);
      return;
    }
    
    // Process each session
    for (const session of sessions) {
      const phase = phases.find(p => p.phase_number === session.phase);
      if (!phase) {
        console.log(`⚠️  No phase found for session ${session.id} (phase ${session.phase})`);
        continue;
      }
      
      console.log(`\n📋 Processing session ${session.id} for user ${session.user_id} - Phase ${session.phase}`);
      
      // Delete existing incorrect items
      const { error: deleteError } = await supabase
        .from('training_items')
        .delete()
        .eq('session_id', session.id);
      
      if (deleteError) {
        console.error(`❌ Error deleting old items:`, deleteError);
        continue;
      }
      
      // Insert correct items from the phase
      if (phase.items && phase.items.length > 0) {
        const itemsToInsert = phase.items.map((item, index) => ({
          session_id: session.id,
          item_number: (index + 1).toString().padStart(2, '0'),
          title: item.title || item.name || `Item ${index + 1}`,
          description: item.description || '',
          completed: false
        }));
        
        const { error: insertError } = await supabase
          .from('training_items')
          .insert(itemsToInsert);
        
        if (insertError) {
          console.error(`❌ Error inserting items:`, insertError);
        } else {
          console.log(`✅ Created ${itemsToInsert.length} correct items for Phase ${session.phase}`);
        }
      }
    }
    
    console.log('\n✅ Finished fixing training items!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

fixTrainingItems();