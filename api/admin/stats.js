// Vercel API Route: /api/admin/stats.js - Admin system statistics
const db = require('../../lib/database');
const { authenticateRequest } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let user = null;
  try {
    // Verify admin authentication with proper blacklist checking
    user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Simple stats with fallback values
    const stats = {
      totalManagers: 0,
      totalCrew: 0,
      totalTemplates: 0,
      totalCertificates: 0
    };

    try {
      // Get manager count
      const { count: managerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'manager');

      stats.totalManagers = managerCount || 0;

      // Get crew count
      const { count: crewCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'crew');

      stats.totalCrew = crewCount || 0;

      // Get template count
      const { count: templateCount } = await supabase
        .from('pdf_templates')
        .select('*', { count: 'exact', head: true });

      stats.totalTemplates = templateCount || 0;

    } catch (queryError) {

      // Continue with default values
    }

    res.json(stats);
  } catch (error) {
    const secureErrorHandler = require('../../lib/security/SecureErrorHandler');
    const context = {
      userId: user?.id,
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      requestId: req.headers['x-request-id'],
      userRole: user?.role,
      requestData: req.body,
      userInput: req.query.q || req.body?.content || req.body?.message
    };

    const result = await secureErrorHandler.handleError(error, context);
    res.status(result.clientResponse.error.statusCode)
       .json(result.clientResponse);
  }
}

module.exports = adminRateLimit(handler);
