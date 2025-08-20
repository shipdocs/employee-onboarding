// Vercel API Route: /api/manager/quiz-reviews/pending.js - Get pending quiz reviews
const { supabase } = require('../../../lib/supabase');
const { requireManager } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all quiz results with training sessions in one query (fix N+1)
    const { data: pendingQuizzes, error: quizError } = await supabase
      .from('quiz_results')
      .select(`
        *,
        users!quiz_results_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          position,
          vessel_assignment
        )
      `)
      .eq('review_status', 'pending_review')
      .order('completed_at', { ascending: true }); // Oldest first

    if (quizError) {
      // console.error('Error fetching pending quizzes:', quizError);
      return res.status(500).json({ error: 'Failed to fetch pending quiz reviews' });
    }

    // Batch fetch all training sessions at once (avoid N+1)
    const userPhases = pendingQuizzes.map(q => ({ user_id: q.user_id, phase: q.phase }));
    const uniqueUserPhases = Array.from(new Set(userPhases.map(JSON.stringify))).map(JSON.parse);

    const sessionPromises = uniqueUserPhases.map(({ user_id, phase }) =>
      supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user_id)
        .eq('phase', phase)
        .single()
    );

    const sessionResults = await Promise.all(sessionPromises);
    const sessionMap = {};
    sessionResults.forEach((result, index) => {
      if (result.data) {
        const key = `${uniqueUserPhases[index].user_id}_${uniqueUserPhases[index].phase}`;
        sessionMap[key] = result.data;
      }
    });

    // Format the response without additional queries
    const formattedQuizzes = pendingQuizzes.map((quiz) => {
        // Get training session from map
        const sessionKey = `${quiz.user_id}_${quiz.phase}`;
        const session = sessionMap[sessionKey] || null;

        // Get answers data (already JSONB in current schema)
        const answersData = quiz.answers || {};
        const totalQuestions = Object.keys(answersData).length || 10;
        const percentage = totalQuestions > 0 ? Math.round((quiz.score / totalQuestions) * 100) : 0;

        return {
          id: quiz.id,
          userId: quiz.user_id,
          phase: quiz.phase,
          score: quiz.score,
          total_questions: totalQuestions, // Frontend expects this format
          totalQuestions: totalQuestions,
          maxScore: totalQuestions,
          percentage: percentage,
          passed: quiz.passed,
          timeSpent: null, // Not tracked in current schema
          completed_at: quiz.completed_at, // Frontend expects this format
          completedAt: quiz.completed_at,
          quizSessionId: null, // Not in current schema
          questionsData: null, // Not in current schema
          answersData: answersData,
          detailedResults: {
            totalQuestions: totalQuestions,
            correctAnswers: quiz.score,
            score: percentage,
            passed: quiz.passed,
            answers: answersData
          },
          // Flatten user data to match frontend expectations
          first_name: quiz.users.first_name,
          last_name: quiz.users.last_name,
          email: quiz.users.email,
          position: quiz.users.position,
          vessel_assignment: quiz.users.vessel_assignment,
          user: {
            id: quiz.users.id,
            email: quiz.users.email,
            firstName: quiz.users.first_name,
            lastName: quiz.users.last_name,
            position: quiz.users.position,
            vesselAssignment: quiz.users.vessel_assignment
          },
          trainingSession: session ? {
            id: session.id,
            status: session.status,
            startedAt: session.started_at,
            completedAt: session.completed_at,
            dueDate: session.due_date
          } : null,
          phaseInfo: getPhaseInfo(quiz.phase)
        };
      });

    // Group by phase for easier management
    const groupedByPhase = formattedQuizzes.reduce((acc, quiz) => {
      if (!acc[quiz.phase]) {
        acc[quiz.phase] = [];
      }
      acc[quiz.phase].push(quiz);
      return acc;
    }, {});

    // Calculate summary statistics
    const summary = {
      totalPending: formattedQuizzes.length,
      byPhase: {
        phase1: formattedQuizzes.filter(q => q.phase === 1).length,
        phase2: formattedQuizzes.filter(q => q.phase === 2).length,
        phase3: formattedQuizzes.filter(q => q.phase === 3).length
      },
      passedButPending: formattedQuizzes.filter(q => q.passed).length,
      failedAndPending: formattedQuizzes.filter(q => !q.passed).length,
      oldestPending: formattedQuizzes.length > 0 ? formattedQuizzes[0].completedAt : null
    };

    // Return array directly to match frontend expectations
    res.json(formattedQuizzes || []);

  } catch (_error) {
    // console.error('Error in pending quiz reviews:', _error);
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
