/**
 * Admin Export Cleanup API Endpoint
 * Cleans up expired export files from storage
 */

const { dataExportService } = require('../../../lib/services/dataExportService');
const { withAudit, logAuditEvent } = require('../../../lib/middleware/auditMiddleware');
const { requireAuth, requireAdmin } = require('../../../lib/auth');
const { createAPIHandler, createError } = require('../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../lib/services/auditService');

async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;

    // Clean up expired exports
    const cleanupResult = await dataExportService.cleanupExpiredExports();

    // Log the cleanup action
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'export_cleanup',
      {
        action: 'cleanup_expired_exports',
        cleaned_count: cleanupResult.cleaned,
        total_expired: cleanupResult.total,
        admin_user: user.email
      }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully cleaned up ${cleanupResult.cleaned} expired exports`,
      details: {
        cleaned: cleanupResult.cleaned,
        total: cleanupResult.total,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export cleanup failed:', error);

    // Log the failed cleanup attempt
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'export_cleanup',
      {
        action: 'cleanup_expired_exports_failed',
        error: error.message,
        admin_user: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Cleanup failed',
      message: 'Unable to clean up expired exports. Please try again later.',
      details: error.message
    });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication, admin role requirement, and audit logging
export default withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.ADMIN_ACTION,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.MEDIUM
  }
);
