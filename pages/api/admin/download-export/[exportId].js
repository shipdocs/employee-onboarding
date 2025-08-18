/**
 * Admin Export Download API Endpoint
 * Allows administrators to download completed bulk exports
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

    // Check if export is completed and available
    if (exportStatus.status !== 'completed') {
      return res.status(400).json({
        error: 'Export not ready',
        message: `Export status is '${exportStatus.status}'. Only completed exports can be downloaded.`,
        currentStatus: {
          status: exportStatus.status,
          requestedAt: exportStatus.requested_at
        }
      });
    }

    // Check if export has expired
    const now = new Date();
    const requestedAt = new Date(exportStatus.requested_at);
    const expirationDate = new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (now > expirationDate) {
      return res.status(410).json({
        error: 'Export expired',
        message: 'This export has expired and is no longer available for download.',
        expiredAt: expirationDate.toISOString(),
        retryInfo: {
          message: 'Please request a new export',
          retryUrl: '/api/admin/bulk-export'
        }
      });
    }

    // Generate export data based on type
    // Retrieve the stored export file
    if (!exportStatus.file_path) {
      throw new Error('Export file not found - file may have been deleted or export failed');
    }

    let exportData;
    let mimeType;
    let fileExtension;
    let fileName;

    try {
      // Download the stored file from Supabase Storage
      const fileBlob = await dataExportService.getStoredExportFile(exportStatus.file_path);
      exportData = await fileBlob.text();

      // Validate checksum if available
      if (exportStatus.checksum) {
        const crypto = require('crypto');
        const calculatedChecksum = crypto.createHash('sha256').update(exportData).digest('hex');
        if (calculatedChecksum !== exportStatus.checksum) {
          console.error(`Checksum mismatch for export ${exportId}: expected ${exportStatus.checksum}, got ${calculatedChecksum}`);
          throw new Error('Export file integrity check failed. Please request a new export.');
        }
        console.log(`✅ Checksum validated for export ${exportId}`);
      }

      // Set appropriate MIME type and extension based on format
      if (exportStatus.format === 'json') {
        mimeType = 'application/json';
        fileExtension = 'json';
      } else if (exportStatus.format === 'csv') {
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else {
        throw new Error(`Unsupported export format: ${exportStatus.format}`);
      }

      // Generate appropriate filename based on export type
      if (exportStatus.export_type === 'admin_bulk') {
        const userCount = exportStatus.metadata?.user_count || 'unknown';
        fileName = `bulk_export_${userCount}_users_${exportId}.${fileExtension}`;
      } else {
        fileName = `user_export_${exportStatus.user_id}_${exportId}.${fileExtension}`;
      }
    } catch (error) {
      console.error('Failed to retrieve stored export file:', error);
      throw new Error('Export file could not be retrieved. Please request a new export.');
    }

    if (!exportData) {
      throw new Error(`Unsupported export format: ${exportStatus.format}`);
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(exportData, 'utf8'));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Add custom headers for export metadata
    res.setHeader('X-Export-ID', exportId);
    res.setHeader('X-Export-Type', exportStatus.export_type);
    res.setHeader('X-Export-Format', exportStatus.format);
    res.setHeader('X-Export-Date', exportStatus.completed_at);
    res.setHeader('X-File-Size', Buffer.byteLength(exportData, 'utf8'));

    // Log the download
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_BULK_EXPORT,
      RESOURCE_TYPES.ADMIN,
      exportId,
      {
        action: 'download',
        export_type: exportStatus.export_type,
        format: exportStatus.format,
        file_size: Buffer.byteLength(exportData, 'utf8'),
        download_timestamp: new Date().toISOString(),
        downloaded_by: user.email
      }
    );

    // Send the file data
    res.status(200).send(exportData);

  } catch (error) {
    console.error('Admin export download failed:', error);

    // Log the failed download attempt
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_BULK_EXPORT,
      RESOURCE_TYPES.ADMIN,
      req.query.exportId,
      {
        action: 'download_failed',
        error: error.message,
        download_timestamp: new Date().toISOString(),
        attempted_by: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Download failed',
      message: 'Unable to download export file. Please try again later.'
    });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET']
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
