/**
 * Exit Strategy Export API Endpoint
 * Handles complete system export requests for migration
 */

const { exitStrategyService } = require('../../../../lib/services/exitStrategyService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAdmin } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      includeUserData = true,
      includeSystemConfig = true,
      includeAuditLogs = true,
      includeCertificates = true,
      includeTrainingContent = true,
      format = 'json',
      dateRange = null
    } = req.body;

    // Validate date range if provided
    if (dateRange) {
      if (dateRange.start && !isValidDate(dateRange.start)) {
        return res.status(400).json({ error: 'Invalid start date format' });
      }
      if (dateRange.end && !isValidDate(dateRange.end)) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
    }

    // Validate format
    const validFormats = ['json'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: 'Invalid format',
        valid_formats: validFormats
      });
    }

    // Request system export
    const result = await exitStrategyService.requestSystemExport(
      user.userId,
      user.email,
      {
        includeUserData,
        includeSystemConfig,
        includeAuditLogs,
        includeCertificates,
        includeTrainingContent,
        format,
        dateRange
      }
    );

    // Log audit event
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      result.exportId,
      {
        action: 'system_export_requested',
        export_options: {
          includeUserData,
          includeSystemConfig,
          includeAuditLogs,
          includeCertificates,
          includeTrainingContent,
          format,
          dateRange
        },
        admin_user: user.email
      }
    );

    return res.status(201).json({
      success: true,
      message: 'System export request submitted successfully',
      export: {
        id: result.exportId,
        status: result.status,
        estimated_completion: result.estimatedCompletion,
        requested_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System export request failed:', error);

    // Log failed attempt
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'failed',
      {
        action: 'system_export_request_failed',
        error: error.message,
        admin_user: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to request system export'
    });
  }
}

/**
 * Validate date string
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication and audit logging
module.exports = withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.ADMIN_ACTION,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.CRITICAL
  }
);
