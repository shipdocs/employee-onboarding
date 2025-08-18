// api/admin/security/alerts.js - Security alerts endpoint
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');
const securityAuditLogger = require('../../../lib/security/SecurityAuditLogger');

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getSecurityAlerts(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSecurityAlerts(req, res) {
  try {
    const { limit = 50, severity } = req.query;

    // Get security alerts
    const result = await securityAuditLogger.getSecurityAlerts(parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to retrieve security alerts',
        details: result.error
      });
    }

    let alerts = result.alerts;

    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Categorize alerts
    const categorized = {
      critical: alerts.filter(alert => alert.severity === 'critical'),
      high: alerts.filter(alert => alert.severity === 'high'),
      recent: alerts.filter(alert => {
        const alertTime = new Date(alert.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return alertTime >= oneHourAgo;
      })
    };

    // Get unique threat types
    const threatTypes = [...new Set(
      alerts.flatMap(alert => alert.threats || [])
    )];

    // Get unique IP addresses with alert counts
    const ipAddresses = {};
    alerts.forEach(alert => {
      if (alert.ip_address) {
        ipAddresses[alert.ip_address] = (ipAddresses[alert.ip_address] || 0) + 1;
      }
    });

    // Sort IPs by alert count
    const topIPs = Object.entries(ipAddresses)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    res.json({
      success: true,
      alerts: alerts,
      summary: {
        total: alerts.length,
        critical: categorized.critical.length,
        high: categorized.high.length,
        recent: categorized.recent.length,
        threatTypes: threatTypes,
        topIPs: topIPs
      },
      categorized: {
        critical: categorized.critical.slice(0, 10), // Limit for response size
        high: categorized.high.slice(0, 10),
        recent: categorized.recent.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('Security alerts error:', error);
    res.status(500).json({
      error: 'Failed to retrieve security alerts',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));