/**
 * Exit Strategy Download API Endpoint
 * Handles downloading completed system exports
 */

const { exitStrategyService } = require('../../../../lib/services/exitStrategyService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAdmin } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');
const { StorageService } = require('../../../../lib/storage');
const { supabase } = require('../../../../lib/supabase');
const crypto = require('crypto');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { exportId } = req.query;

    if (!exportId) {
      return res.status(400).json({ error: 'Export ID is required' });
    }

    // Get export job details
    const { data: exportJob, error } = await supabase
      .from('exit_strategy_jobs')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    // Check if export is completed
    if (exportJob.status !== 'completed') {
      return res.status(400).json({
        error: 'Export not completed',
        status: exportJob.status,
        message: exportJob.status === 'failed' ? exportJob.error_message : 'Export is still processing'
      });
    }

    // Check if export has expired
    if (new Date() > new Date(exportJob.expires_at)) {
      return res.status(410).json({
        error: 'Export has expired',
        expired_at: exportJob.expires_at
      });
    }

    // Check if file exists
    if (!exportJob.file_path) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    try {
      // Download file from storage
      const fileBlob = await StorageService.downloadFile('data-exports', exportJob.file_path);
      const fileBuffer = await fileBlob.arrayBuffer();
      const fileData = Buffer.from(fileBuffer);

      // Validate checksum if available
      if (exportJob.checksum) {
        const calculatedChecksum = crypto.createHash('sha256').update(fileData).digest('hex');
        if (calculatedChecksum !== exportJob.checksum) {
          console.error(`Checksum mismatch for export ${exportId}: expected ${exportJob.checksum}, got ${calculatedChecksum}`);
          return res.status(500).json({
            error: 'File integrity check failed',
            message: 'Export file may be corrupted. Please request a new export.'
          });
        }
      }

      // Log download event
      await logAuditEvent(
        req,
        ACTION_TYPES.DOWNLOAD,
        RESOURCE_TYPES.SYSTEM,
        exportId,
        {
          action: 'system_export_downloaded',
          file_size: fileData.length,
          admin_user: user.email,
          export_options: exportJob.export_options
        }
      );

      // Set response headers
      const fileName = `system_export_${exportId}_${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileData.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send file
      res.status(200).send(fileData);

    } catch (fileError) {
      console.error('Failed to retrieve export file:', fileError);
      return res.status(500).json({
        error: 'File retrieval failed',
        message: 'Export file could not be retrieved. Please contact support.'
      });
    }

  } catch (error) {
    console.error('Export download failed:', error);

    // Log failed download attempt
    await logAuditEvent(
      req,
      ACTION_TYPES.DOWNLOAD,
      RESOURCE_TYPES.SYSTEM,
      req.query.exportId || 'unknown',
      {
        action: 'system_export_download_failed',
        error: error.message,
        admin_user: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to download export'
    });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET']
});

// Export with authentication and audit logging
module.exports = withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.DOWNLOAD,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.HIGH
  }
);
