/**
 * Exit Strategy Status API Endpoint
 * Handles status checking for system export jobs
 */

const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAdmin } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');
const { supabase } = require('../../../../lib/database-supabase-compat');

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

    if (exportId) {
      // Get specific export job status
      const { data: exportJob, error } = await supabase
        .from('exit_strategy_jobs')
        .select('*')
        .eq('id', exportId)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Export job not found' });
      }

      return res.status(200).json({
        export: {
          id: exportJob.id,
          status: exportJob.status,
          requested_at: exportJob.requested_at,
          completed_at: exportJob.completed_at,
          expires_at: exportJob.expires_at,
          file_size: exportJob.file_size,
          error_message: exportJob.error_message,
          export_options: exportJob.export_options
        }
      });
    } else {
      // Get all export jobs for admin
      const { data: exportJobs, error } = await supabase
        .from('exit_strategy_jobs')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch export jobs:', error);
        return res.status(500).json({ error: 'Failed to fetch export jobs' });
      }

      return res.status(200).json({
        exports: exportJobs.map(job => ({
          id: job.id,
          status: job.status,
          requested_at: job.requested_at,
          completed_at: job.completed_at,
          expires_at: job.expires_at,
          file_size: job.file_size,
          admin_email: job.admin_email,
          export_options: job.export_options
        }))
      });
    }

  } catch (error) {
    console.error('Exit strategy status check failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check export status'
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
    action: ACTION_TYPES.VIEW,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.LOW
  }
);
