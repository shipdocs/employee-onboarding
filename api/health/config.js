// api/health/config.js - Configuration health check endpoint
const { getConfigurationHealth } = require('../../lib/security/configInit');
const { requireAdmin } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get configuration health status
    const health = getConfigurationHealth();
    
    // Determine HTTP status based on health
    const httpStatus = health.status === 'healthy' ? 200 : 503;
    
    // Return health information
    res.status(httpStatus).json({
      status: health.status,
      timestamp: health.timestamp,
      environment: health.environment,
      summary: {
        initialized: health.initialized,
        configCount: health.configCount,
        errorCount: health.validationErrors.length + (health.runtimeErrors?.length || 0),
        warningCount: health.requirements?.warnings?.length || 0
      },
      validation: {
        errors: [
          ...health.validationErrors.map(e => ({ key: e.key, error: e.error, required: e.required })),
          ...(health.runtimeErrors || []).map(error => ({ error, type: 'runtime' }))
        ],
        warnings: health.requirements?.warnings || []
      },
      // Only include masked config for admins and in development
      ...(health.environment.isDevelopment && { maskedConfig: health.maskedConfig })
    });

  } catch (error) {
    console.error('Configuration health check error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to check configuration health',
      timestamp: new Date().toISOString()
    });
  }
}

// Export with admin authentication and rate limiting
module.exports = adminRateLimit(requireAdmin(handler));