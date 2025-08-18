// api/admin/refactoring-metrics.js - Refactoring Metrics API
const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');

/**
 * Refactoring Metrics API
 *
 * Provides real-time metrics for monitoring refactoring rollout:
 * - System health score
 * - Error rates
 * - Performance metrics
 * - Rollout progress
 * - Rollback triggers
 */
async function handler(req, res) {
  // Apply CORS headers
  const { applyCors } = require('../../lib/cors');
const { adminRateLimit } = require('../../lib/rateLimit');
  if (!applyCors(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get time range from query params
    const timeRange = req.query.timeRange || '24h';
    const startTime = getStartTime(timeRange);

    // Fetch various metrics
    const [
      systemHealth,
      errorMetrics,
      performanceMetrics,
      rolloutProgress,
      userMetrics,
      performanceTrend,
      errorTrend
    ] = await Promise.all([
      calculateSystemHealth(startTime),
      getErrorMetrics(startTime),
      getPerformanceMetrics(startTime),
      getRolloutProgress(),
      getUserMetrics(startTime),
      getPerformanceTrend(startTime),
      getErrorTrend(startTime)
    ]);

    // Calculate rollback trigger status
    const errorRate = errorMetrics.errorRate || 0;
    const performanceDegradation = performanceMetrics.degradation || 1;
    const userComplaints = errorMetrics.userComplaints || 0;

    const metrics = {
      systemHealth,
      errorRate,
      avgResponseTime: performanceMetrics.avgResponseTime,
      baselineResponseTime: performanceMetrics.baseline,
      performanceDegradation,
      activeUsers: userMetrics.activeUsers,
      userComplaints,
      rolloutProgress,
      performanceTrend,
      errorTrend,
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json(metrics);
  } catch (_error) {
    // console.error('Refactoring metrics API error:', _error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get start time based on time range
 */
function getStartTime(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now - 60 * 60 * 1000);
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now - 24 * 60 * 60 * 1000);
  }
}

/**
 * Calculate overall system health score (0-100)
 */
async function calculateSystemHealth(startTime) {
  try {
    // Get various health indicators
    const { data: recentErrors } = await supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .eq('severity', 'error');

    const { data: totalRequests } = await supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString());

    const { data: slowRequests } = await supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .gt('response_time', 1000); // Requests slower than 1s

    // Calculate health components
    const errorScore = totalRequests?.count > 0
      ? Math.max(0, 100 - (recentErrors?.count / totalRequests?.count * 100))
      : 100;

    const performanceScore = totalRequests?.count > 0
      ? Math.max(0, 100 - (slowRequests?.count / totalRequests?.count * 100))
      : 100;

    // Feature flag health (check if any flags are causing issues)
    const { data: flagIssues } = await supabase
      .from('feature_flag_usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .eq('metadata->error', true);

    const flagScore = flagIssues?.count > 100 ? 70 : 100;

    // Calculate weighted health score
    const healthScore = (
      errorScore * 0.4 +
      performanceScore * 0.4 +
      flagScore * 0.2
    );

    return Math.round(healthScore);
  } catch (_error) {
    // console.error('Error calculating system health:', _error);
    return 0;
  }
}

/**
 * Get error metrics
 */
async function getErrorMetrics(startTime) {
  try {
    // Get error counts
    const { data: errors, count: errorCount } = await supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString());

    // Get total API calls
    const { data: apiCalls, count: totalCalls } = await supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString());

    // Calculate error rate
    const errorRate = totalCalls > 0
      ? Math.round((errorCount / totalCalls) * 100 * 100) / 100
      : 0;

    // Get user complaints from negative feedback
    const { data: complaints, count: complaintCount } = await supabase
      .from('user_feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .eq('type', 'negative');

    const userComplaints = complaintCount || 0;

    return {
      errorRate,
      errorCount,
      totalCalls,
      userComplaints
    };
  } catch (_error) {
    // console.error('Error getting error metrics:', _error);
    return { errorRate: 0, errorCount: 0, totalCalls: 0, userComplaints: 0 };
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(startTime) {
  try {
    // Get average response time
    const { data: perfData } = await supabase
      .from('api_logs')
      .select('response_time')
      .gte('created_at', startTime.toISOString())
      .not('response_time', 'is', null);

    if (!perfData || perfData.length === 0) {
      return { avgResponseTime: 0, baseline: 500, degradation: 1 };
    }

    const avgResponseTime = Math.round(
      perfData.reduce((sum, log) => sum + log.response_time, 0) / perfData.length
    );

    // Get baseline (could be stored in settings)
    const baseline = 500; // ms
    const degradation = Math.round((avgResponseTime / baseline) * 100) / 100;

    return {
      avgResponseTime,
      baseline,
      degradation
    };
  } catch (_error) {
    // console.error('Error getting performance metrics:', _error);
    return { avgResponseTime: 0, baseline: 500, degradation: 1 };
  }
}

/**
 * Get rollout progress for each week
 */
async function getRolloutProgress() {
  const weeks = [
    { week: 'foundation', name: 'Foundation', progress: 100, status: 'completed' },
    { week: 'week1', name: 'Week 1: Email', progress: 0, status: 'pending' },
    { week: 'week2', name: 'Week 2: Config', progress: 0, status: 'pending' },
    { week: 'week3', name: 'Week 3: Errors', progress: 0, status: 'pending' },
    { week: 'week4', name: 'Week 4: Database', progress: 0, status: 'pending' },
    { week: 'week5', name: 'Week 5: Workflow', progress: 0, status: 'pending' },
    { week: 'week6', name: 'Week 6: Content', progress: 0, status: 'pending' },
    { week: 'week7', name: 'Week 7: Templates', progress: 0, status: 'pending' },
    { week: 'week8', name: 'Week 8: New Type', progress: 0, status: 'pending' },
    { week: 'week9', name: 'Week 9: Multi', progress: 0, status: 'pending' },
    { week: 'week10', name: 'Week 10: Analytics', progress: 0, status: 'pending' },
    { week: 'week11', name: 'Week 11: Performance', progress: 0, status: 'pending' }
  ];

  try {
    // Get feature flag status for each week
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('key, is_enabled, rollout_percentage')
      .like('key', 'refactoring_%');

    if (flags) {
      flags.forEach(flag => {
        const weekIndex = weeks.findIndex(w => flag.key.includes(w.week));
        if (weekIndex !== -1) {
          weeks[weekIndex].progress = flag.rollout_percentage || 0;
          weeks[weekIndex].status = flag.is_enabled
            ? (flag.rollout_percentage === 100 ? 'completed' : 'in_progress')
            : 'pending';
        }
      });
    }
  } catch (_error) {
    // console.error('Error getting rollout progress:', _error);
  }

  return weeks;
}

/**
 * Get user metrics
 */
async function getUserMetrics(startTime) {
  try {
    // Get unique active users
    const { data: activeUsers } = await supabase
      .from('api_logs')
      .select('user_id')
      .gte('created_at', startTime.toISOString())
      .not('user_id', 'is', null);

    const uniqueUsers = new Set(activeUsers?.map(log => log.user_id) || []);

    return {
      activeUsers: uniqueUsers.size
    };
  } catch (_error) {
    // console.error('Error getting user metrics:', _error);
    return { activeUsers: 0 };
  }
}

/**
 * Get performance trend data
 */
async function getPerformanceTrend(startTime) {
  try {
    // Calculate hourly intervals
    const hours = Math.min(24, Math.ceil((new Date() - startTime) / (1000 * 60 * 60)));
    const trend = [];

    for (let i = 0; i < hours; i++) {
      const hourStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      // Get average response time for this hour
      const { data: perfData } = await supabase
        .from('api_logs')
        .select('response_time')
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString())
        .not('response_time', 'is', null);

      let avgResponseTime = 500; // Default baseline
      if (perfData && perfData.length > 0) {
        avgResponseTime = Math.round(
          perfData.reduce((sum, log) => sum + log.response_time, 0) / perfData.length
        );
      }

      trend.push({
        time: hourStart.toLocaleTimeString(),
        responseTime: avgResponseTime,
        baseline: 500
      });
    }

    return trend;
  } catch (_error) {
    // console.error('Error getting performance trend:', _error);
    // Return empty trend on error
    return [];
  }
}

/**
 * Get error rate trend data
 */
async function getErrorTrend(startTime) {
  try {
    // Calculate hourly intervals
    const hours = Math.min(24, Math.ceil((new Date() - startTime) / (1000 * 60 * 60)));
    const trend = [];

    for (let i = 0; i < hours; i++) {
      const hourStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      // Get error count for this hour
      const { count: errorCount } = await supabase
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString());

      // Get total API calls for this hour
      const { count: totalCalls } = await supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString());

      const errorRate = totalCalls > 0
        ? Math.round((errorCount / totalCalls) * 100 * 100) / 100
        : 0;

      trend.push({
        time: hourStart.toLocaleTimeString(),
        errorRate: errorRate,
        threshold: 5
      });
    }

    return trend;
  } catch (_error) {
    // console.error('Error getting error trend:', _error);
    // Return empty trend on error
    return [];
  }
}

module.exports = adminRateLimit(handler);
