/**
 * Automated Cleanup Service
 * Handles scheduled cleanup of expired tokens and system maintenance
 */

const { supabase } = require('../../lib/supabase');
const config = require('./token-cleanup-config');

class AutomatedCleanupService {
  constructor() {
    this.config = config.tokenCleanup;
    this.metrics = {
      tokensDeleted: 0,
      sessionsDeleted: 0,
      auditLogsDeleted: 0,
      errors: []
    };
  }

  /**
   * Main cleanup execution
   */
  async execute() {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting automated cleanup...`);

    try {
      // Clean expired tokens
      await this.cleanupExpiredTokens();
      
      // Clean expired sessions
      await this.cleanupExpiredSessions();
      
      // Clean old audit logs
      await this.cleanupOldAuditLogs();
      
      // Clean orphaned data
      await this.cleanupOrphanedData();
      
      // Report results
      const duration = Date.now() - startTime;
      await this.reportResults(duration);
      
      return {
        success: true,
        metrics: this.metrics,
        duration
      };
    } catch (error) {
      console.error('Cleanup execution failed:', error);
      this.metrics.errors.push({
        type: 'execution_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.sendAlert('Cleanup Failed', error.message);
      
      return {
        success: false,
        error: error.message,
        metrics: this.metrics
      };
    }
  }

  /**
   * Clean expired blacklisted tokens
   */
  async cleanupExpiredTokens() {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_blacklisted_tokens');

      if (error) throw error;

      this.metrics.tokensDeleted = data || 0;
      console.log(`Cleaned up ${this.metrics.tokensDeleted} expired tokens`);
    } catch (error) {
      console.error('Token cleanup error:', error);
      this.metrics.errors.push({
        type: 'token_cleanup',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clean expired user sessions
   */
  async cleanupExpiredSessions() {
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore && totalDeleted < 10000) {
        const { data, error } = await supabase
          .from('user_sessions')
          .delete()
          .or(`expires_at.lt.${new Date().toISOString()},last_activity.lt.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`)
          .select('id')
          .limit(this.config.batchSize);

        if (error) throw error;

        const deletedCount = data?.length || 0;
        totalDeleted += deletedCount;
        hasMore = deletedCount === this.config.batchSize;

        // Prevent long-running operations
        if (Date.now() - startTime > this.config.maxExecutionTime * 1000) {
          console.warn('Session cleanup timeout reached');
          break;
        }
      }

      this.metrics.sessionsDeleted = totalDeleted;
      console.log(`Cleaned up ${totalDeleted} expired sessions`);
    } catch (error) {
      console.error('Session cleanup error:', error);
      this.metrics.errors.push({
        type: 'session_cleanup',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clean old audit logs
   */
  async cleanupOldAuditLogs() {
    try {
      const cutoffDate = new Date(Date.now() - this.config.retention.auditLogRetention);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')
        .limit(this.config.batchSize);

      if (error) throw error;

      this.metrics.auditLogsDeleted = data?.length || 0;
      console.log(`Cleaned up ${this.metrics.auditLogsDeleted} old audit logs`);
    } catch (error) {
      console.error('Audit log cleanup error:', error);
      this.metrics.errors.push({
        type: 'audit_cleanup',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clean orphaned data
   */
  async cleanupOrphanedData() {
    try {
      // Clean orphaned training progress
      const { error: progressError } = await supabase.rpc('cleanup_orphaned_training_progress');
      if (progressError) throw progressError;

      // Clean orphaned quiz attempts
      const { error: quizError } = await supabase.rpc('cleanup_orphaned_quiz_attempts');
      if (quizError) throw quizError;

      console.log('Cleaned up orphaned data');
    } catch (error) {
      console.error('Orphaned data cleanup error:', error);
      this.metrics.errors.push({
        type: 'orphaned_cleanup',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Report cleanup results
   */
  async reportResults(duration) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        tokensDeleted: this.metrics.tokensDeleted,
        sessionsDeleted: this.metrics.sessionsDeleted,
        auditLogsDeleted: this.metrics.auditLogsDeleted,
        errors: this.metrics.errors.length
      },
      status: this.metrics.errors.length === 0 ? 'success' : 'partial_failure'
    };

    // Log to database
    try {
      await supabase
        .from('maintenance_logs')
        .insert({
          type: 'automated_cleanup',
          status: report.status,
          details: report,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log cleanup results:', error);
    }

    // Send notification if configured
    if (this.config.notifications.enabled) {
      await this.sendNotification('Cleanup Completed', report);
    }

    return report;
  }

  /**
   * Send alert notification
   */
  async sendAlert(subject, message) {
    if (!this.config.notifications.enabled) return;

    try {
      // Email notification
      if (this.config.notifications.channels.includes('email')) {
        await this.sendEmailAlert(subject, message);
      }

      // Slack notification
      if (this.config.notifications.channels.includes('slack') && this.config.notifications.recipients.slack) {
        await this.sendSlackAlert(subject, message);
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(subject, message) {
    // Implementation would use the unifiedEmailService
    console.log(`Email alert: ${subject} - ${message}`);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(subject, message) {
    // Implementation would use Slack webhook
    console.log(`Slack alert: ${subject} - ${message}`);
  }

  /**
   * Send completion notification
   */
  async sendNotification(subject, report) {
    // Only send if there are errors or significant deletions
    if (report.results.errors > 0 || 
        report.results.tokensDeleted > 1000 ||
        report.results.sessionsDeleted > 1000) {
      await this.sendAlert(subject, JSON.stringify(report, null, 2));
    }
  }
}

// Export for use in cron jobs
module.exports = AutomatedCleanupService;