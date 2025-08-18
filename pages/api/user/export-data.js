/**
 * User Data Export API Endpoint
 * Provides GDPR-compliant personal data export functionality
 */

const { dataExportService, EXPORT_FORMATS } = require('../../../lib/services/dataExportService');
const { withAudit, logAuditEvent } = require('../../../lib/middleware/auditMiddleware');
const { requireAuth } = require('../../../lib/auth');
const { createAPIHandler, createError, createValidationError } = require('../../../lib/apiHandler');
const { validators, validateObject } = require('../../../lib/validation');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../lib/services/auditService');

async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    console.log('🔍 DEBUG: user object:', JSON.stringify(user, null, 2));

    // Validate request body
    const validationSchema = {
      format: {
        required: false,
        type: 'string',
        options: {
          enum: Object.values(EXPORT_FORMATS)
        }
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const { format = EXPORT_FORMATS.JSON } = req.body;

    // Check for existing pending exports to prevent spam
    const existingExports = await dataExportService.getUserExportHistory(user.userId, 5);
    const pendingExports = existingExports.filter(exp =>
      exp.status === 'pending' || exp.status === 'processing'
    );

    if (pendingExports.length > 0) {
      return res.status(429).json({
        error: 'Export already in progress',
        message: 'You have a pending export request. Please wait for it to complete.',
        existingExport: {
          id: pendingExports[0].id,
          status: pendingExports[0].status,
          requestedAt: pendingExports[0].requested_at
        }
      });
    }

    // Request data export
    const exportResult = await dataExportService.requestUserDataExport(
      user.userId,
      user.email,
      format,
      req
    );

    // Log the export request
    await logAuditEvent(
      req,
      ACTION_TYPES.EXPORT,
      RESOURCE_TYPES.USER,
      exportResult.exportId,
      {
        format,
        export_type: 'user_data_request',
        user_initiated: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Data export request submitted successfully',
      export: {
        id: exportResult.exportId,
        status: exportResult.status,
        format: format,
        estimatedCompletion: exportResult.estimatedCompletion,
        requestedAt: new Date().toISOString()
      },
      instructions: {
        statusCheck: `Use GET /api/user/export-status/${exportResult.exportId} to check progress`,
        notification: 'You will receive an email notification when your export is ready',
        expiration: 'Export files are available for 30 days after completion'
      }
    });

  } catch (error) {
    console.error('User data export request failed:', error);

    // Log the failed request
    await logAuditEvent(
      req,
      ACTION_TYPES.EXPORT,
      RESOURCE_TYPES.USER,
      null,
      {
        error: error.message,
        export_type: 'user_data_request',
        user_initiated: true,
        failed: true
      }
    );

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    return res.status(500).json({
      error: 'Export request failed',
      message: 'Unable to process your data export request. Please try again later.'
    });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication and audit logging
export default withAudit(
  requireAuth(apiHandler),
  {
    action: ACTION_TYPES.EXPORT,
    resourceType: RESOURCE_TYPES.USER,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.MEDIUM
  }
);
