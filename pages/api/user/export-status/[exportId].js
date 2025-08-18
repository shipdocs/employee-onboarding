/**
 * Export Status Check API Endpoint
 * Allows users to check the status of their data export requests
 */

const { dataExportService } = require('../../../../lib/services/dataExportService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAuth } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');

async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    const { exportId } = req.query;

    // Validate export ID
    if (!exportId || isNaN(parseInt(exportId))) {
      return res.status(400).json({
        error: 'Invalid export ID',
        message: 'Export ID must be a valid number'
      });
    }

    // Get export status (this also verifies user ownership)
    const exportStatus = await dataExportService.getExportStatus(
      parseInt(exportId),
      user.userId
    );

    // Calculate progress percentage based on status
    let progressPercentage = 0;
    switch (exportStatus.status) {
      case 'pending':
        progressPercentage = 10;
        break;
      case 'processing':
        progressPercentage = 50;
        break;
      case 'completed':
        progressPercentage = 100;
        break;
      case 'failed':
      case 'expired':
        progressPercentage = 0;
        break;
    }

    // Prepare response
    const response = {
      success: true,
      export: {
        id: exportStatus.id,
        status: exportStatus.status,
        format: exportStatus.format,
        requestedAt: exportStatus.requested_at,
        completedAt: exportStatus.completed_at,
        progress: progressPercentage
      }
    };

    // Add additional info based on status
    if (exportStatus.status === 'completed') {
      response.export.fileSize = exportStatus.file_size;
      response.export.downloadInfo = {
        message: 'Your export is ready for download',
        downloadUrl: `/api/user/download-export/${exportId}`,
        expiresIn: '30 days'
      };
    } else if (exportStatus.status === 'failed') {
      response.export.error = exportStatus.error_message || 'Export processing failed';
      response.export.retryInfo = {
        message: 'You can request a new export',
        retryUrl: '/api/user/export-data'
      };
    } else if (exportStatus.status === 'expired') {
      response.export.message = 'Export has expired. Please request a new export.';
      response.export.retryInfo = {
        message: 'Request a new export',
        retryUrl: '/api/user/export-data'
      };
    } else if (exportStatus.status === 'processing') {
      response.export.message = 'Your export is being processed. This may take several minutes.';
      response.export.estimatedCompletion = new Date(
        new Date(exportStatus.requested_at).getTime() + 30 * 60 * 1000
      ).toISOString();
    } else if (exportStatus.status === 'pending') {
      response.export.message = 'Your export request is queued for processing.';
    }

    // Log status check (only for completed exports to avoid spam)
    if (exportStatus.status === 'completed') {
      await logAuditEvent(
        req,
        ACTION_TYPES.READ,
        RESOURCE_TYPES.USER,
        exportId,
        {
          export_status: exportStatus.status,
          status_check: true
        }
      );
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Export status check failed:', error);

    if (error.message.includes('Export not found')) {
      return res.status(404).json({
        error: 'Export not found',
        message: 'The requested export does not exist or you do not have permission to access it.'
      });
    }

    return res.status(500).json({
      error: 'Status check failed',
      message: 'Unable to retrieve export status. Please try again later.'
    });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET']
});

// Export with authentication and minimal audit logging
export default withAudit(
  requireAuth(apiHandler),
  {
    action: ACTION_TYPES.READ,
    resourceType: RESOURCE_TYPES.USER,
    auditPath: false, // Don't audit every status check
    severityLevel: SEVERITY_LEVELS.LOW
  }
);
