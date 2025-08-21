/**
 * Incident Statistics API
 * Provides incident metrics and statistics for monitoring and reporting
 */

const db = require('../../lib/database-direct');
const { incidentDetectionService } = require('../../lib/services/incidentDetectionService');
const { requireRole } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

/**
 * GET /api/incidents/stats - Get incident statistics
 */
async function handleGetStats(req, res) {
  try {
    // Require admin or manager role
    const user = await requireRole(req, ['admin', 'manager']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { timeRange = '24h' } = req.query;

    // Get incident statistics from service
    const stats = await incidentDetectionService.getIncidentStats(timeRange);

    if (!stats) {
      return res.status(500).json({ error: 'Failed to fetch incident statistics' });
    }

    // Get additional database statistics
    const additionalStats = await getAdditionalStats(timeRange);

    return res.status(200).json({
      timeRange,
      ...stats,
      ...additionalStats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetStats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get additional statistics from database
 */
async function getAdditionalStats(timeRange) {
  try {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get response time statistics
    const { data: responseStats, error: responseError } = await supabase
      .from('incidents')
      .select('detection_time, response_time, resolution_time')
      .gte('detection_time', since.toISOString())
      .not('response_time', 'is', null);

    if (responseError) {
      console.error('Error fetching response stats:', responseError);
    }

    // Calculate response time metrics
    const responseMetrics = calculateResponseMetrics(responseStats || []);

    // Get external notification statistics
    const { data: notificationStats, error: notificationError } = await supabase
      .from('incident_external_notifications')
      .select('notification_type, success, retry_count')
      .gte('created_at', since.toISOString());

    if (notificationError) {
      console.error('Error fetching notification stats:', notificationError);
    }

    // Calculate notification metrics
    const notificationMetrics = calculateNotificationMetrics(notificationStats || []);

    // Get top affected systems
    const { data: systemStats, error: systemError } = await supabase
      .from('incidents')
      .select('affected_systems')
      .gte('detection_time', since.toISOString())
      .not('affected_systems', 'is', null);

    if (systemError) {
      console.error('Error fetching system stats:', systemError);
    }

    const topAffectedSystems = calculateTopAffectedSystems(systemStats || []);

    return {
      response_metrics: responseMetrics,
      notification_metrics: notificationMetrics,
      top_affected_systems: topAffectedSystems
    };

  } catch (error) {
    console.error('Error getting additional stats:', error);
    return {};
  }
}

/**
 * Calculate response time metrics
 */
function calculateResponseMetrics(incidents) {
  if (incidents.length === 0) {
    return {
      mean_time_to_response: null,
      mean_time_to_resolution: null,
      incidents_with_response: 0,
      incidents_with_resolution: 0
    };
  }

  const responseTimes = [];
  const resolutionTimes = [];

  incidents.forEach(incident => {
    if (incident.response_time) {
      const responseTime = new Date(incident.response_time).getTime() -
                          new Date(incident.detection_time).getTime();
      responseTimes.push(responseTime / 1000 / 60); // Convert to minutes
    }

    if (incident.resolution_time) {
      const resolutionTime = new Date(incident.resolution_time).getTime() -
                            new Date(incident.detection_time).getTime();
      resolutionTimes.push(resolutionTime / 1000 / 60); // Convert to minutes
    }
  });

  return {
    mean_time_to_response: responseTimes.length > 0 ?
      Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null,
    mean_time_to_resolution: resolutionTimes.length > 0 ?
      Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) : null,
    incidents_with_response: responseTimes.length,
    incidents_with_resolution: resolutionTimes.length
  };
}

/**
 * Calculate notification metrics
 */
function calculateNotificationMetrics(notifications) {
  if (notifications.length === 0) {
    return {
      total_notifications: 0,
      success_rate: 0,
      by_type: {},
      retry_stats: {}
    };
  }

  const byType = {};
  const retryStats = { total_retries: 0, max_retries: 0 };
  let successCount = 0;

  notifications.forEach(notification => {
    // Count by type
    byType[notification.notification_type] = byType[notification.notification_type] || {
      total: 0,
      successful: 0
    };
    byType[notification.notification_type].total++;

    if (notification.success) {
      successCount++;
      byType[notification.notification_type].successful++;
    }

    // Retry statistics
    if (notification.retry_count > 0) {
      retryStats.total_retries += notification.retry_count;
      retryStats.max_retries = Math.max(retryStats.max_retries, notification.retry_count);
    }
  });

  return {
    total_notifications: notifications.length,
    success_rate: Math.round((successCount / notifications.length) * 100),
    by_type: byType,
    retry_stats: retryStats
  };
}

/**
 * Calculate top affected systems
 */
function calculateTopAffectedSystems(incidents) {
  const systemCounts = {};

  incidents.forEach(incident => {
    if (incident.affected_systems && Array.isArray(incident.affected_systems)) {
      incident.affected_systems.forEach(system => {
        systemCounts[system] = (systemCounts[system] || 0) + 1;
      });
    }
  });

  // Sort by count and return top 10
  return Object.entries(systemCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([system, count]) => ({ system, count }));
}

/**
 * Main handler function
 */
async function handler(req, res) {
  try {
    const { method } = req;

    if (method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return await handleGetStats(req, res);
  } catch (error) {
    console.error('Incident stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(handler);
