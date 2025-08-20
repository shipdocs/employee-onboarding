/**
 * Admin API: Manual Email Log Cleanup
 * Allows administrators to manually trigger email log cleanup
 *
 * Authentication: Requires admin role
 * Purpose: Manual cleanup, testing, and emergency maintenance
 */

import { emailLogCleanupService } from '../../../lib/emailLogCleanupService';
import { createAPIHandler } from '../../../lib/apiHandler';

async function handleEmailCleanup(req, res) {
  const startTime = Date.now();

  try {
    // Parse request options
    const {
      dryRun = false,
      batchSize,
      maxBatches,
      force = false
    } = req.body || {};

    console.log('📧 [ADMIN] Manual email cleanup requested', {
      user: req.user?.email,
      dryRun,
      batchSize,
      maxBatches,
      force,
      timestamp: new Date().toISOString()
    });

    // Configure cleanup options
    const cleanupOptions = {
      dryRun: Boolean(dryRun),
      defaultBatchSize: batchSize ? parseInt(batchSize) : undefined,
      defaultMaxBatches: maxBatches ? parseInt(maxBatches) : undefined,
      enableCleanup: true // Always enabled for manual cleanup
    };

    // Run cleanup
    const result = await emailLogCleanupService.runCleanup(cleanupOptions);

    // Add execution metadata
    const executionTime = Date.now() - startTime;
    result.execution_time_ms = executionTime;
    result.triggered_by = req.user?.email || 'unknown';
    result.manual_trigger = true;

    if (result.success) {
      console.log('📧 [ADMIN] Manual email cleanup completed', {
        user: req.user?.email,
        totalDeleted: result.total_deleted,
        tablesProcessed: result.tables_processed,
        executionTime: `${executionTime}ms`,
        dryRun: result.dry_run
      });

      return res.status(200).json({
        success: true,
        message: dryRun ? 'Dry run completed successfully' : 'Email log cleanup completed successfully',
        ...result
      });
    } else {
      console.error('📧 [ADMIN] Manual email cleanup failed', {
        user: req.user?.email,
        error: result.error,
        reason: result.reason,
        executionTime: `${executionTime}ms`
      });

      return res.status(400).json({
        success: false,
        message: 'Email log cleanup failed',
        ...result
      });
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('📧 [ADMIN] Manual email cleanup crashed', {
      user: req.user?.email,
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`
    });

    return res.status(500).json({
      success: false,
      error: 'Email cleanup service crashed',
      message: error.message,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    });
  }
}

// Export with authentication and method validation
export default createAPIHandler(handleEmailCleanup, {
  requireAuth: true,
  allowedMethods: ['POST'],
  requiredRole: 'admin'
});
