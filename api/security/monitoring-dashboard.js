/**
 * Security Monitoring Dashboard API
 *
 * Provides real-time security monitoring data and dashboard functionality.
 */

const { getSecurityMonitoring } = require('../../lib/security/SecurityMonitoringService');
const { requireAuth } = require('../../lib/auth');

async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const authResult = await requireAuth(req, res, ['admin']);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const securityMonitoring = getSecurityMonitoring();
    const { timeRange = '24h', format = 'json' } = req.query;

    // Handle different dashboard endpoints
    const { action } = req.query;

    switch (action) {
      case 'dashboard':
        return handleDashboardData(req, res, securityMonitoring);

      case 'metrics':
        return handleMetricsData(req, res, securityMonitoring, timeRange);

      case 'alerts':
        return handleAlertsData(req, res, securityMonitoring, timeRange);

      case 'report':
        return handleReportData(req, res, securityMonitoring, timeRange, format);

      case 'status':
        return handleStatusData(req, res, securityMonitoring);

      default:
        return handleDashboardData(req, res, securityMonitoring);
    }

  } catch (error) {
    console.error('Security monitoring dashboard error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Handle dashboard data request
 */
function handleDashboardData(req, res, securityMonitoring) {
  const dashboardData = securityMonitoring.getDashboardData();

  return res.status(200).json({
    success: true,
    data: dashboardData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle metrics data request
 */
function handleMetricsData(req, res, securityMonitoring, timeRange) {
  const { startTime, endTime } = req.query;

  let metrics;
  if (startTime && endTime) {
    metrics = securityMonitoring.getMetricsForTimeRange(startTime, endTime);
  } else {
    // Calculate time range
    const now = new Date();
    let start;

    switch (timeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    metrics = securityMonitoring.getMetricsForTimeRange(start, now);
  }

  return res.status(200).json({
    success: true,
    data: {
      metrics,
      timeRange,
      count: metrics.length
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle alerts data request
 */
function handleAlertsData(req, res, securityMonitoring, timeRange) {
  const { startTime, endTime, type, limit = 50 } = req.query;

  let alerts;
  if (startTime && endTime) {
    alerts = securityMonitoring.getAlertsForTimeRange(startTime, endTime);
  } else {
    // Calculate time range
    const now = new Date();
    let start;

    switch (timeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    alerts = securityMonitoring.getAlertsForTimeRange(start, now);
  }

  // Filter by alert type if specified
  if (type) {
    alerts = alerts.filter(alert => alert.type === type);
  }

  // Limit results
  alerts = alerts.slice(0, parseInt(limit));

  return res.status(200).json({
    success: true,
    data: {
      alerts,
      timeRange,
      count: alerts.length,
      filters: { type }
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle report data request
 */
function handleReportData(req, res, securityMonitoring, timeRange, format) {
  const report = securityMonitoring.generateReport(timeRange);

  if (format === 'csv') {
    const csvData = securityMonitoring.exportData('csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="security-report-${timeRange}.csv"`);
    return res.status(200).send(csvData);
  }

  return res.status(200).json({
    success: true,
    data: report,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle status data request
 */
function handleStatusData(req, res, securityMonitoring) {
  const status = {
    monitoring: securityMonitoring.isMonitoring,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };

  return res.status(200).json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
}

module.exports = handler;
