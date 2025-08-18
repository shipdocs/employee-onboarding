/**
 * Comprehensive Data Export Service
 * Provides GDPR-compliant data export functionality with JSON/CSV formats
 */

const { supabase } = require('../supabase');
const crypto = require('crypto');
const { auditService, ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('./auditService');
const { StorageService } = require('../storage');

// Export status constants
const EXPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

// Export format constants
const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv'
};

// Maximum export file size (100MB)
const MAX_EXPORT_SIZE = 100 * 1024 * 1024; // 100MB in bytes

class DataExportService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Request a complete user data export
   * @param {number} userId - User ID requesting export
   * @param {string} userEmail - User email for verification
   * @param {string} format - Export format (json/csv)
   * @param {Object} request - HTTP request object for audit logging
   * @returns {Promise<Object>} Export job details
   */
  async requestUserDataExport(userId, userEmail, format = EXPORT_FORMATS.JSON, request = null) {
    try {
      // Validate format
      if (!Object.values(EXPORT_FORMATS).includes(format)) {
        throw new Error(`Invalid export format: ${format}`);
      }

      // Create export job record
      const exportJob = await this.createExportJob(userId, userEmail, format, 'user_data');

      // Log the export request
      await auditService.logDataOperation(
        userId,
        userEmail,
        ACTION_TYPES.EXPORT,
        RESOURCE_TYPES.USER,
        exportJob.id,
        {
          format,
          export_type: 'user_data',
          job_id: exportJob.id
        },
        request
      );

      // Start export processing asynchronously
      this.processUserDataExport(exportJob.id).catch(error => {
        console.error('Export processing failed:', error);
      });

      return {
        success: true,
        exportId: exportJob.id,
        status: EXPORT_STATUS.PENDING,
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        message: 'Export request submitted successfully'
      };

    } catch (error) {
      console.error('Failed to request user data export:', error);
      throw error;
    }
  }

  /**
   * Create export job record in database
   */
  async createExportJob(userId, userEmail, format, exportType) {
    const { data, error } = await supabase
      .from('data_exports')
      .insert({
        user_id: userId,
        user_email: userEmail,
        export_type: exportType,
        format: format,
        status: EXPORT_STATUS.PENDING,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create export job: ${error.message}`);
    }

    return data;
  }

  /**
   * Process user data export
   */
  async processUserDataExport(exportId) {
    try {
      // Update status to processing
      await this.updateExportStatus(exportId, EXPORT_STATUS.PROCESSING);

      // Get export job details
      const exportJob = await this.getExportJob(exportId);
      if (!exportJob) {
        throw new Error('Export job not found');
      }

      // Collect all user data
      const userData = await this.collectUserData(exportJob.user_id);

      // Generate export file based on format
      let exportData;
      let mimeType;
      let fileExtension;

      if (exportJob.format === EXPORT_FORMATS.JSON) {
        exportData = this.generateJSONExport(userData);
        mimeType = 'application/json';
        fileExtension = 'json';
      } else if (exportJob.format === EXPORT_FORMATS.CSV) {
        exportData = this.generateCSVExport(userData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
      }

      // Check file size
      const fileSize = Buffer.byteLength(exportData, 'utf8');
      if (fileSize > MAX_EXPORT_SIZE) {
        throw new Error(`Export file too large: ${fileSize} bytes (max: ${MAX_EXPORT_SIZE})`);
      }

      // Generate integrity checksum
      const checksum = crypto.createHash('sha256').update(exportData).digest('hex');

      // Store export file in Supabase Storage
      const fileName = `user_export_${exportJob.user_id}_${Date.now()}.${fileExtension}`;
      const filePath = await this.storeExportFile(fileName, exportData, mimeType, exportJob.user_id);

      // Update export job with completion details
      await this.updateExportCompletion(exportId, {
        status: EXPORT_STATUS.COMPLETED,
        file_path: filePath,
        file_size: fileSize,
        checksum: checksum,
        completed_at: new Date().toISOString()
      });

      // Log successful completion
      await auditService.logDataOperation(
        exportJob.user_id,
        exportJob.user_email,
        ACTION_TYPES.EXPORT,
        RESOURCE_TYPES.USER,
        exportId,
        {
          status: 'completed',
          file_size: fileSize,
          checksum: checksum,
          format: exportJob.format
        }
      );

      // Send notification email (implement separately)
      await this.sendExportCompletionEmail(exportJob);

      return {
        success: true,
        exportId,
        filePath,
        fileSize,
        checksum
      };

    } catch (error) {
      console.error('Export processing failed:', error);

      // Update status to failed
      await this.updateExportStatus(exportId, EXPORT_STATUS.FAILED, error.message);

      throw error;
    }
  }

  /**
   * Collect comprehensive user data from all relevant tables
   */
  async collectUserData(userId) {
    const userData = {
      metadata: {
        export_date: new Date().toISOString(),
        user_id: userId,
        export_version: '1.0'
      }
    };

    try {
      // 1. User profile information
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      userData.profile = userProfile;

      // 2. Training sessions and progress
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', userId);

      userData.training_sessions = trainingSessions || [];

      // 3. Training items and completion
      const { data: trainingItems } = await supabase
        .from('training_items')
        .select('*')
        .eq('user_id', userId);

      userData.training_items = trainingItems || [];

      // 4. Quiz results and history
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId);

      userData.quiz_results = quizResults || [];

      // 5. Quiz history
      const { data: quizHistory } = await supabase
        .from('quiz_history')
        .select('*')
        .eq('user_id', userId);

      userData.quiz_history = quizHistory || [];

      // 6. Certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId);

      userData.certificates = certificates || [];

      // 7. Workflow progress
      const { data: workflowProgress } = await supabase
        .from('workflow_progress')
        .select('*')
        .eq('user_id', userId);

      userData.workflow_progress = workflowProgress || [];

      // 8. Onboarding progress
      const { data: onboardingProgress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId);

      userData.onboarding_progress = onboardingProgress || [];

      // 9. Audit logs related to user
      const { data: auditLogs } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to last 1000 entries

      userData.audit_logs = auditLogs || [];

      // 10. Magic links (authentication history)
      const { data: magicLinks } = await supabase
        .from('magic_links')
        .select('token, created_at, expires_at, used_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100); // Last 100 authentication attempts

      userData.authentication_history = magicLinks || [];

      // 11. File uploads
      const { data: fileUploads } = await supabase
        .from('file_uploads')
        .select('id, filename, file_size, upload_date, file_type')
        .eq('user_id', userId);

      userData.file_uploads = fileUploads || [];

      // 12. Crew assignments
      const { data: crewAssignments } = await supabase
        .from('crew_assignments')
        .select('*')
        .eq('user_id', userId);

      userData.crew_assignments = crewAssignments || [];

      return userData;

    } catch (error) {
      console.error('Failed to collect user data:', error);
      throw new Error(`Data collection failed: ${error.message}`);
    }
  }

  /**
   * Collect bulk user data for admin export (all users) - OPTIMIZED
   */
  async collectBulkUserData(filters = {}) {
    try {
      console.log('📊 Starting optimized bulk user data collection...');
      const startTime = Date.now();

      // Get all users with optional filters
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }
      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      const { data: users, error: usersError } = await query;

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      console.log(`📊 Found ${users.length} users to export`);

      // Performance optimization: Process in parallel chunks
      const maxUsers = 100; // Limit for safety
      const chunkSize = 5; // Process 5 users at a time
      const usersToProcess = users.slice(0, maxUsers);

      const bulkData = [];

      // Process users in chunks for better performance
      for (let i = 0; i < usersToProcess.length; i += chunkSize) {
        const chunk = usersToProcess.slice(i, i + chunkSize);
        console.log(`📊 Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(usersToProcess.length/chunkSize)} (${chunk.length} users)`);

        // Process chunk in parallel
        const chunkPromises = chunk.map(async (user) => {
          try {
            const userData = await this.collectUserData(user.id);
            return {
              userId: user.id,
              ...userData
            };
          } catch (error) {
            console.warn(`⚠️ Failed to collect data for user ${user.id}:`, error.message);
            return {
              userId: user.id,
              profile: user,
              error: error.message,
              training_sessions: [],
              quiz_results: [],
              certificates: [],
              form_submissions: []
            };
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        bulkData.push(...chunkResults);

        // Small delay between chunks to prevent overwhelming the database
        if (i + chunkSize < usersToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Bulk data collection completed for ${bulkData.length} users in ${duration}ms`);
      return bulkData;

    } catch (error) {
      console.error('❌ Bulk data collection failed:', error);
      throw error;
    }
  }

  /**
   * Generate JSON export format
   */
  generateJSONExport(userData) {
    return JSON.stringify(userData, null, 2);
  }

  /**
   * Generate bulk JSON export from multiple users' data
   */
  generateBulkJSONExport(bulkUserData) {
    const exportData = {
      metadata: {
        export_type: 'admin_bulk_export',
        export_date: new Date().toISOString(),
        total_users: bulkUserData.length,
        export_version: '1.0'
      },
      users: bulkUserData
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate bulk CSV export from multiple users' data
   */
  generateBulkCSVExport(bulkUserData) {
    const csvData = [];

    // CSV Header
    csvData.push('User ID,Email,Role,First Name,Last Name,Created At,Training Sessions,Quiz Results,Certificates,Form Submissions,Data Collection Status');

    // Process each user
    bulkUserData.forEach(userData => {
      const profile = userData.profile || {};
      const trainingCount = userData.training_sessions?.length || 0;
      const quizCount = userData.quiz_results?.length || 0;
      const certCount = userData.certificates?.length || 0;
      const formCount = userData.form_submissions?.length || 0;
      const status = userData.error ? 'Error' : 'Success';

      csvData.push([
        userData.userId || '',
        `"${this.escapeCsvValue(profile.email || '')}"`,
        `"${this.escapeCsvValue(profile.role || '')}"`,
        `"${this.escapeCsvValue(profile.first_name || '')}"`,
        `"${this.escapeCsvValue(profile.last_name || '')}"`,
        profile.created_at || '',
        trainingCount,
        quizCount,
        certCount,
        formCount,
        status
      ].join(','));
    });

    return csvData.join('\n');
  }

  /**
   * Generate CSV export format (flattened structure)
   */
  generateCSVExport(userData) {
    const csvData = [];

    // Add header
    csvData.push('Category,Field,Value,Date');

    // Profile information
    if (userData.profile) {
      Object.entries(userData.profile).forEach(([key, value]) => {
        csvData.push(`Profile,${key},"${this.escapeCsvValue(value)}",${userData.profile.created_at || ''}`);
      });
    }

    // Training sessions
    userData.training_sessions?.forEach((session, index) => {
      Object.entries(session).forEach(([key, value]) => {
        csvData.push(`Training Session ${index + 1},${key},"${this.escapeCsvValue(value)}",${session.created_at || ''}`);
      });
    });

    // Quiz results
    userData.quiz_results?.forEach((result, index) => {
      Object.entries(result).forEach(([key, value]) => {
        csvData.push(`Quiz Result ${index + 1},${key},"${this.escapeCsvValue(value)}",${result.created_at || ''}`);
      });
    });

    // Certificates
    userData.certificates?.forEach((cert, index) => {
      Object.entries(cert).forEach(([key, value]) => {
        csvData.push(`Certificate ${index + 1},${key},"${this.escapeCsvValue(value)}",${cert.issue_date || ''}`);
      });
    });

    return csvData.join('\n');
  }

  /**
   * Escape CSV values to prevent injection and formatting issues
   */
  escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    // Escape quotes and handle multiline values
    return stringValue.replace(/"/g, '""');
  }

  /**
   * Store export file in Supabase Storage
   */
  async storeExportFile(fileName, data, mimeType, userId) {
    try {
      // Create user-specific folder path
      const filePath = `${userId}/${fileName}`;

      // Convert string data to buffer
      const fileBuffer = Buffer.from(data, 'utf8');

      // Upload to Supabase Storage
      const uploadResult = await StorageService.uploadFile(
        'data-exports',
        filePath,
        fileBuffer,
        {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        }
      );

      console.log(`✅ Export file stored: ${filePath} (${fileBuffer.length} bytes)`);

      return uploadResult.path;
    } catch (error) {
      console.error('Failed to store export file:', error);
      throw new Error(`File storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve stored export file from Supabase Storage
   */
  async getStoredExportFile(filePath) {
    try {
      const fileData = await StorageService.downloadFile('data-exports', filePath);
      return fileData;
    } catch (error) {
      console.error('Failed to retrieve export file:', error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete stored export file from Supabase Storage
   */
  async deleteStoredExportFile(filePath) {
    try {
      await StorageService.deleteFile('data-exports', filePath);
      console.log(`🗑️ Export file deleted: ${filePath}`);
    } catch (error) {
      console.error('Failed to delete export file:', error);
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Clean up expired export files
   */
  async cleanupExpiredExports() {
    try {
      // Get all expired exports
      const { data: expiredExports, error } = await supabase
        .from('data_exports')
        .select('id, file_path')
        .lt('expires_at', new Date().toISOString())
        .not('file_path', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch expired exports: ${error.message}`);
      }

      if (!expiredExports || expiredExports.length === 0) {
        console.log('📋 No expired exports to clean up');
        return { cleaned: 0 };
      }

      console.log(`🧹 Cleaning up ${expiredExports.length} expired exports`);

      let cleanedCount = 0;
      for (const exportRecord of expiredExports) {
        try {
          // Delete the file from storage
          if (exportRecord.file_path) {
            await this.deleteStoredExportFile(exportRecord.file_path);
          }

          // Update the database record to mark as expired
          await supabase
            .from('data_exports')
            .update({
              status: EXPORT_STATUS.EXPIRED,
              file_path: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', exportRecord.id);

          cleanedCount++;
        } catch (error) {
          console.error(`Failed to clean up export ${exportRecord.id}:`, error);
        }
      }

      console.log(`✅ Cleaned up ${cleanedCount}/${expiredExports.length} expired exports`);
      return { cleaned: cleanedCount, total: expiredExports.length };
    } catch (error) {
      console.error('Export cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Update export job status
   */
  async updateExportStatus(exportId, status, errorMessage = null) {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('data_exports')
      .update(updateData)
      .eq('id', exportId);

    if (error) {
      console.error('Failed to update export status:', error);
    }
  }

  /**
   * Update export completion details
   */
  async updateExportCompletion(exportId, completionData) {
    const { error } = await supabase
      .from('data_exports')
      .update(completionData)
      .eq('id', exportId);

    if (error) {
      throw new Error(`Failed to update export completion: ${error.message}`);
    }
  }

  /**
   * Get export job details
   */
  async getExportJob(exportId) {
    const { data, error } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error) {
      console.error('Failed to get export job:', error);
      return null;
    }

    return data;
  }

  /**
   * Send export completion email notification
   */
  async sendExportCompletionEmail(exportJob) {
    try {
      // Import email service with correct path
      const { sendEmailWithAttachments } = require('../emailService');

      // Read the appropriate email template
      const fs = require('fs').promises;
      const path = require('path');

      const templateName = exportJob.export_type === 'admin_bulk'
        ? 'bulk-export-completion.html'
        : 'user-export-completion.html';

      const templatePath = path.join(__dirname, '..', 'email', 'templates', templateName);

      let htmlTemplate;
      try {
        htmlTemplate = await fs.readFile(templatePath, 'utf8');
      } catch (error) {
        console.warn(`Email template not found: ${templatePath}, using fallback`);
        htmlTemplate = this.getFallbackEmailTemplate(exportJob);
      }

      // Replace template variables
      const templateData = {
        exportId: exportJob.id,
        format: exportJob.format.toUpperCase(),
        fileSize: this.formatFileSize(exportJob.file_size),
        downloadUrl: exportJob.export_type === 'admin_bulk'
          ? `${process.env.FRONTEND_URL || 'https://onboarding.burando.online'}/admin/downloads/${exportJob.id}`
          : `${process.env.FRONTEND_URL || 'https://onboarding.burando.online'}/profile/downloads/${exportJob.id}`,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        userCount: exportJob.metadata?.user_count || null,
        exportDate: new Date().toLocaleDateString()
      };

      // Replace template variables
      Object.entries(templateData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, value || '');
      });

      const subject = exportJob.export_type === 'admin_bulk'
        ? 'Bulk Data Export Ready for Download'
        : 'Your Data Export is Ready';

      await sendEmailWithAttachments({
        recipientEmail: exportJob.user_email,
        recipientName: exportJob.user_email.split('@')[0],
        subject: subject,
        htmlContent: htmlTemplate,
        attachments: [],
        logType: 'data_export',
        userId: exportJob.user_id
      });

      console.log(`✅ Email notification sent to ${exportJob.user_email} for export ${exportJob.id}`);

      // Log email notification
      await auditService.logEvent({
        userId: exportJob.user_id,
        userEmail: exportJob.user_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: exportJob.id,
        details: {
          notification_type: 'export_completion',
          export_type: exportJob.export_type,
          email_sent: true
        }
      });

    } catch (error) {
      console.error('Failed to send export completion email:', error);

      // Log email failure
      await auditService.logEvent({
        userId: exportJob.user_id,
        userEmail: exportJob.user_email,
        action: ACTION_TYPES.NOTIFICATION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: exportJob.id,
        details: {
          notification_type: 'export_completion',
          export_type: exportJob.export_type,
          email_sent: false,
          error: error.message
        }
      });
    }
  }

  /**
   * Send export failure email notification
   */
  async sendExportFailureEmail(exportJob, errorMessage) {
    try {
      const { sendEmailWithAttachments } = require('../emailService');

      const isAdmin = exportJob.export_type === 'admin_bulk';
      const subject = isAdmin ? 'Bulk Data Export Failed' : 'Data Export Failed';

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .error { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .button { display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚢 Maritime Onboarding</h1>
        <h2>${subject}</h2>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>Unfortunately, your ${isAdmin ? 'bulk ' : ''}data export request has failed to complete.</p>

        <div class="error">
            <strong>Export Details:</strong><br>
            Export ID: ${exportJob.id}<br>
            Format: ${exportJob.format}<br>
            Error: ${errorMessage}
        </div>

        <p>You can try requesting a new export. If the problem persists, please contact our support team.</p>

        <div style="text-align: center;">
            <a href="${isAdmin ?
              `${process.env.FRONTEND_URL || 'https://onboarding.burando.online'}/admin/bulk-export` :
              `${process.env.FRONTEND_URL || 'https://onboarding.burando.online'}/profile/export-data`
            }" class="button">Request New Export</a>
        </div>

        <p>If you need assistance, please contact: ${process.env.SUPPORT_EMAIL || 'support@shipdocs.app'}</p>
    </div>
</body>
</html>`;

      await sendEmailWithAttachments({
        recipientEmail: exportJob.user_email,
        recipientName: exportJob.user_email.split('@')[0],
        subject: subject,
        htmlContent: htmlContent,
        attachments: [],
        logType: 'data_export_failure',
        userId: exportJob.user_id
      });

      console.log(`✅ Export failure notification sent to ${exportJob.user_email}`);

    } catch (error) {
      console.error('Failed to send export failure email:', error);
    }
  }

  /**
   * Get fallback email template when template file is not found
   */
  getFallbackEmailTemplate(exportJob) {
    const isAdmin = exportJob.export_type === 'admin_bulk';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${isAdmin ? 'Bulk Data Export Ready' : 'Your Data Export is Ready'}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
        .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚢 Maritime Onboarding</h1>
        <h2>${isAdmin ? 'Bulk Data Export Completed' : 'Your Data Export is Ready'}</h2>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>Your ${isAdmin ? 'bulk ' : ''}data export has been completed and is ready for download.</p>

        <div class="details">
            <strong>Export Details:</strong><br>
            Export ID: {{exportId}}<br>
            Format: {{format}}<br>
            ${isAdmin ? 'Users: {{userCount}}<br>' : ''}
            File Size: {{fileSize}}<br>
            Export Date: {{exportDate}}
        </div>

        <div style="text-align: center;">
            <a href="{{downloadUrl}}" class="button">Download Export</a>
        </div>

        <p><strong>Important:</strong> This export will be available until {{expirationDate}}.</p>

        ${isAdmin ?
          '<p><strong>Compliance Note:</strong> This export contains personal data. Handle according to data protection regulations.</p>' :
          '<p>This export contains your personal data from our maritime onboarding system.</p>'
        }
    </div>
</body>
</html>`;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get export status for user
   */
  async getExportStatus(exportId, userId) {
    const { data, error } = await supabase
      .from('data_exports')
      .select('id, status, format, requested_at, completed_at, file_size, error_message')
      .eq('id', exportId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Export not found: ${error.message}`);
    }

    return data;
  }

  /**
   * List user's export history
   */
  async getUserExportHistory(userId, limit = 10) {
    const { data, error } = await supabase
      .from('data_exports')
      .select('id, status, format, requested_at, completed_at, file_size')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get export history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Request bulk export for multiple users (admin only)
   * @param {number} adminUserId - Admin user ID requesting export
   * @param {string} adminEmail - Admin email for verification
   * @param {Object} criteria - User selection criteria
   * @param {string} format - Export format (json/csv)
   * @param {Object} request - HTTP request object for audit logging
   * @returns {Promise<Object>} Bulk export job details
   */
  async requestBulkDataExport(adminUserId, adminEmail, criteria, format = EXPORT_FORMATS.JSON, request = null) {
    try {
      // Validate format
      if (!Object.values(EXPORT_FORMATS).includes(format)) {
        throw new Error(`Invalid export format: ${format}`);
      }

      // Get users based on criteria
      const users = await this.getUsersByCriteria(criteria);

      if (users.length === 0) {
        throw new Error('No users found matching the specified criteria');
      }

      if (users.length > 1000) {
        throw new Error(`Too many users selected: ${users.length} (maximum: 1000)`);
      }

      // Create bulk export job record
      const bulkExportJob = await this.createBulkExportJob(
        adminUserId,
        adminEmail,
        format,
        users.length,
        criteria
      );

      // Log the bulk export request
      await auditService.logAdminAction(
        adminUserId,
        adminEmail,
        ACTION_TYPES.ADMIN_BULK_EXPORT,
        {
          format,
          user_count: users.length,
          criteria,
          job_id: bulkExportJob.id
        },
        request
      );

      // Start bulk export processing asynchronously
      this.processBulkDataExport(bulkExportJob.id, users).catch(error => {
        console.error('Bulk export processing failed:', error);
      });

      return {
        success: true,
        exportId: bulkExportJob.id,
        status: EXPORT_STATUS.PENDING,
        userCount: users.length,
        estimatedCompletion: new Date(Date.now() + users.length * 2 * 60 * 1000), // 2 minutes per user
        message: 'Bulk export request submitted successfully'
      };

    } catch (error) {
      console.error('Failed to request bulk data export:', error);
      throw error;
    }
  }

  /**
   * Get users based on selection criteria
   */
  async getUsersByCriteria(criteria) {
    let query = supabase.from('users').select('id, email, role, first_name, last_name');

    // Apply filters based on criteria
    if (criteria.role && criteria.role !== 'all') {
      query = query.eq('role', criteria.role);
    }

    if (criteria.status && criteria.status !== 'all') {
      query = query.eq('status', criteria.status);
    }

    if (criteria.vessel_assignment) {
      query = query.eq('vessel_assignment', criteria.vessel_assignment);
    }

    if (criteria.created_after) {
      query = query.gte('created_at', criteria.created_after);
    }

    if (criteria.created_before) {
      query = query.lte('created_at', criteria.created_before);
    }

    if (criteria.user_ids && Array.isArray(criteria.user_ids)) {
      query = query.in('id', criteria.user_ids);
    }

    // Always filter out inactive users unless specifically requested
    if (!criteria.include_inactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('id');

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create bulk export job record
   */
  async createBulkExportJob(adminUserId, adminEmail, format, userCount, criteria) {
    const { data, error } = await supabase
      .from('data_exports')
      .insert({
        user_id: adminUserId,
        user_email: adminEmail,
        export_type: 'admin_bulk',
        format: format,
        status: EXPORT_STATUS.PENDING,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        metadata: {
          user_count: userCount,
          criteria: criteria,
          bulk_export: true
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create bulk export job: ${error.message}`);
    }

    return data;
  }

  /**
   * Process bulk data export
   */
  async processBulkDataExport(exportId, users) {
    try {
      // Update status to processing
      await this.updateExportStatus(exportId, EXPORT_STATUS.PROCESSING);

      // Get export job details
      const exportJob = await this.getExportJob(exportId);
      if (!exportJob) {
        throw new Error('Bulk export job not found');
      }

      const exportData = {
        metadata: {
          export_date: new Date().toISOString(),
          export_type: 'admin_bulk',
          user_count: users.length,
          format: exportJob.format,
          export_version: '1.0'
        },
        users: []
      };

      // Process users in chunks to prevent memory issues
      const chunkSize = 10;
      let processedCount = 0;

      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);

        // Process chunk in parallel
        const chunkPromises = chunk.map(async (user) => {
          try {
            const userData = await this.collectUserData(user.id);
            return {
              user_info: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: `${user.first_name} ${user.last_name}`
              },
              data: userData
            };
          } catch (error) {
            console.error(`Failed to collect data for user ${user.id}:`, error);
            return {
              user_info: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: `${user.first_name} ${user.last_name}`
              },
              error: error.message
            };
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        exportData.users.push(...chunkResults);

        processedCount += chunk.length;

        // Update progress
        await this.updateBulkExportProgress(exportId, processedCount, users.length);
      }

      // Generate export file based on format
      let finalExportData;
      let mimeType;
      let fileExtension;

      if (exportJob.format === EXPORT_FORMATS.JSON) {
        finalExportData = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      } else if (exportJob.format === EXPORT_FORMATS.CSV) {
        finalExportData = this.generateBulkCSVExport(exportData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
      }

      // Check file size
      const fileSize = Buffer.byteLength(finalExportData, 'utf8');
      if (fileSize > MAX_EXPORT_SIZE) {
        throw new Error(`Bulk export file too large: ${fileSize} bytes (max: ${MAX_EXPORT_SIZE})`);
      }

      // Generate integrity checksum
      const checksum = crypto.createHash('sha256').update(finalExportData).digest('hex');

      // Store export file
      const fileName = `bulk_export_${exportJob.user_id}_${Date.now()}.${fileExtension}`;
      const filePath = await this.storeExportFile(fileName, finalExportData, mimeType, exportJob.user_id);

      // Update export job with completion details
      await this.updateExportCompletion(exportId, {
        status: EXPORT_STATUS.COMPLETED,
        file_path: filePath,
        file_size: fileSize,
        checksum: checksum,
        completed_at: new Date().toISOString()
      });

      // Log successful completion
      await auditService.logAdminAction(
        exportJob.user_id,
        exportJob.user_email,
        ACTION_TYPES.ADMIN_BULK_EXPORT,
        {
          status: 'completed',
          user_count: users.length,
          file_size: fileSize,
          checksum: checksum,
          format: exportJob.format
        }
      );

      return {
        success: true,
        exportId,
        filePath,
        fileSize,
        checksum,
        userCount: users.length
      };

    } catch (error) {
      console.error('Bulk export processing failed:', error);

      // Update status to failed
      await this.updateExportStatus(exportId, EXPORT_STATUS.FAILED, error.message);

      throw error;
    }
  }

  /**
   * Update bulk export progress
   */
  async updateBulkExportProgress(exportId, processedCount, totalCount) {
    const progress = Math.round((processedCount / totalCount) * 100);

    const { error } = await supabase
      .from('data_exports')
      .update({
        metadata: supabase.raw(`metadata || '{"progress": ${progress}, "processed_count": ${processedCount}, "total_count": ${totalCount}}'::jsonb`),
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);

    if (error) {
      console.error('Failed to update bulk export progress:', error);
    }
  }

}

// Export singleton instance
const dataExportService = new DataExportService();

module.exports = {
  dataExportService,
  DataExportService,
  EXPORT_STATUS,
  EXPORT_FORMATS,
  MAX_EXPORT_SIZE
};
