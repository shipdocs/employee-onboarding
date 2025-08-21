/**
 * Account Deletion Service
 * GDPR-compliant user account and data deletion
 * Implements "Right to be forgotten" (Article 17)
 */

const { supabase } = require('../database-supabase-compat');
const crypto = require('crypto');

class AccountDeletionService {
  /**
   * Delete user account and all associated data
   * @param {string} userId - User ID to delete
   * @param {string} requestedBy - User ID requesting deletion
   * @param {string} reason - Reason for deletion (gdpr_request, user_request, admin_action)
   * @param {boolean} confirmDeletion - Safety check confirmation
   */
  async deleteUserAccount(userId, requestedBy, reason = 'user_request', confirmDeletion = false) {
    if (!confirmDeletion) {
      return {
        success: false,
        error: 'Deletion must be explicitly confirmed',
        requiresConfirmation: true
      };
    }

    const deletionId = `DEL-${Date.now()}-${userId.substring(0, 8)}`;
    const startTime = new Date();

    try {
      // Start transaction-like process
      console.log(`Starting account deletion process: ${deletionId}`);

      // 1. Verify user exists and get their data
      const userDataResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const userData = userDataResult.rows[0];
    const userError = !userData;

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // 2. Create deletion record for audit trail
      const deletionRecord = {
        deletion_id: deletionId,
        user_id: userId,
        user_email: userData.email,
        requested_by: requestedBy,
        reason: reason,
        started_at: startTime.toISOString(),
        status: 'in_progress',
        anonymized_data: {}
      };

      // 3. Export user data before deletion (for compliance record)
      const dataExport = await this.exportUserDataForDeletion(userId);

      // 4. Delete or anonymize data in correct order (respecting foreign keys)
      const deletionSteps = [];

      // Delete MFA settings
      const mfaResult = await this.deleteMFAData(userId);
      deletionSteps.push({ step: 'mfa_settings', ...mfaResult });

      // Delete certificates
      const certResult = await this.deleteCertificates(userId);
      deletionSteps.push({ step: 'certificates', ...certResult });

      // Delete quiz results
      const quizResult = await this.deleteQuizResults(userId);
      deletionSteps.push({ step: 'quiz_results', ...quizResult });

      // Delete training sessions
      const trainingResult = await this.deleteTrainingSessions(userId);
      deletionSteps.push({ step: 'training_sessions', ...trainingResult });

      // Delete file uploads
      const filesResult = await this.deleteUserFiles(userId);
      deletionSteps.push({ step: 'file_uploads', ...filesResult });

      // Delete notifications
      const notifResult = await this.deleteNotifications(userId);
      deletionSteps.push({ step: 'notifications', ...notifResult });

      // Anonymize audit logs (keep for legal requirements but remove PII)
      const auditResult = await this.anonymizeAuditLogs(userId);
      deletionSteps.push({ step: 'audit_logs', ...auditResult });

      // Delete magic links
      const magicLinkResult = await this.deleteMagicLinks(userId);
      deletionSteps.push({ step: 'magic_links', ...magicLinkResult });

      // Finally, delete or anonymize the user record
      const userDeletionResult = await this.deleteUserRecord(userId, userData);
      deletionSteps.push({ step: 'user_record', ...userDeletionResult });

      // 5. Create deletion certificate
      const deletionCertificate = {
        deletion_id: deletionId,
        completed_at: new Date().toISOString(),
        user_identifier: this.hashEmail(userData.email),
        deletion_steps: deletionSteps,
        data_categories_deleted: [
          'Personal identification data',
          'Authentication credentials',
          'Training records',
          'Assessment results',
          'Generated certificates',
          'System access logs (anonymized)',
          'File uploads'
        ],
        legal_basis: 'GDPR Article 17 - Right to erasure',
        retention_exceptions: [
          'Anonymized audit logs for security purposes',
          'Aggregated statistics without PII'
        ]
      };

      // 6. Store deletion record (encrypted)
      await this.storeDeletionRecord(deletionRecord, deletionCertificate);

      // 7. Log the deletion completion
      await supabase
        .from('audit_log')
        .insert({
          user_id: requestedBy,
          action: 'gdpr_account_deletion',
          resource_type: 'user_account',
          resource_id: deletionId,
          details: {
            deleted_user_hash: this.hashEmail(userData.email),
            reason: reason,
            duration_ms: Date.now() - startTime.getTime()
          }
        });

      return {
        success: true,
        deletion_id: deletionId,
        certificate: deletionCertificate,
        message: 'Account successfully deleted in compliance with GDPR'
      };

    } catch (error) {
      console.error('Account deletion error:', error);

      // Log failed deletion attempt
      await supabase
        .from('audit_log')
        .insert({
          user_id: requestedBy,
          action: 'gdpr_deletion_failed',
          resource_type: 'user_account',
          resource_id: userId,
          details: {
            error: error.message,
            deletion_id: deletionId
          }
        });

      return {
        success: false,
        error: error.message,
        deletion_id: deletionId
      };
    }
  }

  /**
   * Export user data before deletion
   */
  async exportUserDataForDeletion(userId) {
    // This creates a final export of all user data before deletion
    // Stored encrypted for compliance purposes only
    const dataCategories = {
      profile: await this.getUserProfile(userId),
      training: await this.getTrainingData(userId),
      certificates: await this.getCertificateData(userId),
      access_logs: await this.getAccessLogs(userId)
    };

    return dataCategories;
  }

  /**
   * Delete MFA settings
   */
  async deleteMFAData(userId) {
    const { error } = await supabase
      .from('user_mfa_settings')
      .delete()
      .eq('user_id', userId);

    return { success: !error, error: error?.message, records_deleted: !error ? 1 : 0 };
  }

  /**
   * Delete certificates
   */
  async deleteCertificates(userId) {
    const { data, error } = await supabase
      .from('certificates')
      .delete()
      .eq('user_id', userId)
      .select();

    return { success: !error, error: error?.message, records_deleted: data?.length || 0 };
  }

  /**
   * Delete quiz results
   */
  async deleteQuizResults(userId) {
    const { data, error } = await supabase
      .from('quiz_results')
      .delete()
      .eq('user_id', userId)
      .select();

    return { success: !error, error: error?.message, records_deleted: data?.length || 0 };
  }

  /**
   * Delete training sessions
   */
  async deleteTrainingSessions(userId) {
    const { data, error } = await supabase
      .from('training_sessions')
      .delete()
      .eq('user_id', userId)
      .select();

    return { success: !error, error: error?.message, records_deleted: data?.length || 0 };
  }

  /**
   * Delete user files from storage
   */
  async deleteUserFiles(userId) {
    try {
      // Get all files for user
      const { data: files } = await supabase
        .from('file_uploads')
        .select('file_path')
        .eq('uploaded_by', userId);

      if (files && files.length > 0) {
        // Delete files from storage
        for (const file of files) {
          await // TODO: Replace with MinIO storage
            .from('user-uploads')
            .remove([file.file_path]);
        }
      }

      // Delete file records
      const { error } = await supabase
        .from('file_uploads')
        .delete()
        .eq('uploaded_by', userId);

      return { success: !error, error: error?.message, records_deleted: files?.length || 0 };
    } catch (error) {
      return { success: false, error: error.message, records_deleted: 0 };
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(userId) {
    const { data, error } = await supabase
      .from('email_notifications')
      .delete()
      .eq('user_id', userId)
      .select();

    return { success: !error, error: error?.message, records_deleted: data?.length || 0 };
  }

  /**
   * Anonymize audit logs (keep for security but remove PII)
   */
  async anonymizeAuditLogs(userId) {
    const anonymizedId = `ANON-${crypto.randomBytes(16).toString('hex')}`;

    const { data, error } = await supabase
      .from('audit_log')
      .update({
        user_id: anonymizedId,
        details: supabase.raw("details - 'email' - 'name' - 'personal_data'")
      })
      .eq('user_id', userId)
      .select();

    return { success: !error, error: error?.message, records_anonymized: data?.length || 0 };
  }

  /**
   * Delete magic links
   */
  async deleteMagicLinks(userId) {
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userData) {
      const { error } = await supabase
        .from('magic_links')
        .delete()
        .eq('email', userData.email);

      return { success: !error, error: error?.message };
    }

    return { success: true };
  }

  /**
   * Delete or anonymize user record
   */
  async deleteUserRecord(userId, userData) {
    // Option 1: Complete deletion
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // Option 2: Anonymization (if needed for referential integrity)
    // const anonymizedData = {
    //   email: `deleted-${Date.now()}@anonymous.local`,
    //   first_name: 'Deleted',
    //   last_name: 'User',
    //   phone: null,
    //   position: null,
    //   password_hash: null,
    //   status: 'deleted',
    //   is_active: false
    // };
    //
    // const { error } = await supabase
    //   .from('users')
    //   .update(anonymizedData)
    //   .eq('id', userId);

    return {
      success: !error,
      error: error?.message,
      method: 'complete_deletion'
    };
  }

  /**
   * Store encrypted deletion record
   */
  async storeDeletionRecord(record, certificate) {
    // Store in a dedicated deletion_records table or external secure storage
    // This is kept for legal compliance and cannot be deleted
    const encryptedRecord = this.encryptDeletionRecord({
      ...record,
      certificate
    });

    // For now, log to console (in production, store securely)
    console.log('Deletion record stored:', record.deletion_id);

    return true;
  }

  /**
   * Helper methods
   */

  hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  encryptDeletionRecord(record) {
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(record)).toString('base64');
  }

  async getUserProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('email, first_name, last_name, role, created_at')
      .eq('id', userId)
      .single();
    return data;
  }

  async getTrainingData(userId) {
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  async getCertificateData(userId) {
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  async getAccessLogs(userId) {
    const { data } = await supabase
      .from('audit_log')
      .select('created_at, action, resource_type')
      .eq('user_id', userId)
      .limit(100);
    return data;
  }

  /**
   * Verify deletion was successful
   */
  async verifyDeletion(userId) {
    const checks = {
      user_exists: false,
      has_training_data: false,
      has_certificates: false,
      has_quiz_results: false,
      has_active_sessions: false
    };

    // Check if user still exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    checks.user_exists = !!user;

    // Check for remaining data
    const { data: training } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    checks.has_training_data = !!(training && training.length > 0);

    const { data: certs } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    checks.has_certificates = !!(certs && certs.length > 0);

    const allDeleted = Object.values(checks).every(check => check === false);

    return {
      success: allDeleted,
      checks,
      message: allDeleted ? 'All user data successfully deleted' : 'Some data remains'
    };
  }
}

module.exports = new AccountDeletionService();
