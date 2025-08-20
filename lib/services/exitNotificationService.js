/**
 * Exit Strategy Notification Service
 * Handles email notifications for export and deletion operations
 */

const { unifiedEmailService } = require('../unifiedEmailService');
const { auditService, ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('./auditService');

class ExitNotificationService {
  constructor() {
    this.emailService = unifiedEmailService;
  }

  /**
   * Send export completion notification
   */
  async sendExportCompletionNotification(exportJob, packageResult) {
    try {
      const { admin_email, export_options, id, requested_at } = exportJob;
      const { fileSize, fileName } = packageResult;

      const emailData = {
        to: admin_email,
        subject: 'System Export Completed - Maritime Onboarding System',
        template: 'export_completion',
        templateData: {
          exportId: id,
          requestedAt: new Date(requested_at).toLocaleString(),
          fileSize: this.formatFileSize(fileSize),
          fileName,
          downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=exit-strategy`,
          exportOptions: this.formatExportOptions(export_options),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString(), // 7 days
          supportEmail: process.env.SUPPORT_EMAIL || 'support@maritime-example.com'
        }
      };

      await this.emailService.sendEmail(emailData);

      // Log notification sent
      await auditService.logEvent({
        userId: null,
        userEmail: admin_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: id,
        details: {
          action: 'export_completion_notification_sent',
          export_id: id,
          recipient: admin_email,
          file_size: fileSize
        },
        severityLevel: SEVERITY_LEVELS.LOW
      });

      console.log(`📧 Export completion notification sent to ${admin_email} for export ${id}`);

    } catch (error) {
      console.error('Failed to send export completion notification:', error);

      // Log notification failure
      await auditService.logEvent({
        userId: null,
        userEmail: exportJob.admin_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: exportJob.id,
        details: {
          action: 'export_completion_notification_failed',
          export_id: exportJob.id,
          error: error.message
        },
        severityLevel: SEVERITY_LEVELS.MEDIUM
      });
    }
  }

  /**
   * Send deletion completion notification
   */
  async sendDeletionCompletionNotification(deletionJob, deletionResults) {
    try {
      const { admin_email, scope, id, requested_at } = deletionJob;
      const { total_records_deleted, tables_processed, storage_files_deleted } = deletionResults;

      const emailData = {
        to: admin_email,
        subject: 'Data Deletion Completed - Maritime Onboarding System',
        template: 'deletion_completion',
        templateData: {
          deletionId: id,
          scope: this.formatDeletionScope(scope),
          requestedAt: new Date(requested_at).toLocaleString(),
          completedAt: new Date().toLocaleString(),
          totalRecordsDeleted: total_records_deleted,
          tablesProcessed: tables_processed.length,
          storageFilesDeleted: storage_files_deleted || 0,
          verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=exit-strategy`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@maritime-example.com'
        }
      };

      await this.emailService.sendEmail(emailData);

      // Log notification sent
      await auditService.logEvent({
        userId: null,
        userEmail: admin_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: id,
        details: {
          action: 'deletion_completion_notification_sent',
          deletion_id: id,
          recipient: admin_email,
          scope,
          records_deleted: total_records_deleted
        },
        severityLevel: SEVERITY_LEVELS.HIGH
      });

      console.log(`📧 Deletion completion notification sent to ${admin_email} for deletion ${id}`);

    } catch (error) {
      console.error('Failed to send deletion completion notification:', error);

      // Log notification failure
      await auditService.logEvent({
        userId: null,
        userEmail: deletionJob.admin_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: deletionJob.id,
        details: {
          action: 'deletion_completion_notification_failed',
          deletion_id: deletionJob.id,
          error: error.message
        },
        severityLevel: SEVERITY_LEVELS.HIGH
      });
    }
  }

  /**
   * Send export failure notification
   */
  async sendExportFailureNotification(exportJob, errorMessage) {
    try {
      const { admin_email, id, requested_at } = exportJob;

      const emailData = {
        to: admin_email,
        subject: 'System Export Failed - Maritime Onboarding System',
        template: 'export_failure',
        templateData: {
          exportId: id,
          requestedAt: new Date(requested_at).toLocaleString(),
          errorMessage,
          retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=exit-strategy`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@maritime-example.com'
        }
      };

      await this.emailService.sendEmail(emailData);

      console.log(`📧 Export failure notification sent to ${admin_email} for export ${id}`);

    } catch (error) {
      console.error('Failed to send export failure notification:', error);
    }
  }

  /**
   * Send deletion failure notification
   */
  async sendDeletionFailureNotification(deletionJob, errorMessage) {
    try {
      const { admin_email, scope, id, requested_at } = deletionJob;

      const emailData = {
        to: admin_email,
        subject: 'Data Deletion Failed - Maritime Onboarding System',
        template: 'deletion_failure',
        templateData: {
          deletionId: id,
          scope: this.formatDeletionScope(scope),
          requestedAt: new Date(requested_at).toLocaleString(),
          errorMessage,
          retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=exit-strategy`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@maritime-example.com'
        }
      };

      await this.emailService.sendEmail(emailData);

      console.log(`📧 Deletion failure notification sent to ${admin_email} for deletion ${id}`);

    } catch (error) {
      console.error('Failed to send deletion failure notification:', error);
    }
  }

  /**
   * Send daily confirmation code to admin
   */
  async sendDailyConfirmationCode(adminEmail, confirmationCode) {
    try {
      const emailData = {
        to: adminEmail,
        subject: 'Daily Confirmation Code - System Deletion',
        template: 'daily_confirmation_code',
        templateData: {
          confirmationCode,
          validDate: new Date().toLocaleDateString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString(),
          securityNotice: 'This code is required for complete system deletion operations.',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@maritime-example.com'
        }
      };

      await this.emailService.sendEmail(emailData);

      console.log(`📧 Daily confirmation code sent to ${adminEmail}`);

    } catch (error) {
      console.error('Failed to send daily confirmation code:', error);
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format export options for display
   */
  formatExportOptions(options) {
    const included = [];
    if (options.includeUserData) included.push('User Data');
    if (options.includeSystemConfig) included.push('System Configuration');
    if (options.includeAuditLogs) included.push('Audit Logs');
    if (options.includeCertificates) included.push('Certificates');
    if (options.includeTrainingContent) included.push('Training Content');

    return included.length > 0 ? included.join(', ') : 'No data selected';
  }

  /**
   * Format deletion scope for display
   */
  formatDeletionScope(scope) {
    const scopeMap = {
      'user_data': 'User Data Only',
      'system_data': 'System Configuration Only',
      'complete_system': 'Complete System (All Data)'
    };
    return scopeMap[scope] || scope;
  }
}

// Export singleton instance
const exitNotificationService = new ExitNotificationService();

module.exports = {
  exitNotificationService,
  ExitNotificationService
};
