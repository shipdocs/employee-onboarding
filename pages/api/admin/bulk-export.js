/**
 * Admin Bulk Export API Endpoint
 * Allows administrators to export data for multiple users simultaneously
 */

const { dataExportService, EXPORT_FORMATS } = require('../../../lib/services/dataExportService');
const { withAudit, logAuditEvent } = require('../../../lib/middleware/auditMiddleware');
const { requireAuth, requireAdmin } = require('../../../lib/auth');
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

    // Validate request body
    const validationSchema = {
      format: {
        required: false,
        type: 'string',
        options: {
          enum: Object.values(EXPORT_FORMATS)
        }
      },
      criteria: {
        required: true,
        type: 'object',
        options: {}
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const { format = EXPORT_FORMATS.JSON, criteria } = req.body;

    // Validate criteria object
    const criteriaValidation = validateBulkExportCriteria(criteria);
    if (!criteriaValidation.valid) {
      throw createValidationError('Invalid export criteria', {
        errors: criteriaValidation.errors
      });
    }

    // Check for existing pending bulk exports to prevent spam
    const existingExports = await dataExportService.getUserExportHistory(user.userId, 5);
    const pendingBulkExports = existingExports.filter(exp =>
      (exp.status === 'pending' || exp.status === 'processing') &&
      exp.export_type === 'admin_bulk'
    );

    if (pendingBulkExports.length > 0) {
      return res.status(429).json({
        error: 'Bulk export already in progress',
        message: 'You have a pending bulk export request. Please wait for it to complete.',
        existingExport: {
          id: pendingBulkExports[0].id,
          status: pendingBulkExports[0].status,
          requestedAt: pendingBulkExports[0].requested_at
        }
      });
    }

    // Request bulk data export
    const exportResult = await dataExportService.requestBulkDataExport(
      user.userId,
      user.email,
      criteria,
      format,
      req
    );

    // Log the bulk export request
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_BULK_EXPORT,
      RESOURCE_TYPES.ADMIN,
      exportResult.exportId,
      {
        format,
        export_type: 'admin_bulk',
        user_count: exportResult.userCount,
        criteria: criteria,
        admin_initiated: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Bulk export request submitted successfully',
      export: {
        id: exportResult.exportId,
        status: exportResult.status,
        format: format,
        userCount: exportResult.userCount,
        estimatedCompletion: exportResult.estimatedCompletion,
        requestedAt: new Date().toISOString()
      },
      criteria: criteria,
      instructions: {
        statusCheck: `Use GET /api/admin/export-status/${exportResult.exportId} to check progress`,
        notification: 'You will receive an email notification when your bulk export is ready',
        expiration: 'Export files are available for 30 days after completion'
      }
    });

  } catch (error) {
    console.error('Admin bulk export request failed:', error);

    // Log the failed request
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_BULK_EXPORT,
      RESOURCE_TYPES.ADMIN,
      null,
      {
        error: error.message,
        export_type: 'admin_bulk',
        admin_initiated: true,
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
      error: 'Bulk export request failed',
      message: 'Unable to process your bulk export request. Please try again later.'
    });
  }
}

/**
 * Validate bulk export criteria
 */
function validateBulkExportCriteria(criteria) {
  const errors = [];

  if (!criteria || typeof criteria !== 'object') {
    return { valid: false, errors: ['Criteria must be an object'] };
  }

  // Validate role filter
  if (criteria.role && !['all', 'admin', 'manager', 'crew'].includes(criteria.role)) {
    errors.push('Invalid role filter. Must be: all, admin, manager, or crew');
  }

  // Validate status filter
  if (criteria.status && !['all', 'pending', 'active', 'inactive', 'completed'].includes(criteria.status)) {
    errors.push('Invalid status filter. Must be: all, pending, active, inactive, or completed');
  }

  // Validate date filters
  if (criteria.created_after && !isValidDate(criteria.created_after)) {
    errors.push('Invalid created_after date format. Use ISO 8601 format.');
  }

  if (criteria.created_before && !isValidDate(criteria.created_before)) {
    errors.push('Invalid created_before date format. Use ISO 8601 format.');
  }

  // Validate date range
  if (criteria.created_after && criteria.created_before) {
    const after = new Date(criteria.created_after);
    const before = new Date(criteria.created_before);
    if (after >= before) {
      errors.push('created_after must be earlier than created_before');
    }
  }

  // Validate user_ids array
  if (criteria.user_ids) {
    if (!Array.isArray(criteria.user_ids)) {
      errors.push('user_ids must be an array');
    } else if (criteria.user_ids.length > 1000) {
      errors.push('Maximum 1000 user IDs allowed');
    } else if (criteria.user_ids.some(id => !Number.isInteger(id) || id <= 0)) {
      errors.push('All user IDs must be positive integers');
    }
  }

  // Validate vessel assignment
  if (criteria.vessel_assignment && typeof criteria.vessel_assignment !== 'string') {
    errors.push('vessel_assignment must be a string');
  }

  // Check that at least one meaningful criteria is provided
  const meaningfulCriteria = ['role', 'status', 'created_after', 'created_before', 'user_ids', 'vessel_assignment'];
  const hasMeaningfulCriteria = meaningfulCriteria.some(key =>
    criteria[key] !== undefined && criteria[key] !== 'all'
  );

  if (!hasMeaningfulCriteria) {
    errors.push('At least one meaningful selection criteria must be provided');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date string
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication, admin role requirement, and audit logging
export default withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.ADMIN_BULK_EXPORT,
    resourceType: RESOURCE_TYPES.ADMIN,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.HIGH
  }
);
