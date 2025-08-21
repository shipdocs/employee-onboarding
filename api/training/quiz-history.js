// Vercel API Route: /api/training/quiz-history.js - Get user's quiz history
const db = require('../../lib/database-direct');
const { verifyJWT } = require('../../lib/auth');
const { trainingRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get quiz results for this user
    const { data: quizResults, error } = await supabase
      .from('quiz_results')
      .select(`
        id,
        phase,
        score,
        passed,
        answers,
        review_status,
        reviewed_by,
        reviewed_at,
        review_notes,
        completed_at,
        created_at
      `)
      .eq('user_id', decoded.userId)
      .order('completed_at', { ascending: false });

    if (error) {
      // console.error('Error fetching quiz history:', _error);
      return res.status(500).json({ error: 'Failed to fetch quiz history' });
    }

    // Format the results to match the expected frontend format
    const formattedResults = quizResults.map(result => {
      // Calculate total questions and percentage from answers if available
      const answersData = result.answers || {};
      const totalQuestions = Object.keys(answersData).length || 10; // Default to 10 if no answers data
      const percentage = totalQuestions > 0 ? Math.round((result.score / totalQuestions) * 100) : 0;

      return {
        id: result.id,
        phase: result.phase,
        score: result.score,
        total_questions: totalQuestions,
        passed: result.passed,
        review_status: result.review_status || 'completed',
        reviewed_at: result.reviewed_at || result.completed_at,
        review_comments: result.review_notes,
        completed_at: result.completed_at,
        percentage: percentage,
        max_score: totalQuestions,
        time_spent: null, // Not tracked in current schema
        detailed_results: {
          totalQuestions: totalQuestions,
          correctAnswers: result.score,
          score: percentage,
          passed: result.passed,
          answers: answersData
        }
      };
    });

    res.json(formattedResults);

  } catch (_error) {
    // console.error('Error in quiz history endpoint:', _error);
    res.status(500).json({
      error: 'Failed to get quiz history',
      message: _error.message
    });
  }
}

module.exports = trainingRateLimit(handler);
