// Vercel API Route: /api/manager/dashboard/stats.js - Manager dashboard statistics
const { supabase } = require('../../../lib/supabase');
const { requireManager } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const managerId = req.user.userId;
    const { withCache } = require('../../../lib/queryCache');
const { adminRateLimit } = require('../../../lib/rateLimit');

    // Performance monitoring
    const startTime = Date.now();

    // Wrap the entire stats calculation in cache
    const stats = await withCache(
      async () => {
        // Get crew members assigned to this manager (manager-specific filtering)
        const { data: crewAssignments, error: crewError } = await supabase
          .from('crew_assignments')
          .select(`
            crew_member:users!crew_assignments_crew_member_id_fkey (
              id,
              status,
              created_at
            )
          `)
          .eq('manager_id', managerId)
          .eq('is_active', true)
          .eq('crew_member.is_active', true);

        if (crewError) {
          throw new Error(`Failed to fetch crew members: ${crewError.message}`);
        }

        const crewMembers = crewAssignments?.map(assignment => assignment.crew_member) || [];
        const crewIds = crewMembers.map(crew => crew.id);

        // Get training sessions for crew members
        const { data: trainingSessions, error: trainingError } = await supabase
          .from('training_sessions')
          .select('user_id, phase, status, completed_at')
          .in('user_id', crewIds);

        if (trainingError) {
          console.error('Error fetching training sessions:', trainingError);
        }

        // Get pending quiz reviews
        const { data: pendingQuizzes, error: quizError } = await supabase
          .from('quiz_results')
          .select('id, user_id, phase, completed_at')
          .in('user_id', crewIds)
          .eq('review_status', 'pending_review');

        if (quizError) {
          console.error('Error fetching pending quizzes:', quizError);
        }

        // Calculate statistics
        const totalCrew = crewMembers.length;
        const activeTraining = crewMembers.filter(crew =>
          crew.status === 'in_progress' || crew.status === 'active'
        ).length;

        const completedTraining = crewMembers.filter(crew =>
          crew.status === 'fully_completed'
        ).length;

        const notStarted = crewMembers.filter(crew =>
          crew.status === 'not_started'
        ).length;

        const pendingReviews = pendingQuizzes?.length || 0;

        // Calculate average progress
        let totalProgress = 0;
        if (trainingSessions && trainingSessions.length > 0) {
          const progressByUser = {};
          trainingSessions.forEach(session => {
            if (!progressByUser[session.user_id]) {
              progressByUser[session.user_id] = { completed: 0, total: 0 };
            }
            progressByUser[session.user_id].total++;
            if (session.status === 'completed') {
              progressByUser[session.user_id].completed++;
            }
          });

          const userProgresses = Object.values(progressByUser).map(p =>
            p.total > 0 ? (p.completed / p.total) * 100 : 0
          );

          totalProgress = userProgresses.length > 0
            ? userProgresses.reduce((sum, p) => sum + p, 0) / userProgresses.length
            : 0;
        }

        // Get recent activity (last 10 activities)
        const { data: recentActivity } = await supabase
          .from('audit_log')
          .select('created_at, action, details')
          .in('user_id', crewIds)
          .order('created_at', { ascending: false })
          .limit(10);

        return {
          totalCrew,
          activeTraining,
          completedTraining,
          notStarted,
          pendingReviews,
          averageProgress: Math.round(totalProgress),
          recentActivity: recentActivity || []
        };
      },
      `manager_stats_${managerId}`,
      300 // 5 minute cache
    );

    // Performance monitoring
    const queryTime = Date.now() - startTime;
    console.log(`Manager dashboard stats query took ${queryTime}ms`);

    // Log slow queries
    if (queryTime > 100) {
      console.warn(`Slow query detected: ${req.url} took ${queryTime}ms`);
    }

    res.json(stats);

  } catch (_error) {
    // console.error('Error in manager dashboard stats:', _error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: _error.message
    });
  }
}

module.exports = adminRateLimit(requireManager(handler));
