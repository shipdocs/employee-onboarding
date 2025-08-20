// api/security/rate-limit-dashboard.js - Rate limit monitoring dashboard data
const { requireAuth } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');
const { adminRateLimit } = require('../../lib/rateLimit');

/**
 * Get comprehensive rate limit dashboard data
 * GET /api/security/rate-limit-dashboard
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

    const { timeRange = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get rate limit violations within time range
    const { data: violations, error: violationsError } = await supabase
      .from('security_events')
      .select('*')
      .eq('type', 'rate_limit_violation')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false });

    if (violationsError) {
      console.error('Error fetching violations:', violationsError);
      return res.status(500).json({ error: 'Failed to fetch violation data' });
    }

    // Process violations data
    const dashboardData = processViolationsData(violations || [], timeRange);

    return res.json({
      timeRange: timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      ...dashboardData,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Rate limit dashboard error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard data'
    });
  }
}

/**
 * Process violations data for dashboard display
 */
function processViolationsData(violations, timeRange) {
  const summary = {
    totalViolations: violations.length,
    uniqueIPs: new Set(),
    severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
    endpointBreakdown: {},
    methodBreakdown: {},
    topViolators: {},
    timeSeriesData: [],
    recentViolations: violations.slice(0, 10) // Last 10 violations
  };

  // Time series buckets
  const bucketSize = getBucketSize(timeRange);
  const buckets = new Map();

  violations.forEach(violation => {
    const createdAt = new Date(violation.created_at);
    const ipAddress = violation.ip_address || 'unknown';
    const endpoint = violation.details?.endpoint || 'unknown';
    const method = violation.details?.method || 'unknown';
    const severity = violation.severity || 'medium';

    // Track unique IPs
    summary.uniqueIPs.add(ipAddress);

    // Severity breakdown
    if (summary.severityBreakdown[severity] !== undefined) {
      summary.severityBreakdown[severity]++;
    }

    // Endpoint breakdown
    const endpointPath = endpoint.split('?')[0]; // Remove query params
    summary.endpointBreakdown[endpointPath] = (summary.endpointBreakdown[endpointPath] || 0) + 1;

    // Method breakdown
    summary.methodBreakdown[method] = (summary.methodBreakdown[method] || 0) + 1;

    // Top violators
    summary.topViolators[ipAddress] = (summary.topViolators[ipAddress] || 0) + 1;

    // Time series data
    const bucketKey = Math.floor(createdAt.getTime() / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { timestamp: bucketKey, count: 0, severity: { low: 0, medium: 0, high: 0, critical: 0 } });
    }
    buckets.get(bucketKey).count++;
    buckets.get(bucketKey).severity[severity]++;
  });

  // Convert unique IPs set to count
  summary.uniqueIPs = summary.uniqueIPs.size;

  // Sort and limit top violators
  summary.topViolators = Object.entries(summary.topViolators)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .reduce((obj, [ip, count]) => {
      obj[ip] = count;
      return obj;
    }, {});

  // Sort and limit endpoint breakdown
  summary.endpointBreakdown = Object.entries(summary.endpointBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .reduce((obj, [endpoint, count]) => {
      obj[endpoint] = count;
      return obj;
    }, {});

  // Convert time series buckets to array and sort
  summary.timeSeriesData = Array.from(buckets.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(bucket => ({
      timestamp: new Date(bucket.timestamp).toISOString(),
      count: bucket.count,
      severity: bucket.severity
    }));

  return summary;
}

/**
 * Get bucket size in milliseconds based on time range
 */
function getBucketSize(timeRange) {
  switch (timeRange) {
    case '1h':
      return 5 * 60 * 1000; // 5 minutes
    case '6h':
      return 15 * 60 * 1000; // 15 minutes
    case '24h':
      return 60 * 60 * 1000; // 1 hour
    case '7d':
      return 6 * 60 * 60 * 1000; // 6 hours
    default:
      return 60 * 60 * 1000; // 1 hour
  }
}

module.exports = adminRateLimit(handler);
