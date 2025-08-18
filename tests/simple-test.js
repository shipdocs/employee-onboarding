const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Testing database connection...');
  
  // Test workflow_phase_items table
  const { data: items, error } = await supabase
    .from('workflow_phase_items')
    .select('*')
    .eq('content_source', 'training_reference')
    .limit(3);
    
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Found training-linked items:', items.length);
  
  if (items.length > 0) {
    console.log('Sample item:', {
      title: items[0].title,
      content_source: items[0].content_source,
      training_phase_id: items[0].training_phase_id,
      training_item_number: items[0].training_item_number
    });
    
    // Test training content fetch
    if (items[0].training_phase_id) {
      const { data: training, error: trainingError } = await supabase
        .from('training_phases')
        .select('items')
        .eq('id', items[0].training_phase_id)
        .single();
        
      if (!trainingError && training?.items) {
        const trainingItem = training.items.find(
          item => item.item_number === items[0].training_item_number
        );
        
        if (trainingItem) {
          console.log('✅ Rich training content available!');
          console.log('Has objectives:', !!trainingItem.objectives);
          console.log('Has keyPoints:', !!trainingItem.keyPoints);
          console.log('Has procedures:', !!trainingItem.procedures);
        }
      }
    }
  }
}

test().catch(console.error);