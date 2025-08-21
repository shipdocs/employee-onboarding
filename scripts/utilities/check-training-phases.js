// Check training phases content
require('dotenv').config();
const { supabase } = require('../lib/database-supabase-compat');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTrainingPhases() {
  console.log('📚 Checking training phases in database...\n');
  
  try {
    const { data: phases, error } = await supabase
      .from('training_phases')
      .select('*')
      .order('phase_number');
    
    if (error) {
      console.error('❌ Error fetching phases:', error);
      return;
    }
    
    if (!phases || phases.length === 0) {
      console.log('⚠️  No training phases found in database');
      return;
    }
    
    console.log(`Found ${phases.length} training phases:\n`);
    
    phases.forEach(phase => {
      console.log(`Phase ${phase.phase_number}: ${phase.title}`);
      console.log(`Status: ${phase.status}`);
      console.log(`Description: ${phase.description}`);
      
      if (phase.items && Array.isArray(phase.items)) {
        console.log(`Items (${phase.items.length}):`);
        phase.items.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.title || item.name || 'Untitled'}`);
          if (item.description) {
            console.log(`     ${item.description.substring(0, 60)}...`);
          }
        });
      } else {
        console.log('Items: None or invalid format');
      }
      
      console.log('\n---\n');
    });
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkTrainingPhases();