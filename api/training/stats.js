// Vercel API Route: /api/training/stats.js - Get training statistics for authenticated user
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { trainingRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = req.user;

    // Get user's training sessions
    const { data: trainingSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.userId)
      .order('phase', { ascending: true });

    if (sessionsError) {
      // console.error('❌ [DB] Error fetching training sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch training sessions' });
    }

    // Get training items for all sessions to calculate total items
    let totalItems = 0;
    let completedItems = 0;

    if (trainingSessions && trainingSessions.length > 0) {
      const sessionIds = trainingSessions.map(s => s.id);
      const { data: trainingItems, error: itemsError } = await supabase
        .from('training_items')
        .select('id, completed')
        .in('session_id', sessionIds);

      if (!itemsError && trainingItems) {
        totalItems = trainingItems.length;
        completedItems = trainingItems.filter(item => item.completed).length;
      }
    }

    // Get total training phases
    const { data: phases, error: phasesError } = await supabase
      .from('training_phases')
      .select('id, phase_number, title')
      .order('phase_number', { ascending: true });

    if (phasesError) {
      // console.error('❌ [DB] Error fetching training phases:', phasesError);
      return res.status(500).json({ error: 'Failed to fetch training phases' });
    }

    // Get completed quizzes count
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quiz_results')
      .select('id, phase, score, passed')
      .eq('user_id', user.userId);

    if (quizzesError) {
      // console.error('❌ [DB] Error fetching quiz results:', quizzesError);
      // Don't fail completely, just set empty array
    }

    // Calculate statistics based on actual training sessions
    const totalPhases = phases?.length || 3;
    const completedPhases = trainingSessions?.filter(s => s.status === 'completed').length || 0;
    const inProgressPhases = trainingSessions?.filter(s => s.status === 'in_progress').length || 0;
    const currentPhase = inProgressPhases > 0
      ? trainingSessions.find(s => s.status === 'in_progress')?.phase
      : (completedPhases < totalPhases ? completedPhases + 1 : totalPhases);

    const completedQuizzes = quizzes?.filter(q => q.passed && (q.review_status === 'approved' || !q.review_status))?.length || 0;
    const totalQuizzes = 3; // One quiz per phase

    // Check if user has completed all training
    const isCompleted = completedPhases >= totalPhases && completedQuizzes >= totalPhases;

    // Calculate overall progress percentage
    const overallProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    const stats = {
      totalPhases,
      completedPhases,
      currentPhase,
      overallProgress,
      totalItems,
      completedItems,
      quizStats: {
        completed: completedQuizzes,
        total: totalQuizzes,
        passRate: totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0
      },
      lastActivity: trainingSessions?.[0]?.updated_at || trainingSessions?.[0]?.created_at || null,
      isCompleted
    };

    return res.status(200).json(stats);

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in training/stats:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
