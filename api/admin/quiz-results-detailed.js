// Vercel API Route: /api/admin/quiz-results-detailed.js - Get detailed quiz results with real scoring
const db = require('../../lib/database-direct');
const { requireAuth, requireRole } = require('../../lib/auth');
const { createAPIHandler, createValidationError, createDatabaseError } = require('../../lib/apiHandler');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    throw createValidationError('Method not allowed', { method: req.method });
  }

  const { userId, phase, resultId } = req.query;

  // Build query
  let query = supabase
    .from('quiz_results')
    .select(`
      id,
      user_id,
      phase,
      score,
      total_questions,
      passed,
      answers,
      answers_data,
      quiz_session_id,
      review_status,
      reviewed_by,
      reviewed_at,
      review_comments,
      completed_at,
      users!quiz_results_user_id_fkey (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .order('completed_at', { ascending: false });

  // Apply filters
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (phase) {
    query = query.eq('phase', parseInt(phase));
  }
  if (resultId) {
    query = query.eq('id', resultId);
  }

  // Limit results if not filtering by specific ID
  if (!resultId) {
    query = query.limit(100);
  }

  const { data: results, error } = await query;

  if (error) {
    throw createDatabaseError('Failed to fetch quiz results', {
      originalError: _error.message
    });
  }

  // Process results to include parsed scoring data
  const processedResults = results.map(result => {
    let scoringDetails = null;

    // Parse the answers_data JSON string if it exists
    if (result.answers_data) {
      try {
        scoringDetails = typeof result.answers_data === 'string'
          ? JSON.parse(result.answers_data)
          : result.answers_data;
      } catch (e) {
        console.error('Error parsing answers_data:', e);
      }
    }

    // Calculate percentage if not in scoring details
    let percentage = 0;
    if (scoringDetails && scoringDetails.percentage) {
      percentage = scoringDetails.percentage;
    } else if (result.total_questions > 0) {
      // Fallback calculation
      percentage = Math.round((result.score / result.total_questions) * 100);
    }

    return {
      id: result.id,
      userId: result.user_id,
      user: result.users ? {
        id: result.users.id,
        email: result.users.email,
        name: `${result.users.first_name || ''} ${result.users.last_name || ''}`.trim()
      } : null,
      phase: result.phase,
      score: result.score,
      totalQuestions: result.total_questions,
      percentage: percentage,
      passed: result.passed,
      completedAt: result.completed_at,
      reviewStatus: result.review_status,
      reviewedBy: result.reviewed_by,
      reviewedAt: result.reviewed_at,
      reviewComments: result.review_comments,
      scoringDetails: scoringDetails,
      answers: result.answers,
      quizSessionId: result.quiz_session_id
    };
  });

  // Get summary statistics
  const stats = {
    totalResults: processedResults.length,
    passedCount: processedResults.filter(r => r.passed).length,
    failedCount: processedResults.filter(r => !r.passed).length,
    averageScore: processedResults.length > 0
      ? Math.round(processedResults.reduce((sum, r) => sum + r.percentage, 0) / processedResults.length)
      : 0,
    pendingReview: processedResults.filter(r => r.reviewStatus === 'pending_review').length
  };

  res.json({
    success: true,
    stats: stats,
    results: processedResults
  });
}

// Create the standardized handler with error handling and role checking
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET']
});

// Export with authentication and admin role requirement
module.exports = adminRateLimit(requireAuth(requireRole(['admin', 'manager'])(apiHandler)));
