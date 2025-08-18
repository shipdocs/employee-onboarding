// Debug script for training progress issues
// Usage: node debug-user-training.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserTraining() {
  const userEmail = 'm.splinter@protonmail.com';
  
  console.log(`🔍 Debugging training progress for: ${userEmail}`);
  console.log('='.repeat(60));

  try {
    // 1. Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('👤 User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log();

    // 2. Get training sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('phase');

    if (sessionsError) {
      console.error('❌ Error fetching training sessions:', sessionsError);
      return;
    }

    console.log('📚 Training Sessions:');
    if (sessions.length === 0) {
      console.log('   No training sessions found');
    } else {
      sessions.forEach(session => {
        console.log(`   Phase ${session.phase}: ${session.status}`);
        console.log(`     Session ID: ${session.id}`);
        console.log(`     Started: ${session.started_at || 'Not started'}`);
        console.log(`     Completed: ${session.completed_at || 'Not completed'}`);
        console.log(`     Due: ${session.due_date || 'No due date'}`);
      });
    }
    console.log();

    // 3. Get training items for each session
    for (const session of sessions) {
      console.log(`🔧 Training Items for Phase ${session.phase}:`);
      
      const { data: items, error: itemsError } = await supabase
        .from('training_items')
        .select('*')
        .eq('session_id', session.id)
        .order('item_number');

      if (itemsError) {
        console.error(`   ❌ Error fetching items for phase ${session.phase}:`, itemsError);
        continue;
      }

      if (items.length === 0) {
        console.log('   No training items found');
      } else {
        items.forEach(item => {
          const status = item.completed_at ? '✅ Completed' : '⏳ Pending';
          console.log(`   Item ${item.item_number}: ${item.title || 'No title'}`);
          console.log(`     Status: ${status}`);
          console.log(`     Completed: ${item.completed || false} (boolean)`);
          console.log(`     Completed At: ${item.completed_at || 'null'} (timestamp)`);
          if (item.instructor_initials) {
            console.log(`     Instructor: ${item.instructor_initials}`);
          }
          if (item.comments) {
            console.log(`     Comments: ${item.comments}`);
          }
        });
        
        const completedCount = items.filter(item => item.completed_at !== null).length;
        const totalCount = items.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        console.log(`   📊 Progress: ${completedCount}/${totalCount} (${percentage}%)`);
      }
      console.log();
    }

    // 4. Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .order('phase');

    console.log('🎯 Quiz Results:');
    if (quizError) {
      console.error('   ❌ Error fetching quiz results:', quizError);
    } else if (quizResults.length === 0) {
      console.log('   No quiz results found');
    } else {
      quizResults.forEach(result => {
        const status = result.passed ? '✅ Passed' : '❌ Failed';
        console.log(`   Phase ${result.phase}: ${status}`);
        console.log(`     Score: ${result.score}/${result.total_questions}`);
        console.log(`     Percentage: ${result.percentage}%`);
        console.log(`     Taken: ${result.completed_at}`);
      });
    }
    console.log();

    // 5. Get stats endpoint data
    console.log('📈 Stats Endpoint Simulation:');
    
    const completedPhases = sessions.filter(s => s.status === 'completed').length;
    const sessionIds = sessions.map(s => s.id);
    
    let totalItems = 0;
    let completedItems = 0;
    
    if (sessionIds.length > 0) {
      const { data: allItems, error: allItemsError } = await supabase
        .from('training_items')
        .select('completed_at')
        .in('session_id', sessionIds);
      
      if (allItemsError) {
        console.error('   ❌ Error fetching all items:', allItemsError);
      } else {
        totalItems = allItems.length;
        completedItems = allItems.filter(item => item.completed_at !== null).length;
      }
    }
    
    const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const quizzesPassed = quizResults.filter(q => q.passed).length;
    
    console.log(`   Total Phases: 3`);
    console.log(`   Completed Phases: ${completedPhases}`);
    console.log(`   Total Items: ${totalItems}`);
    console.log(`   Completed Items: ${completedItems}`);
    console.log(`   Overall Progress: ${overallProgress}%`);
    console.log(`   Quizzes Passed: ${quizzesPassed}/3`);
    console.log();

    // 6. Data consistency check
    console.log('🔍 Data Consistency Check:');
    
    let hasInconsistencies = false;
    
    for (const session of sessions) {
      const { data: items } = await supabase
        .from('training_items')
        .select('completed, completed_at')
        .eq('session_id', session.id);
      
      if (items) {
        const inconsistentItems = items.filter(item => 
          (item.completed && !item.completed_at) || 
          (!item.completed && item.completed_at)
        );
        
        if (inconsistentItems.length > 0) {
          hasInconsistencies = true;
          console.log(`   ⚠️  Phase ${session.phase} has ${inconsistentItems.length} inconsistent items`);
          inconsistentItems.forEach(item => {
            console.log(`     Item: completed=${item.completed}, completed_at=${item.completed_at}`);
          });
        }
      }
    }
    
    if (!hasInconsistencies) {
      console.log('   ✅ No data inconsistencies found');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugUserTraining().catch(console.error);