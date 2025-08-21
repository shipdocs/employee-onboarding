// Vercel API Route: /api/admin/security/metrics.js
const { requireAdmin } = require('../../../lib/auth');
const db = require('../../../lib/database');
const { adminRateLimit } = require('../../../lib/rateLimit');

/**
 * @swagger
 * /api/admin/security/metrics:
 *   get:
 *     summary: Get security metrics and statistics
 *     description: Retrieves aggregated security metrics for dashboard display
 *     tags: [Admin, Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *         description: Time range for metrics calculation
 *     responses:
 *       200:
 *         description: Security metrics data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeRange = '24h' } = req.query;

    // Calculate time filter
    let timeFilter;
    switch (timeRange) {
      case '1h':
        timeFilter = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        timeFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '24h':
      default:
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    // Get security events for metrics calculation (fallback to empty array if table is empty)
    const { data: securityEvents, error: eventsError } = await supabase
      .from('security_events')
      .select('type, severity, created_at, details, threats')
      .gte('created_at', timeFilter)
      .limit(1000); // Add reasonable limit

    if (eventsError) {
      console.error('Security events query error:', eventsError);
      return res.status(500).json({ error: 'Failed to fetch security events' });
    }

    // Get authentication-related security events (fallback to empty array)
    const { data: authEvents, error: authError } = await supabase
      .from('security_events')
      .select('*')
      .or('type.ilike.%auth%,type.ilike.%login%')
      .gte('created_at', timeFilter)
      .limit(500);

    if (authError) {
      console.error('Auth events query error:', authError);
      // Don't fail the whole request, just use empty array
    }

    // Get high-severity security events (fallback to empty array)
    const { data: criticalEvents, error: criticalError } = await supabase
      .from('security_events')
      .select('*')
      .in('severity', ['high', 'critical'])
      .gte('created_at', timeFilter)
      .limit(500);

    if (eventsError) {
      console.error('Security events query error:', eventsError);
      // Don't throw error for empty table, just log and continue with empty array
    }

    if (authError) {
      console.error('Auth events query error:', authError);
      // Don't throw error for empty table, just log and continue with empty array
    }

    if (criticalError) {
      console.error('Critical events query error:', criticalError);
      // Don't throw error for empty table, just log and continue with empty array
    }

    // Ensure data arrays are defined
    const safeSecurityEvents = securityEvents || [];
    const safeAuthEvents = authEvents || [];
    const safeCriticalEvents = criticalEvents || [];

    // Calculate metrics
    const metrics = {
      // Active threats (high and critical severity events)
      activeThreats: safeSecurityEvents.filter(event =>
        event.severity && ['critical', 'high'].includes(event.severity.toLowerCase())
      ).length,

      // Authentication events (count auth-related events from all events)
      authenticationEvents: safeSecurityEvents.filter(event =>
        event.type && (
          event.type.toLowerCase().includes('auth') ||
          event.type.toLowerCase().includes('login')
        )
      ).length,

      // Failed logins specifically
      failedLogins: safeSecurityEvents.filter(event =>
        event.type && event.type.toLowerCase().includes('authentication_failure')
      ).length,

      // Blocked requests (rate limited + blocked events)
      blockedRequests: safeSecurityEvents.filter(event => {
        // Count rate limit events
        if (event.type && event.type.toLowerCase().includes('rate_limit')) {
          return true;
        }
        // Count events that were explicitly blocked
        if (event.details && event.details.blocked === true) {
          return true;
        }
        // Count injection attempts (usually blocked)
        if (event.type && event.type.toLowerCase().includes('injection')) {
          return true;
        }
        // Count unauthorized access attempts
        if (event.type && event.type.toLowerCase().includes('unauthorized')) {
          return true;
        }
        return false;
      }).length,

      // Critical security events
      criticalEvents: safeCriticalEvents.length,

      // Security score calculation (simplified)
      securityScore: calculateSecurityScore(safeSecurityEvents, safeAuthEvents, safeCriticalEvents),

      // Threat trend (simplified - compare with previous period)
      threatTrend: calculateThreatTrend(safeSecurityEvents, timeRange),

      // Event breakdown by severity
      eventsBySeverity: {
        critical: safeSecurityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'critical').length,
        high: safeSecurityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'high').length,
        medium: safeSecurityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'medium').length,
        low: safeSecurityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'low').length
      },

      // Event breakdown by type
      eventsByType: securityEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {}),

      // Time range info
      timeRange,
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    return res.status(500).json({
      error: 'Failed to fetch security metrics',
      message: error.message
    });
  }
}

// Helper function to calculate security score
function calculateSecurityScore(securityEvents, authEvents, criticalEvents) {
  let score = 100;

  // Deduct points for security events
  const criticalCount = securityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'critical').length;
  const highCount = securityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'high').length;
  const mediumCount = securityEvents.filter(e => e.severity && e.severity.toLowerCase() === 'medium').length;

  score -= criticalCount * 10; // -10 points per critical event
  score -= highCount * 5;      // -5 points per high event
  score -= mediumCount * 2;    // -2 points per medium event

  // Deduct points for excessive auth events (indicates potential attacks)
  if (authEvents.length > 10) {
    score -= Math.min(20, authEvents.length - 10); // Up to -20 points
  }

  // Deduct points for critical events
  if (criticalEvents.length > 0) {
    score -= Math.min(30, criticalEvents.length * 5); // Up to -30 points
  }

  return Math.max(0, Math.min(100, score));
}

// Helper function to calculate threat trend
function calculateThreatTrend(securityEvents, timeRange) {
  // Simplified trend calculation
  // In a real implementation, you'd compare with the previous period
  const criticalAndHigh = securityEvents.filter(e =>
    e.severity && ['critical', 'high'].includes(e.severity.toLowerCase())
  ).length;

  // Mock trend calculation (in real implementation, compare with previous period)
  if (criticalAndHigh === 0) return 0;
  if (criticalAndHigh <= 2) return -5; // Improving
  if (criticalAndHigh <= 5) return 0;  // Stable
  return 10; // Worsening
}

// Apply middleware - Fixed auth issue
module.exports = adminRateLimit(requireAdmin(handler));
