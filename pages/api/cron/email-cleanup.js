/**
 * Vercel Cron Job: Email Log Cleanup
 * Automated data retention enforcement for email logging compliance
 * 
 * Schedule: Daily at 1:00 AM UTC (configured in vercel.json)
 * Purpose: Remove expired email logs based on retention categories
 */

import { emailLogCleanupService } from '../../../lib/emailLogCleanupService';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // Security: Verify this is a legitimate cron request
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET) {
      console.error('📧 [CRON] CRON_SECRET environment variable not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        timestamp: new Date().toISOString()
      });
    }
    
    if (authHeader !== expectedAuth) {
      console.error('📧 [CRON] Unauthorized email cleanup attempt', {
        receivedAuth: authHeader ? 'Bearer [REDACTED]' : 'none',
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }

    // Only allow POST requests for security
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        allowed: ['POST'],
        timestamp: new Date().toISOString()
      });
    }

    console.log('📧 [CRON] Starting scheduled email log cleanup...');

    // Run the cleanup with production settings
    const cleanupOptions = {
      dryRun: false,
      defaultBatchSize: parseInt(process.env.EMAIL_CLEANUP_BATCH_SIZE) || 1000,
      defaultMaxBatches: parseInt(process.env.EMAIL_CLEANUP_MAX_BATCHES) || 10,
      enableCleanup: process.env.EMAIL_CLEANUP_ENABLED !== 'false'
    };

    const result = await emailLogCleanupService.runCleanup(cleanupOptions);

    // Calculate execution time
    const executionTime = Date.now() - startTime;
    result.execution_time_ms = executionTime;

    if (result.success) {
      console.log('📧 [CRON] Email cleanup completed successfully', {
        totalDeleted: result.total_deleted,
        tablesProcessed: result.tables_processed,
        executionTime: `${executionTime}ms`,
        timestamp: result.timestamp
      });

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Email log cleanup completed successfully',
        ...result
      });
    } else {
      console.error('📧 [CRON] Email cleanup failed', {
        error: result.error,
        reason: result.reason,
        executionTime: `${executionTime}ms`,
        timestamp: result.timestamp
      });

      // Return error response but with 200 status (so Vercel doesn't retry)
      return res.status(200).json({
        success: false,
        message: 'Email log cleanup failed',
        ...result
      });
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('📧 [CRON] Email cleanup crashed', {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });

    // Return error response but with 200 status (so Vercel doesn't retry)
    return res.status(200).json({
      success: false,
      error: 'Email cleanup service crashed',
      message: error.message,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    });
  }
}

// Export configuration for Vercel
export const config = {
  maxDuration: 300, // 5 minutes max execution time
  memory: 1024      // 1GB memory allocation
};
