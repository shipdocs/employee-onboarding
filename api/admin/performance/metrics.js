/**
 * Admin Performance Metrics API
 * Provides aggregated performance metrics for admin dashboard
 */

const db = require('../../../lib/database-direct');
const { authenticateRequest } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  // Verify admin authentication with proper blacklist checking
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      timeRange = '24h',
      metric,
      location,
      deviceType,
      connectionQuality
    } = req.query;

    // Calculate time range
    const timeRangeMs = parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs).toISOString();

    // Get aggregated performance metrics
    const metrics = await getAggregatedMetrics(startTime, {
      metric,
      location,
      deviceType,
      connectionQuality
    });

    // Get active users count
    const activeUsers = await getActiveUsersCount(startTime);

    // Get performance alerts
    const alerts = await getPerformanceAlerts(startTime);

    // Get system health indicators
    const healthIndicators = await getSystemHealthIndicators(startTime);

    res.json({
      metrics: {
        ...metrics,
        activeUsers,
        alerts: alerts.length,
        healthScore: calculateHealthScore(metrics, alerts)
      },
      alerts,
      healthIndicators,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Error in admin performance metrics API:', _error);
    res.status(500).json({
      error: 'Internal server error',
      message: _error.message
    });
  }
}

/**
 * Get aggregated performance metrics
 */
async function getAggregatedMetrics(startTime, filters = {}) {
  try {
    // Build base query
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .gte('recorded_at', startTime);

    // Apply filters
    if (filters.metric) {
      query = query.eq('metric_name', filters.metric);
    }
    if (filters.location) {
      query = query.eq('location', filters.location);
    }
    if (filters.deviceType) {
      query = query.eq('device_type', filters.deviceType);
    }
    if (filters.connectionQuality) {
      query = query.eq('connection_quality', filters.connectionQuality);
    }

    const { data: rawMetrics, error } = await query;

    if (error) {
      throw error;
    }

    // Group and aggregate metrics
    const aggregated = {};
    const metricGroups = rawMetrics.reduce((groups, metric) => {
      const name = metric.metric_name;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push({
        value: metric.metric_value,
        unit: metric.metric_unit,
        timestamp: metric.recorded_at,
        location: metric.location,
        deviceType: metric.device_type,
        connectionQuality: metric.connection_quality
      });
      return groups;
    }, {});

    // Calculate statistics for each metric
    Object.entries(metricGroups).forEach(([name, values]) => {
      const numericValues = values.map(v => v.value).sort((a, b) => a - b);
      const count = numericValues.length;

      if (count > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        aggregated[name] = {
          count,
          unit: values[0].unit,
          min: numericValues[0],
          max: numericValues[count - 1],
          average: sum / count,
          median: count % 2 === 0
            ? (numericValues[count / 2 - 1] + numericValues[count / 2]) / 2
            : numericValues[Math.floor(count / 2)],
          p95: numericValues[Math.floor(count * 0.95)] || numericValues[count - 1],
          p99: numericValues[Math.floor(count * 0.99)] || numericValues[count - 1],
          trend: calculateTrend(values)
        };
      }
    });

    // Add key performance indicators
    aggregated.avgResponseTime = aggregated.api_response_time?.average || 0;
    aggregated.pageLoadTime = aggregated.page_load_time?.average || 0;
    aggregated.errorRate = await calculateErrorRate(startTime);
    aggregated.throughput = await calculateThroughput(startTime);

    return aggregated;

  } catch (_error) {
    // console.error('Error getting aggregated metrics:', _error);
    return {};
  }
}

/**
 * Get active users count
 */
async function getActiveUsersCount(startTime) {
  try {
    // First try performance_metrics table
    const { data: perfData, error: perfError } = await supabase
      .from('performance_metrics')
      .select('user_id')
      .gte('recorded_at', startTime);

    if (!perfError && perfData && perfData.length > 0) {
      // Count unique users from performance metrics
      const uniqueUsers = new Set(perfData.map(m => m.user_id));
      return uniqueUsers.size;
    }

    // Fallback: Count users who have been active recently based on audit log
    const { data: auditData, error: auditError } = await supabase
      .from('audit_log')
      .select('user_id')
      .gte('created_at', startTime)
      .not('user_id', 'is', null);

    if (!auditError && auditData) {
      const uniqueUsers = new Set(auditData.map(m => m.user_id));
      return uniqueUsers.size;
    }

    // Final fallback: Count active users (logged in recently)
    const { count, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('updated_at', startTime);

    if (!userError) {
      return count || 0;
    }

    return 0;

  } catch (_error) {
    // console.error('Error getting active users count:', _error);
    return 0;
  }
}

/**
 * Get performance alerts
 */
async function getPerformanceAlerts(startTime) {
  try {
    const { data: alerts, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .gte('created_at', startTime)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return alerts.map(alert => ({
      id: alert.id,
      title: `${alert.metric_name} Alert`,
      description: alert.description,
      severity: alert.severity,
      timestamp: alert.created_at,
      metricName: alert.metric_name,
      currentValue: alert.current_value,
      thresholdValue: alert.threshold_value,
      contextTags: alert.context_tags
    }));

  } catch (_error) {
    // console.error('Error getting performance alerts:', _error);
    return [];
  }
}

/**
 * Get system health indicators
 */
async function getSystemHealthIndicators(startTime) {
  try {
    // Get error rate
    const errorRate = await calculateErrorRate(startTime);

    // Get average response time
    const { data: responseTimeData } = await supabase
      .from('performance_metrics')
      .select('metric_value')
      .eq('metric_name', 'api_response_time')
      .gte('recorded_at', startTime);

    const avgResponseTime = responseTimeData?.length > 0
      ? responseTimeData.reduce((sum, m) => sum + m.metric_value, 0) / responseTimeData.length
      : 0;

    // Get connection quality distribution
    const { data: connectionData } = await supabase
      .from('performance_metrics')
      .select('connection_quality')
      .not('connection_quality', 'is', null)
      .gte('recorded_at', startTime);

    const connectionQuality = connectionData?.reduce((acc, m) => {
      acc[m.connection_quality] = (acc[m.connection_quality] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      errorRate,
      avgResponseTime,
      connectionQuality,
      uptime: 99.9, // This would come from external monitoring
      lastUpdated: new Date().toISOString()
    };

  } catch (_error) {
    // console.error('Error getting system health indicators:', _error);
    return {};
  }
}

/**
 * Calculate error rate
 */
async function calculateErrorRate(startTime) {
  try {
    // This would typically come from error tracking
    // For now, estimate based on performance alerts
    const { data: alerts } = await supabase
      .from('performance_alerts')
      .select('id')
      .gte('created_at', startTime);

    const { data: totalRequests } = await supabase
      .from('performance_metrics')
      .select('id')
      .eq('metric_name', 'api_response_time')
      .gte('recorded_at', startTime);

    const errorCount = alerts?.length || 0;
    const requestCount = totalRequests?.length || 1;

    return (errorCount / requestCount) * 100;

  } catch (_error) {
    // console.error('Error calculating error rate:', _error);
    return 0;
  }
}

/**
 * Calculate throughput (requests per minute)
 */
async function calculateThroughput(startTime) {
  try {
    const { data: requests } = await supabase
      .from('performance_metrics')
      .select('recorded_at')
      .eq('metric_name', 'api_response_time')
      .gte('recorded_at', startTime);

    const requestCount = requests?.length || 0;
    const timeRangeMinutes = (Date.now() - new Date(startTime).getTime()) / (1000 * 60);

    return requestCount / timeRangeMinutes;

  } catch (_error) {
    // console.error('Error calculating throughput:', _error);
    return 0;
  }
}

/**
 * Calculate trend for a metric
 */
function calculateTrend(values) {
  if (values.length < 2) return 'stable';

  // Sort by timestamp
  const sortedValues = values.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Compare first half with second half
  const midpoint = Math.floor(sortedValues.length / 2);
  const firstHalf = sortedValues.slice(0, midpoint);
  const secondHalf = sortedValues.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(metrics, alerts) {
  let score = 100;

  // Deduct points for high response times
  if (metrics.avgResponseTime > 2000) score -= 20;
  else if (metrics.avgResponseTime > 1000) score -= 10;

  // Deduct points for high error rate
  if (metrics.errorRate > 5) score -= 30;
  else if (metrics.errorRate > 1) score -= 15;

  // Deduct points for alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  score -= criticalAlerts * 15;
  score -= highAlerts * 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Parse time range string to milliseconds
 */
function parseTimeRange(timeRange) {
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  return timeRanges[timeRange] || timeRanges['24h'];
}

module.exports = adminRateLimit(handler);
