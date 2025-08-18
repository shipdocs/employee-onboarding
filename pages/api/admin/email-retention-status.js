/**
 * Admin API: Email Retention Status
 * Provides real-time monitoring of email log retention compliance
 * 
 * Authentication: Requires admin role
 * Purpose: Monitoring, compliance reporting, and operational visibility
 */

import { emailLogCleanupService } from '../../../lib/emailLogCleanupService';
import { createAPIHandler } from '../../../lib/apiHandler';

async function handleRetentionStatus(req, res) {
  try {
    console.log('📊 [ADMIN] Email retention status requested', {
      user: req.user?.email,
      timestamp: new Date().toISOString()
    });

    // Get retention status from the service
    const statusResult = await emailLogCleanupService.getRetentionStatus();

    if (!statusResult.success) {
      console.error('📊 [ADMIN] Failed to get retention status', {
        user: req.user?.email,
        error: statusResult.error
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve retention status',
        message: statusResult.error,
        timestamp: new Date().toISOString()
      });
    }

    // Calculate summary statistics
    const summary = {
      total_tables: statusResult.status.length,
      total_records: 0,
      total_expired: 0,
      total_active: 0,
      total_permanent: 0,
      cleanup_needed: false
    };

    for (const table of statusResult.status) {
      summary.total_records += table.total_records || 0;
      summary.total_expired += table.expired_records || 0;
      summary.total_active += table.active_records || 0;
      summary.total_permanent += table.permanent_records || 0;
    }

    summary.cleanup_needed = summary.total_expired > 0;

    // Add metadata
    const response = {
      success: true,
      message: 'Email retention status retrieved successfully',
      summary,
      details: statusResult.status,
      timestamp: statusResult.timestamp,
      requested_by: req.user?.email || 'unknown'
    };

    console.log('📊 [ADMIN] Email retention status provided', {
      user: req.user?.email,
      totalRecords: summary.total_records,
      expiredRecords: summary.total_expired,
      cleanupNeeded: summary.cleanup_needed
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('📊 [ADMIN] Email retention status crashed', {
      user: req.user?.email,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Retention status service crashed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export with authentication and method validation
export default createAPIHandler(handleRetentionStatus, {
  requireAuth: true,
  allowedMethods: ['GET'],
  requiredRole: 'admin'
});
