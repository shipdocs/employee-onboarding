// Vercel API Route: /api/crew/training/progress.js - Get crew member's training progress
const db = require('../../../lib/database-direct');
const { requireAuth } = require('../../../lib/auth');
const { trainingRateLimit } = require('../../../lib/rateLimit');

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

    // Get training phases with details
    const { data: phases, error: phasesError } = await supabase
      .from('training_phases')
      .select('*')
      .order('phase_number', { ascending: true });

    if (phasesError) {
      // console.error('❌ [DB] Error fetching training phases:', phasesError);
      return res.status(500).json({ error: 'Failed to fetch training phases' });
    }

    // Get quiz results for this user
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (quizError) {
      // console.error('❌ [DB] Error fetching quiz results:', quizError);
      // Don't fail completely, just set empty array
    }

    // Get certificates for this user
    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (certError) {
      // console.error('❌ [DB] Error fetching certificates:', certError);
      // Don't fail completely, just set empty array
    }

    // Process training sessions to get phase statuses
    const phaseStatuses = {};
    if (trainingSessions) {
      trainingSessions.forEach(session => {
        phaseStatuses[session.phase] = {
          status: session.status,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          progressPercentage: session.progress_percentage || 0
        };
      });
    }

    // Map phases with their statuses
    const phasesWithStatus = (phases || []).map(phase => ({
      ...phase,
      phase_number: phase.phase_number,
      title: phase.title,
      description: phase.description,
      status: phaseStatuses[phase.phase_number]?.status || 'not_started',
      startedAt: phaseStatuses[phase.phase_number]?.startedAt,
      completedAt: phaseStatuses[phase.phase_number]?.completedAt,
      progressPercentage: phaseStatuses[phase.phase_number]?.progressPercentage || 0
    }));

    // Calculate actual progress based on training sessions
    const completedPhases = trainingSessions?.filter(s => s.status === 'completed').length || 0;
    const inProgressPhases = trainingSessions?.filter(s => s.status === 'in_progress').length || 0;
    const currentPhase = inProgressPhases > 0
      ? trainingSessions.find(s => s.status === 'in_progress')?.phase
      : completedPhases + 1;

    // Build detailed progress response
    const detailedProgress = {
      phases: phasesWithStatus,
      quizResults: quizResults || [],
      certificates: certificates || [],
      summary: {
        totalPhases: phases?.length || 3,
        completedPhases: completedPhases,
        currentPhase: currentPhase > 3 ? 3 : currentPhase,
        completedQuizzes: quizResults?.filter(q => q.passed && q.review_status === 'approved')?.length || 0,
        totalQuizzes: 3, // One quiz per phase
        certificatesEarned: certificates?.length || 0,
        overallProgress: phases?.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0
      }
    };

    return res.status(200).json(detailedProgress);

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in crew/training/progress:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
