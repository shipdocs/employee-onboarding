// Vercel API Route: /api/manager/onboarding-reviews/index.js - Get onboarding reviews
const { supabase } = require('../../../lib/supabase');
const { requireManager } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all completed training sessions for onboarding review
    // Note: training_sessions table doesn't have review_status column, only status
    const { data: onboardingReviews, error: reviewError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        users!training_sessions_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          position,
          vessel_assignment,
          status
        )
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true }); // Oldest first

    if (reviewError) {
      // console.error('Error fetching onboarding reviews:', reviewError);
      return res.status(500).json({ error: 'Failed to fetch onboarding reviews' });
    }

    // Get all quiz results for users with completed sessions
    const userIds = [...new Set(onboardingReviews.map(session => session.user_id))];
    const { data: allQuizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('user_id, phase, passed, review_status, score')
      .in('user_id', userIds);

    if (quizError) {
      // console.error('Error fetching quiz results:', quizError);
    }

    // Get training items count for each session
    const sessionIds = onboardingReviews.map(session => session.id);
    const { data: trainingItems, error: itemsError } = await supabase
      .from('training_items')
      .select('session_id, completed')
      .in('session_id', sessionIds);

    if (itemsError) {
      // console.error('Error fetching training items:', itemsError);
    }

    // Group sessions by user first
    const groupedByUser = (onboardingReviews || []).reduce((acc, session) => {
      const userId = session.user_id;

      if (!acc[userId]) {
        acc[userId] = {
          user: {
            id: session.users.id,
            email: session.users.email,
            firstName: session.users.first_name,
            lastName: session.users.last_name,
            position: session.users.position,
            vesselAssignment: session.users.vessel_assignment,
            status: session.users.status
          },
          phases: []
        };
      }

      // Get quiz data for this phase
      const phaseQuizzes = (allQuizResults || []).filter(q =>
        q.user_id === userId && q.phase === session.phase
      );
      const latestQuiz = phaseQuizzes.length > 0 ? phaseQuizzes[phaseQuizzes.length - 1] : null;

      // Get training items for this session
      const sessionItems = (trainingItems || []).filter(item => item.session_id === session.id);
      const completedItems = sessionItems.filter(item => item.completed).length;
      const totalItems = sessionItems.length;

      // Add this phase to the user's phases array
      acc[userId].phases.push({
        phase: session.phase,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        progress: 100,
        completedItems: completedItems,
        totalItems: totalItems,
        quiz: latestQuiz ? {
          passed: latestQuiz.passed,
          reviewStatus: latestQuiz.review_status,
          score: latestQuiz.score
        } : null,
        phaseInfo: getPhaseInfo(session.phase)
      });

      return acc;
    }, {});

    // Convert to array format expected by frontend
    const formattedReviews = Object.values(groupedByUser);

    // Return array directly to match frontend expectations
    res.json(formattedReviews || []);

  } catch (_error) {
    // console.error('Error in onboarding reviews:', _error);
    // Return empty array instead of 500 error for frontend stability
    res.json([]);
  }
}

// Helper function to get phase information
function getPhaseInfo(phase) {
  const phaseData = {
    1: {
      title: 'Phase 1: Basic Safety Training',
      description: 'Essential safety procedures and emergency protocols',
      duration: '24 hours',
      passingScore: 80
    },
    2: {
      title: 'Phase 2: Operational Training',
      description: 'Vessel operations and cargo handling procedures',
      duration: '72 hours',
      passingScore: 85
    },
    3: {
      title: 'Phase 3: Advanced Training',
      description: 'Advanced procedures and specialized operations',
      duration: '1 week',
      passingScore: 90
    }
  };

  return phaseData[phase] || null;
}

module.exports = adminRateLimit(requireManager(handler));
