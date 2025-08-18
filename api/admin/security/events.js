// api/admin/security/events.js - Security events monitoring endpoint
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');
const securityAuditLogger = require('../../../lib/security/SecurityAuditLogger');

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getSecurityEvents(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSecurityEvents(req, res) {
  try {
    const {
      type,
      severity,
      userId,
      ipAddress,
      since,
      until,
      threats,
      limit = 100,
      page = 1
    } = req.query;

    // Build filters
    const filters = {};
    
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (userId) filters.userId = userId;
    if (ipAddress) filters.ipAddress = ipAddress;
    if (since) filters.since = since;
    if (until) filters.until = until;
    if (threats) filters.threats = Array.isArray(threats) ? threats : [threats];
    if (limit) filters.limit = Math.min(parseInt(limit), 1000); // Cap at 1000

    // Query events
    const result = await securityAuditLogger.queryEvents(filters);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to retrieve security events',
        details: result.error
      });
    }

    // Calculate pagination
    const totalEvents = result.events.length;
    const pageSize = parseInt(limit);
    const currentPage = parseInt(page);
    const totalPages = Math.ceil(totalEvents / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = result.events.slice(startIndex, endIndex);

    res.json({
      success: true,
      events: paginatedEvents,
      pagination: {
        page: currentPage,
        pageSize: pageSize,
        totalEvents: totalEvents,
        totalPages: totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      },
      filters: filters
    });

  } catch (error) {
    console.error('Security events query error:', error);
    res.status(500).json({
      error: 'Failed to retrieve security events',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));