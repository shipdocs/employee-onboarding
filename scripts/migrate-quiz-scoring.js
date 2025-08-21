#!/usr/bin/env node

/**
 * Migration script to update existing quiz results with fake 80% scoring
 * This script identifies and flags old quiz results for review
 */

require('dotenv').config();
const { supabase } = require('../lib/database-supabase-compat');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateQuizScoring() {
  console.log('🔄 Starting quiz scoring migration...\n');

  try {
    // Fetch all quiz results that might have fake scoring
    const { data: results, error: fetchError } = await supabase
      .from('quiz_results')
      .select('*')
      .is('answers_data', null) // Old results won't have detailed scoring data
      .order('completed_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching quiz results:', fetchError);
      return;
    }

    console.log(`Found ${results.length} quiz results to review\n`);

    // Identify suspicious patterns (exactly 80% score)
    const suspiciousResults = [];
    const reviewNeeded = [];

    for (const result of results) {
      const percentage = result.total_questions > 0 
        ? Math.round((result.score / result.total_questions) * 100)
        : 0;

      // Check for exact 80% scores (likely fake)
      if (percentage === 80) {
        suspiciousResults.push({
          id: result.id,
          userId: result.user_id,
          phase: result.phase,
          score: result.score,
          total: result.total_questions,
          percentage: percentage,
          completedAt: result.completed_at
        });
      }

      // All old results need review since they used fake scoring
      reviewNeeded.push(result.id);
    }

    console.log(`🔍 Analysis Results:`);
    console.log(`- Total old results: ${results.length}`);
    console.log(`- Suspicious (exactly 80%): ${suspiciousResults.length}`);
    console.log(`- Needs review: ${reviewNeeded.length}\n`);

    if (suspiciousResults.length > 0) {
      console.log('⚠️  Suspicious results with exactly 80% score:');
      suspiciousResults.slice(0, 10).forEach(r => {
        console.log(`   - Result #${r.id}: User ${r.userId}, Phase ${r.phase}, Score ${r.score}/${r.total} (${r.percentage}%)`);
      });
      if (suspiciousResults.length > 10) {
        console.log(`   ... and ${suspiciousResults.length - 10} more`);
      }
      console.log('');
    }

    // Update all old results to require review
    if (reviewNeeded.length > 0) {
      console.log('📝 Marking old results for review...');
      
      const { error: updateError } = await supabase
        .from('quiz_results')
        .update({ 
          review_status: 'pending_review',
          review_comments: 'Legacy result - used old scoring system. Requires manual verification.'
        })
        .in('id', reviewNeeded);

      if (updateError) {
        console.error('❌ Error updating quiz results:', updateError);
      } else {
        console.log(`✅ Successfully marked ${reviewNeeded.length} results for review`);
      }
    }

    // Generate report
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total legacy results: ${results.length}`);
    console.log(`Marked for review: ${reviewNeeded.length}`);
    console.log(`Suspicious 80% scores: ${suspiciousResults.length}`);
    console.log('\nNext Steps:');
    console.log('1. All legacy quiz results have been marked for manual review');
    console.log('2. Users may need to retake quizzes to get accurate scoring');
    console.log('3. New submissions will use real scoring automatically');
    console.log('='.repeat(50));

    // Log migration in audit trail
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        user_id: null, // System action
        action: 'quiz_scoring_migration',
        details: {
          totalMigrated: reviewNeeded.length,
          suspiciousResults: suspiciousResults.length,
          timestamp: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('⚠️  Warning: Could not log migration in audit trail:', auditError.message);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateQuizScoring();