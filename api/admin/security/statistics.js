// api/admin/security/statistics.js - Security statistics endpoint
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');
const securityAuditLogger = require('../../../lib/security/SecurityAuditLogger');

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getSecurityStatistics(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSecurityStatistics(req, res) {
  try {
    const { timeframe = '24h' } = req.query;

    // Validate timeframe
    const validTimeframes = ['1h', '24h', '7d', '30d'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        validTimeframes: validTimeframes
      });
    }

    // Get statistics
    const statsResult = await securityAuditLogger.getStatistics(timeframe);
    
    if (!statsResult.success) {
      return res.status(500).json({
        error: 'Failed to retrieve security statistics',
        details: statsResult.error
      });
    }

    // Get security alerts
    const alertsResult = await securityAuditLogger.getSecurityAlerts(10);
    
    if (!alertsResult.success) {
      return res.status(500).json({
        error: 'Failed to retrieve security alerts',
        details: alertsResult.error
      });
    }

    // Calculate threat level
    const stats = statsResult.statistics;
    const criticalCount = stats.by_severity?.critical || 0;
    const highCount = stats.by_severity?.high || 0;
    const mediumCount = stats.by_severity?.medium || 0;

    let threatLevel = 'low';
    if (criticalCount > 0) {
      threatLevel = 'critical';
    } else if (highCount > 5) {
      threatLevel = 'high';
    } else if (highCount > 0 || mediumCount > 20) {
      threatLevel = 'medium';
    }

    // Calculate trends (simplified)
    const trends = {
      total: stats.total > 0 ? 'stable' : 'low',
      critical: criticalCount > 0 ? 'increasing' : 'stable',
      high: highCount > 0 ? 'stable' : 'decreasing'
    };

    res.json({
      success: true,
      timeframe: timeframe,
      statistics: stats,
      alerts: alertsResult.alerts,
      threatLevel: threatLevel,
      trends: trends,
      summary: {
        totalEvents: stats.total,
        criticalEvents: criticalCount,
        highSeverityEvents: highCount,
        mediumSeverityEvents: mediumCount,
        lowSeverityEvents: stats.by_severity?.low || 0,
        topThreats: Object.entries(stats.by_threat)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([threat, count]) => ({ threat, count })),
        topEventTypes: Object.entries(stats.by_type)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => ({ type, count }))
      }
    });

  } catch (error) {
    console.error('Security statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve security statistics',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));