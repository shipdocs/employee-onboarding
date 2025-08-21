// Debug training items for a specific user
require('dotenv').config();
const { supabase } = require('../lib/database-supabase-compat');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTrainingItems(userEmail) {
  console.log(`🔍 Debugging training items for user: ${userEmail}`);
  
  try {
    // Find the user
    const userResult = await db.query('SELECT id, email FROM users WHERE email = $1', [userEmail]);
    const user = userResult.rows[0];
    const userError = !user;
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Get training sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('phase');
    
    if (sessionError) {
      console.error('❌ Error fetching sessions:', sessionError);
      return;
    }
    
    console.log(`\n📚 Training Sessions:`);
    for (const session of sessions) {
      console.log(`\nPhase ${session.phase}: Session ID ${session.id} - Status: ${session.status}`);
      
      // Get training items for this session
      const { data: items, error: itemsError } = await supabase
        .from('training_items')
        .select('*')
        .eq('session_id', session.id)
        .order('item_number');
      
      if (itemsError) {
        console.error(`❌ Error fetching items:`, itemsError);
        continue;
      }
      
      console.log(`  Items: ${items.length}`);
      if (items.length > 0) {
        items.forEach(item => {
          console.log(`    ${item.item_number}. ${item.title} - ${item.completed ? '✅ Completed' : '⏳ Pending'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run with the user's email
const userEmail = process.argv[2] || 'm.splinter@protonmail.com';
debugTrainingItems(userEmail);