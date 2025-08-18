/**
 * Email Log Cleanup Service
 * Automated data retention enforcement for email logging compliance
 */

const { supabase } = require('./supabase');

class EmailLogCleanupService {
  constructor() {
    this.config = {
      defaultBatchSize: parseInt(process.env.EMAIL_CLEANUP_BATCH_SIZE) || 1000,
      defaultMaxBatches: parseInt(process.env.EMAIL_CLEANUP_MAX_BATCHES) || 10,
      cleanupInterval: parseInt(process.env.EMAIL_CLEANUP_INTERVAL_HOURS) || 24,
      enableCleanup: process.env.EMAIL_CLEANUP_ENABLED !== 'false',
      dryRun: process.env.EMAIL_CLEANUP_DRY_RUN === 'true'
    };
  }

  /**
   * Run comprehensive cleanup of expired email logs
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup results
   */
  async runCleanup(options = {}) {
    const startTime = Date.now();
    const config = { ...this.config, ...options };

    console.log('📧 [CLEANUP] Starting email log cleanup...', {
      batchSize: config.defaultBatchSize,
      maxBatches: config.defaultMaxBatches,
      dryRun: config.dryRun,
      timestamp: new Date().toISOString()
    });

    try {
      // Check if cleanup is enabled
      if (!config.enableCleanup) {
        console.log('📧 [CLEANUP] Email cleanup is disabled');
        return { success: false, reason: 'cleanup_disabled' };
      }

      // Run database cleanup function
      const cleanupResults = await this.executeCleanupFunction(
        config.defaultBatchSize,
        config.defaultMaxBatches,
        config.dryRun
      );

      // Calculate metrics
      const duration = Date.now() - startTime;
      const totalDeleted = cleanupResults.reduce((sum, result) => sum + result.deleted_count, 0);

      const results = {
        success: true,
        duration_ms: duration,
        total_deleted: totalDeleted,
        tables_processed: cleanupResults.length,
        details: cleanupResults,
        timestamp: new Date().toISOString(),
        dry_run: config.dryRun
      };

      console.log('📧 [CLEANUP] Email log cleanup completed', results);

      // Log cleanup operation
      await this.logCleanupOperation(results);

      return results;
    } catch (error) {
      console.error('📧 [CLEANUP] Email log cleanup failed:', error);
      
      const errorResult = {
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Log cleanup failure
      await this.logCleanupOperation(errorResult);

      return errorResult;
    }
  }

  /**
   * Execute the database cleanup function
   * @param {number} batchSize - Number of records to process per batch
   * @param {number} maxBatches - Maximum number of batches to process
   * @param {boolean} dryRun - Whether to perform a dry run
   * @returns {Array} Cleanup results
   */
  async executeCleanupFunction(batchSize, maxBatches, dryRun = false) {
    if (dryRun) {
      // For dry run, just count expired records
      return await this.countExpiredRecords();
    }

    // Execute the actual cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_email_logs', {
      batch_size: batchSize,
      max_batches: maxBatches
    });

    if (error) {
      throw new Error(`Database cleanup function failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Count expired records without deleting (for dry run)
   * @returns {Array} Count results
   */
  async countExpiredRecords() {
    const results = [];

    // Count expired email_notifications
    const { data: notificationCount, error: notificationError } = await supabase
      .from('email_notifications')
      .select('id', { count: 'exact', head: true })
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (!notificationError) {
      results.push({
        table_name: 'email_notifications',
        deleted_count: notificationCount || 0,
        batch_count: 0
      });
    }

    // Count expired email_logs
    const { data: logsCount, error: logsError } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());

    if (!logsError) {
      results.push({
        table_name: 'email_logs',
        deleted_count: logsCount || 0,
        batch_count: 0
      });
    }

    return results;
  }

  /**
   * Get retention status for monitoring
   * @returns {Object} Retention status
   */
  async getRetentionStatus() {
    try {
      const { data, error } = await supabase
        .schema('admin_views')
        .from('email_retention_status')
        .select('*');

      if (error) {
        throw new Error(`Failed to get retention status: ${error.message}`);
      }

      return {
        success: true,
        status: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to get retention status:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Delete all email logs for a specific user (GDPR compliance)
   * @param {number} userId - User ID to delete logs for
   * @returns {Object} Deletion results
   */
  async deleteUserEmailLogs(userId) {
    try {
      console.log(`📧 [CLEANUP] Deleting email logs for user ${userId} (GDPR request)`);

      const { data, error } = await supabase.rpc('delete_user_email_logs', {
        target_user_id: userId
      });

      if (error) {
        throw new Error(`Failed to delete user email logs: ${error.message}`);
      }

      const results = {
        success: true,
        user_id: userId,
        deleted_records: data || [],
        timestamp: new Date().toISOString()
      };

      console.log('📧 [CLEANUP] User email logs deleted successfully', results);

      // Log GDPR deletion
      await this.logGDPRDeletion(userId, results);

      return results;
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to delete user email logs:', error);
      return {
        success: false,
        user_id: userId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Schedule automatic cleanup (to be called by cron job or scheduler)
   * @returns {Object} Schedule result
   */
  async scheduleCleanup() {
    try {
      // Check if it's time to run cleanup
      const lastCleanup = await this.getLastCleanupTime();
      const now = new Date();
      const timeSinceLastCleanup = now - lastCleanup;
      const cleanupIntervalMs = this.config.cleanupInterval * 60 * 60 * 1000; // Convert hours to ms

      if (timeSinceLastCleanup < cleanupIntervalMs) {
        return {
          success: true,
          skipped: true,
          reason: 'cleanup_not_due',
          next_cleanup: new Date(lastCleanup.getTime() + cleanupIntervalMs),
          timestamp: now.toISOString()
        };
      }

      // Run cleanup
      return await this.runCleanup();
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to schedule cleanup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get last cleanup time from logs
   * @returns {Date} Last cleanup time
   */
  async getLastCleanupTime() {
    try {
      // This would typically query a cleanup_logs table
      // For now, return a default time
      const defaultTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      return defaultTime;
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to get last cleanup time:', error);
      return new Date(0); // Return epoch time to force cleanup
    }
  }

  /**
   * Log cleanup operation for monitoring
   * @param {Object} results - Cleanup results
   */
  async logCleanupOperation(results) {
    try {
      // Log to audit_log table for monitoring
      await supabase
        .from('audit_log')
        .insert({
          user_id: null,
          action: 'email_log_cleanup',
          resource_type: 'email_logs',
          resource_id: null,
          details: results,
          ip_address: null,
          user_agent: 'email-cleanup-service'
        });
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to log cleanup operation:', error);
    }
  }

  /**
   * Log GDPR deletion for compliance
   * @param {number} userId - User ID
   * @param {Object} results - Deletion results
   */
  async logGDPRDeletion(userId, results) {
    try {
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action: 'gdpr_email_deletion',
          resource_type: 'email_logs',
          resource_id: userId.toString(),
          details: results,
          ip_address: null,
          user_agent: 'email-cleanup-service'
        });
    } catch (error) {
      console.error('📧 [CLEANUP] Failed to log GDPR deletion:', error);
    }
  }

  /**
   * Get cleanup service configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update cleanup service configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('📧 [CLEANUP] Configuration updated:', this.config);
  }
}

// Export singleton instance
const emailLogCleanupService = new EmailLogCleanupService();
module.exports = { emailLogCleanupService, EmailLogCleanupService };
