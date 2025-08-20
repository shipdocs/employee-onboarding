// lib/smtpEmailService.js - SMTP Email Service
const nodemailer = require('nodemailer');
const { supabase } = require('./supabase');

class SMTPEmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Initialize SMTP transporter with configuration
   */
  initializeTransporter(config) {
    try {
      if (!config.host || !config.user || !config.pass) {
        console.warn('📧 [SMTP] Missing required configuration');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });

      this.isConfigured = true;
      console.log('📧 [SMTP] Transporter initialized successfully');
    } catch (error) {
      console.error('📧 [SMTP] Failed to initialize transporter:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email via SMTP with enhanced audit logging
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email
   * @param {string} params.toName - Recipient name
   * @param {string} params.subject - Email subject
   * @param {string} params.html - Email HTML content
   * @param {Array} params.attachments - Email attachments
   * @param {Object} params.emailConfig - Email configuration
   * @param {Object} params.context - Audit context for compliance logging
   */
  async sendEmail({ to, toName, subject, html, attachments = [], emailConfig, context = {} }) {
    if (!this.isConfigured) {
      throw new Error('SMTP service not configured');
    }

    try {
      const fromEmail = emailConfig?.fromEmail || process.env.EMAIL_FROM || 'noreply@shipdocs.app';
      const fromName = emailConfig?.fromName || process.env.EMAIL_FROM_NAME || 'Maritime Onboarding Platform';

      // Format recipient with name if provided
      const recipient = toName ? `"${toName}" <${to}>` : to;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: recipient,
        subject: subject,
        html: html,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content
        }))
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log successful email with enhanced audit context
      await this.logEmail(to, subject, 'SMTP email sent successfully', 'sent', {
        ...context,
        recipientName: toName,
        emailType: context.emailType || 'smtp_notification',
        attachmentsCount: attachments.length,
        smtpConfig: {
          provider: 'smtp',
          messageId: result.messageId
        },
        metadata: {
          fromEmail,
          fromName,
          htmlLength: html?.length || 0,
          ...context.metadata
        }
      });

      return {
        success: true,
        message: 'Email sent successfully via SMTP',
        messageId: result.messageId,
        recipient: to,
        recipientName: toName || null
      };
    } catch (error) {
      console.error('📧 [SMTP ERROR] Failed to send email:', error);

      // Log failed email with error context
      await this.logEmail(to, subject, `SMTP error: ${error.message}`, 'failed', {
        ...context,
        recipientName: toName,
        emailType: context.emailType || 'smtp_notification',
        errorMessage: error.message,
        attachmentsCount: attachments.length,
        metadata: {
          errorCode: error.code,
          errorStack: error.stack,
          ...context.metadata
        }
      });

      throw error;
    }
  }

  /**
   * Create attachment from buffer
   */
  createAttachment(buffer, filename) {
    return {
      filename: filename,
      content: buffer
    };
  }

  /**
   * Log email to database with enhanced audit context and compliance
   * @param {string} recipientEmail - Email recipient
   * @param {string} subject - Email subject
   * @param {string} body - Email body or status message
   * @param {string} status - Email status (sent, failed, pending, etc.)
   * @param {Object} context - Audit context for compliance
   * @param {Object} context.user - User who triggered the email
   * @param {string} context.ipAddress - Client IP address
   * @param {string} context.userAgent - Client user agent
   * @param {Object} context.clientContext - Additional client metadata
   * @param {string} context.emailType - Type of email being sent
   * @param {string} context.retentionCategory - Data retention category
   */
  async logEmail(recipientEmail, subject, body, status = 'sent', context = {}) {
    try {
      // Extract audit context with defaults
      const auditContext = {
        user_id: context.user?.id || context.user?.userId || null,
        actor_email: context.user?.email || context.actorEmail || null,
        ip_address: context.ipAddress || null,
        user_agent: context.userAgent || null,
        client_context: context.clientContext || {},
        email_type: context.emailType || 'notification',
        retention_category: context.retentionCategory || 'standard',
        created_by: context.createdBy || 'smtp-service'
      };

      // Prepare log entry for new email_logs table
      const logEntry = {
        recipient_email: recipientEmail,
        recipient_name: context.recipientName || null,
        subject: subject,
        email_type: auditContext.email_type,
        status: status,
        provider: 'smtp',
        body_preview: body ? body.substring(0, 500) : `Status: ${status}`,
        metadata: {
          original_body_length: body?.length || 0,
          smtp_config: context.smtpConfig || {},
          attachments_count: context.attachmentsCount || 0,
          ...context.metadata
        },
        error_message: context.errorMessage || null,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        ...auditContext
      };

      // Insert into new email_logs table
      const { error } = await supabase
        .from('email_logs')
        .insert(logEntry);

      if (error) {
        console.error('📧 [SMTP] Error logging email to email_logs:', error);

        // Fallback to legacy email_notifications table for backward compatibility
        await this.logEmailLegacy(recipientEmail, subject, body, status, auditContext);
      }
    } catch (err) {
      console.error('📧 [SMTP] Error logging email:', err);

      // Fallback to legacy logging
      await this.logEmailLegacy(recipientEmail, subject, body, status, context);
    }
  }

  /**
   * Legacy email logging for backward compatibility
   * @private
   */
  async logEmailLegacy(recipientEmail, subject, body, status, context = {}) {
    try {
      const legacyEntry = {
        recipient_email: recipientEmail,
        subject: subject,
        body: body || `Status: ${status}`,
        sent_at: new Date().toISOString(),
        user_id: context.user_id || null,
        actor_email: context.actor_email || null,
        ip_address: context.ip_address || null,
        user_agent: context.user_agent || null,
        client_context: context.client_context || {},
        retention_category: context.retention_category || 'standard',
        created_by: context.created_by || 'smtp-service'
      };

      const { error } = await supabase
        .from('email_notifications')
        .insert(legacyEntry);

      if (error) {
        console.error('📧 [SMTP] Error logging email to email_notifications:', error);
      }
    } catch (err) {
      console.error('📧 [SMTP] Error in legacy email logging:', err);
    }
  }
}

// Export singleton instance
const smtpEmailService = new SMTPEmailService();
module.exports = { smtpEmailService };