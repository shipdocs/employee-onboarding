const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { workflowEngine } = require('../../../services/workflow-engine.js');
const { apiRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  try {

    const user = req.user;
    const { slug } = req.query;

    if (req.method === 'GET') {

      try {
        // Get workflow by slug first
        const workflow = await workflowEngine.getWorkflowBySlug(slug);
        if (!workflow) {
          return res.status(404).json({ error: `Workflow not found: ${slug}` });
        }

        // Parse date range from query parameters
        const dateRange = {};
        if (req.query.start_date) {
          dateRange.start_date = req.query.start_date;
        }
        if (req.query.end_date) {
          dateRange.end_date = req.query.end_date;
        }

        // Get basic statistics
        const stats = await workflowEngine.getWorkflowStatistics(workflow.id, dateRange);

        // Get all instances for more detailed analytics
        const { data: allInstances, error: instancesError } = await workflowEngine.db.client
          .from('workflow_instances')
          .select(`
            id, user_id, status, current_phase, started_at, completed_at,
            user:users (
              id, full_name, role, created_at
            )
          `)
          .eq('workflow_id', workflow.id);

        if (instancesError) throw instancesError;

        // Calculate phase-wise statistics
        const phaseStats = {};
        workflow.workflow_phases.forEach(phase => {
          phaseStats[phase.phase_number] = {
            phase_name: phase.name,
            users_reached: allInstances.filter(i => i.current_phase >= phase.phase_number).length,
            users_completed: allInstances.filter(i => i.current_phase > phase.phase_number || i.status === 'completed').length,
            completion_rate: 0
          };
        });

        // Calculate completion rates for each phase
        Object.keys(phaseStats).forEach(phaseNum => {
          const phase = phaseStats[phaseNum];
          if (phase.users_reached > 0) {
            phase.completion_rate = Math.round((phase.users_completed / phase.users_reached) * 100);
          }
        });

        // Calculate user role breakdown
        const roleBreakdown = allInstances.reduce((acc, instance) => {
          const role = instance.user?.role || 'unknown';
          if (!acc[role]) {
            acc[role] = { total: 0, completed: 0, in_progress: 0, abandoned: 0 };
          }
          acc[role].total++;
          acc[role][instance.status]++;
          return acc;
        }, {});

        // Calculate recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = allInstances.filter(i =>
          new Date(i.started_at) >= thirtyDaysAgo
        ).length;

        const response = {
          workflow: {
            id: workflow.id,
            name: workflow.name,
            slug: workflow.slug,
            type: workflow.type,
            status: workflow.status,
            phase_count: workflow.workflow_phases.length
          },
          statistics: {
            ...stats,
            recent_activity_30_days: recentActivity,
            average_completion_time_hours: stats.average_completion_time > 0
              ? Math.round(stats.average_completion_time / (1000 * 60 * 60))
              : 0
          },
          phase_statistics: phaseStats,
          role_breakdown: roleBreakdown,
          date_range: dateRange
        };

        return res.status(200).json(response);

      } catch (statsError) {
        // console.error('❌ [STATS] Error generating statistics:', statsError);
        return res.status(500).json({
          error: 'Failed to generate workflow statistics',
          details: statsError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    // console.error('❌ [ERROR] Critical error generating workflow statistics:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(requireManagerOrAdmin(handler));
