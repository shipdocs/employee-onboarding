// Vercel API Route: /api/manager/onboarding/overview.js - Get onboarding overview for managers
const { supabase } = require('../../../lib/supabase');
const { requireManagerOrAdmin } = require('../../../lib/auth');

// Admin schema for sensitive views
const ADMIN_SCHEMA = 'admin_views';
const { adminRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get onboarding overview using the admin view (requires service role)
    const { data: overview, error: overviewError } = await supabase
      .schema(ADMIN_SCHEMA)
      .from('onboarding_overview')
      .select('*')
      .order('onboarding_last_updated', { ascending: false, nullsFirst: false });

    if (overviewError) {
      // console.error('Error fetching onboarding overview:', overviewError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get analytics summary
    const { data: analytics, error: analyticsError } = await supabase
      .from('onboarding_analytics')
      .select(`
        event_type,
        step_number,
        created_at,
        users!inner(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (analyticsError) {
      // console.error('Error fetching onboarding analytics:', analyticsError);
      return res.status(500).json({ error: 'Analytics database error' });
    }

    // Calculate summary statistics
    const stats = {
      total_crew: overview.length,
      completed_onboarding: overview.filter(u => u.onboarding_completed).length,
      in_progress: overview.filter(u => u.onboarding_status === 'in_progress').length,
      not_started: overview.filter(u => u.onboarding_status === 'not_started').length,
      average_completion_time: null
    };

    // Calculate average completion time
    const completedWithTime = overview.filter(u =>
      u.onboarding_completed && u.time_spent_seconds
    );

    if (completedWithTime.length > 0) {
      const totalTime = completedWithTime.reduce((sum, u) => sum + u.time_spent_seconds, 0);
      stats.average_completion_time = Math.round(totalTime / completedWithTime.length);
    }

    // Group analytics by event type for insights
    const eventSummary = analytics.reduce((acc, event) => {
      if (!acc[event.event_type]) {
        acc[event.event_type] = 0;
      }
      acc[event.event_type]++;
      return acc;
    }, {});

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = analytics.filter(event =>
      new Date(event.created_at) >= sevenDaysAgo
    );

    return res.json({
      overview,
      stats,
      recent_analytics: recentActivity.slice(0, 20), // Last 20 events
      event_summary: eventSummary,
      summary: {
        total_events: analytics.length,
        recent_events: recentActivity.length,
        completion_rate: stats.total_crew > 0
          ? Math.round((stats.completed_onboarding / stats.total_crew) * 100)
          : 0
      }
    });

  } catch (_error) {
    // console.error('Error in onboarding overview endpoint:', _error);
    res.status(500).json({
      error: 'Failed to get onboarding overview',
      message: _error.message
    });
  }
}

module.exports = adminRateLimit(requireManagerOrAdmin(handler));
