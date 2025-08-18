/**
 * Admin Export Status Check API Endpoint
 * Allows administrators to check the status of bulk export requests
 */

const { dataExportService } = require('../../../../lib/services/dataExportService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAuth, requireAdmin } = require('../../../../lib/auth');
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

    // Get export status (admins can access any export)
    const exportStatus = await dataExportService.getExportJob(parseInt(exportId));

    if (!exportStatus) {
      return res.status(404).json({
        error: 'Export not found',
        message: 'The requested export does not exist.'
      });
    }

    // Calculate progress percentage based on status and metadata
    let progressPercentage = 0;
    let progressDetails = null;

    if (exportStatus.metadata && exportStatus.metadata.progress !== undefined) {
      progressPercentage = exportStatus.metadata.progress;
      progressDetails = {
        processedCount: exportStatus.metadata.processed_count || 0,
        totalCount: exportStatus.metadata.total_count || 0
      };
    } else {
      // Fallback to status-based progress
      switch (exportStatus.status) {
        case 'pending':
          progressPercentage = 5;
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
    }

    // Prepare response
    const response = {
      success: true,
      export: {
        id: exportStatus.id,
        type: exportStatus.export_type,
        status: exportStatus.status,
        format: exportStatus.format,
        requestedAt: exportStatus.requested_at,
        completedAt: exportStatus.completed_at,
        progress: progressPercentage
      }
    };

    // Add bulk export specific information
    if (exportStatus.export_type === 'admin_bulk' && exportStatus.metadata) {
      response.export.bulkInfo = {
        userCount: exportStatus.metadata.user_count,
        criteria: exportStatus.metadata.criteria
      };

      if (progressDetails) {
        response.export.bulkInfo.progress = progressDetails;
      }
    }

    // Add additional info based on status
    if (exportStatus.status === 'completed') {
      response.export.fileSize = exportStatus.file_size;
      response.export.checksum = exportStatus.checksum;
      response.export.downloadInfo = {
        message: 'Your export is ready for download',
        downloadUrl: `/api/admin/download-export/${exportId}`,
        expiresIn: '30 days'
      };
    } else if (exportStatus.status === 'failed') {
      response.export.error = exportStatus.error_message || 'Export processing failed';
      response.export.retryInfo = {
        message: 'You can request a new export',
        retryUrl: '/api/admin/bulk-export'
      };
    } else if (exportStatus.status === 'expired') {
      response.export.message = 'Export has expired. Please request a new export.';
      response.export.retryInfo = {
        message: 'Request a new export',
        retryUrl: '/api/admin/bulk-export'
      };
    } else if (exportStatus.status === 'processing') {
      response.export.message = 'Your export is being processed. This may take several minutes.';

      if (exportStatus.metadata && exportStatus.metadata.user_count) {
        const estimatedMinutes = Math.ceil(exportStatus.metadata.user_count * 2); // 2 minutes per user
        response.export.estimatedCompletion = new Date(
          new Date(exportStatus.requested_at).getTime() + estimatedMinutes * 60 * 1000
        ).toISOString();
      }
    } else if (exportStatus.status === 'pending') {
      response.export.message = 'Your export request is queued for processing.';
    }

    // Log status check for completed exports
    if (exportStatus.status === 'completed') {
      await logAuditEvent(
        req,
        ACTION_TYPES.READ,
        RESOURCE_TYPES.ADMIN,
        exportId,
        {
          export_status: exportStatus.status,
          export_type: exportStatus.export_type,
          status_check: true
        }
      );
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Admin export status check failed:', error);

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

// Export with authentication, admin role requirement, and minimal audit logging
export default withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.READ,
    resourceType: RESOURCE_TYPES.ADMIN,
    auditPath: false, // Don't audit every status check
    severityLevel: SEVERITY_LEVELS.LOW
  }
);
