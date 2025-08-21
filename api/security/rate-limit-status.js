// api/security/rate-limit-status.js - Rate limit monitoring and management endpoints
const { requireAuth } = require('../../lib/auth');
const { globalRateLimiter } = require('../../lib/security/GlobalRateLimiter');
const db = require('../../lib/database-direct');
const { adminRateLimit } = require('../../lib/rateLimit');

/**
 * Get rate limit status for monitoring
 * GET /api/security/rate-limit-status
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const authResult = await requireAuth(req, res, ['admin']);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { key, type, limit } = req.query;

    if (key) {
      // Get status for specific key
      const status = await globalRateLimiter.getRateLimitStatus(key);
      return res.json({
        key: key,
        status: status,
        timestamp: new Date().toISOString()
      });
    }

    // Get general rate limiting statistics
    const storeStats = await globalRateLimiter.getStoreStats();

    // Get recent rate limit violations from security_events
    const { data: recentViolations, error: violationsError } = await supabase
      .from('security_events')
      .select('*')
      .eq('type', 'rate_limit_violation')
      .order('created_at', { ascending: false })
      .limit(limit ? parseInt(limit) : 50);

    if (violationsError) {
      console.error('Error fetching rate limit violations:', violationsError);
    }

    // Aggregate violation statistics
    const violationStats = {
      total: recentViolations?.length || 0,
      last24Hours: 0,
      lastHour: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {}
    };

    if (recentViolations) {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      recentViolations.forEach(violation => {
        const createdAt = new Date(violation.created_at);

        if (createdAt > oneDayAgo) {
          violationStats.last24Hours++;
        }

        if (createdAt > oneHourAgo) {
          violationStats.lastHour++;
        }

        // Count by severity
        if (violation.severity && violationStats.bySeverity[violation.severity] !== undefined) {
          violationStats.bySeverity[violation.severity]++;
        }

        // Count by endpoint type
        const endpoint = violation.details?.endpoint || 'unknown';
        const endpointType = endpoint.split('/')[2] || 'unknown'; // Extract type from /api/type/...
        violationStats.byType[endpointType] = (violationStats.byType[endpointType] || 0) + 1;
      });
    }

    return res.json({
      storeStats: storeStats,
      violationStats: violationStats,
      recentViolations: type === 'detailed' ? recentViolations : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve rate limit status'
    });
  }
}

module.exports = adminRateLimit(handler);
