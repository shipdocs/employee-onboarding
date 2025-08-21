// lib/emailServiceFactory.js - Email Service Factory
const { MailerSend, EmailParams, Sender, Recipient, Attachment } = require('mailersend');
const { smtpEmailService } = require('./smtpEmailService');
const { supabase } = require('./database-supabase-compat');
const { StorageService } = require('./storage');
const { settingsService } = require('./settingsService');

/**
 * Email Service Factory with Environment-Based Controls
 *
 * Production: Uses configured email provider (MailerSend or SMTP)
 * Development: Disabled by default, can be enabled with EMAIL_ENABLED=true
 *
 * Configuration:
 * - EMAIL_ENABLED: Set to 'true' to enable emails in development
 * - EMAIL_SERVICE_PROVIDER: 'mailersend' or 'smtp'
 * - MAILERSEND_API_KEY: Required for MailerSend
 * - EMAIL_FROM: Sender email address
 * - EMAIL_FROM_NAME: Sender name
 */

class EmailServiceFactory {
  constructor() {
    this.provider = null;
    this.isInitialized = false;
    this.emailConfig = null;
  }

  /**
   * Check if emails should be enabled based on environment
   */
  shouldEnableEmails() {
    const isProduction = process.env.NODE_ENV === 'production' ||
                        process.env.VERCEL_ENV === 'production' ||
                        process.env.BASE_URL?.includes('maritime-onboarding.example.com');

    const emailEnabled = process.env.EMAIL_ENABLED === 'true';

    if (isProduction) {
      return true; // Always enable in production
    }

    // In development, only enable if explicitly set
    if (!emailEnabled) {
      console.log('📧 [FACTORY] Email service disabled in development. Set EMAIL_ENABLED=true to enable.');
    }

    return emailEnabled;
  }

  /**
   * Initialize the email service with settings from database
   */
  async initializeProvider() {
    // Check if emails should be enabled
    if (!this.shouldEnableEmails()) {
      this.provider = 'disabled';
      this.isConfigured = false;
      this.isInitialized = true;
      return;
    }

    try {
      // Get email configuration from settings service
      this.emailConfig = await settingsService.getEmailConfig();
      this.provider = this.emailConfig.provider;

      if (this.provider === 'mailersend') {
        this.initializeMailerSend();
      } else if (this.provider === 'smtp') {
        this.initializeSMTP();
      } else if (this.provider === 'disabled') {
        // Email service is disabled
        this.isConfigured = false;
        this.isInitialized = true;
        console.log('📧 [FACTORY] Email service disabled by settings');
        return;
      } else {
        const error = `Unknown email provider: ${this.provider}. Supported providers: smtp, mailersend, disabled`;
        console.error(`📧 [FACTORY] ${error}`);
        throw new Error(error);
      }

      // Verify the selected provider is properly configured
      if (!this.isConfigured) {
        const error = `Email provider '${this.provider}' is selected but not properly configured. Please check your settings.`;
        console.error(`📧 [FACTORY] ${error}`);
        throw new Error(error);
      }

      this.isInitialized = true;
      console.log(`📧 [FACTORY] Email service initialized with provider: ${this.provider}`);
    } catch (error) {
      console.error('📧 [FACTORY] Failed to initialize email service:', error);
      // Fallback to disabled mode on initialization error
      this.provider = 'disabled';
      this.isConfigured = false;
      this.isInitialized = true;
    }
  }

  /**
   * Initialize MailerSend
   */
  initializeMailerSend() {
    const mailerSendConfig = this.emailConfig?.mailersend || {};
    const apiKey = mailerSendConfig.apiKey || process.env.MAILERSEND_API_KEY;

    if (!apiKey || apiKey === 'your-api-key' || apiKey === '') {
      console.warn('📧 [FACTORY] MailerSend API key not configured');
      this.isConfigured = false;
      return;
    }

    this.mailerSend = new MailerSend({
      apiKey: apiKey
    });

    // Use MailerSend-specific from email/name if configured
    const fromEmail = mailerSendConfig.fromEmail || this.emailConfig?.fromEmail || process.env.EMAIL_FROM || 'noreply@shipdocs.app';
    const fromName = mailerSendConfig.fromName || this.emailConfig?.fromName || process.env.EMAIL_FROM_NAME || 'Maritime Onboarding Platform';

    this.sender = new Sender(fromEmail, fromName);
    this.isConfigured = true;
    console.log('📧 [FACTORY] MailerSend configured successfully');
  }

  /**
   * Initialize SMTP with database settings
   */
  initializeSMTP() {
    // Pass database settings to SMTP service
    const smtpConfig = {
      host: this.emailConfig.smtp?.host || this.emailConfig.smtp_host,
      port: this.emailConfig.smtp?.port || this.emailConfig.smtp_port,
      secure: this.emailConfig.smtp?.secure || this.emailConfig.smtp_secure,
      user: this.emailConfig.smtp?.user || this.emailConfig.smtp_user,
      pass: this.emailConfig.smtp?.password || this.emailConfig.smtp?.pass || this.emailConfig.smtp_pass
    };

    // Initialize SMTP service with database settings
    smtpEmailService.initializeTransporter(smtpConfig);
    this.isConfigured = smtpEmailService.isConfigured;

    if (this.isConfigured) {
      console.log('📧 [FACTORY] SMTP configured successfully');
    } else {
      console.warn('📧 [FACTORY] SMTP configuration incomplete');
    }
  }

  /**
   * Ensure email service is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeProvider();
    }
  }

  /**
   * Force re-initialization of the email service
   */
  async forceReinitialize() {
    // Reset initialization state
    this.isInitialized = false;
    this.provider = null;
    this.emailConfig = null;
    this.isConfigured = false;

    // Clear any existing service instances
    this.mailerSend = null;

    // Re-initialize with fresh settings
    await this.initializeProvider();
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured() {
    return this.isConfigured;
  }

  /**
   * Send email using the configured provider
   */
  async sendEmail({ to, toName, subject, html, attachments = [], logType = 'email', userId = null, context = {} }) {
    // Ensure email service is initialized
    await this.ensureInitialized();

    // Check if service is disabled
    if (this.provider === 'disabled') {
      console.log(`📧 [FACTORY] Email service disabled - would send to: ${to}, subject: ${subject}`);
      await this.logEmail(to, subject, 'Email service disabled in development', 'disabled');
      return {
        success: false,
        message: 'Email service is disabled in development. Set EMAIL_ENABLED=true to enable.',
        recipient: to
      };
    }

    // Check configuration
    if (!this.isConfigured) {
      const error = `Email provider '${this.provider}' is not properly configured. Please check your ${this.provider.toUpperCase()} settings in the admin panel.`;
      console.error(`📧 [${this.provider?.toUpperCase()}] ${error}`);
      await this.logEmail(to, subject, error, 'failed');
      throw new Error(error);
    }

    console.log(`📧 [FACTORY] Sending email via ${this.provider} to: ${to}`);

    if (this.provider === 'smtp') {
      return await this.sendViaSMTP({ to, toName, subject, html, attachments, logType, userId, context });
    } else if (this.provider === 'mailersend') {
      return await this.sendViaMailerSend({ to, toName, subject, html, attachments, logType, userId, context });
    }

    const error = `Unsupported email provider: ${this.provider}. Supported providers: smtp, mailersend`;
    console.error(`📧 [FACTORY] ${error}`);
    throw new Error(error);
  }

  /**
   * Send email via SMTP
   */
  async sendViaSMTP({ to, toName, subject, html, attachments, logType, userId, context }) {
    // Pass the database email configuration and audit context to SMTP service
    return await smtpEmailService.sendEmail({
      to,
      toName,
      subject,
      html,
      attachments,
      emailConfig: this.emailConfig,
      context: {
        ...context,
        emailType: logType || context?.emailType || 'notification',
        user: context?.user || (userId ? { id: userId } : null)
      }
    });
  }

  /**
   * Send email via MailerSend
   */
  async sendViaMailerSend({ to, toName, subject, html, attachments, logType, userId }) {
    try {
      const recipientEmail = to;

      // Check if real email sending is enabled
      if (!this.isRealEmailEnabled()) {
        console.log(`📧 [MAILERSEND] Mock mode - would send to: ${to}`);
        await this.logEmail(recipientEmail, subject, 'Mock mode - MailerSend email logged', 'mock');
        return {
          success: true,
          message: 'Email logged (mock mode)',
          messageId: 'mailersend-mock-' + Date.now(),
          recipient: to
        };
      }

      // Ensure html is a string
      if (typeof html !== 'string') {
        console.error(`📧 [MAILERSEND] ERROR: HTML content is not a string. Type: ${typeof html}`);
        throw new Error(`Invalid HTML content type: ${typeof html}`);
      }

      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(recipientEmail, toName)])
        .setSubject(subject)
        .setHtml(String(html));

      // Add attachments if provided
      if (attachments.length > 0) {
        const mailerSendAttachments = attachments.map(att => {
          if (att.content && Buffer.isBuffer(att.content)) {
            return new Attachment(
              att.content.toString('base64'),
              att.filename,
              'attachment'
            );
          }
          return att;
        });
        emailParams.setAttachments(mailerSendAttachments);
      }

      // Disable click tracking for localhost
      const isLocalhost = process.env.BASE_URL?.includes('localhost');
      if (isLocalhost) {
        emailParams.setSettings({
          track_clicks: false,
          track_opens: false
        });
      }

      const result = await this.mailerSend.email.send(emailParams);

      // Log successful email
      await this.logEmail(recipientEmail, subject, 'MailerSend email sent successfully', 'sent');
      console.log(`📧 [MAILERSEND] Email sent successfully to: ${to}`);

      return {
        success: true,
        message: 'Email sent successfully via MailerSend',
        messageId: result.messageId || result.id,
        recipient: to
      };

    } catch (error) {
      console.error('📧 [MAILERSEND ERROR] Failed to send email:', error);
      await this.logEmail(to, subject, `MailerSend error: ${error.message}`, 'failed');
      throw error;
    }
  }

  /**
   * Check if real email sending is enabled
   */
  isRealEmailEnabled() {
    const enableRealEmails = process.env.ENABLE_REAL_EMAILS;
    return enableRealEmails !== 'false' && enableRealEmails !== '0';
  }

  /**
   * Create attachment from Supabase Storage
   */
  async createAttachmentFromStorage(bucket, path, filename) {
    try {
      const fileData = await StorageService.downloadFile(bucket, path);
      const buffer = Buffer.from(await fileData.arrayBuffer());

      if (this.provider === 'smtp') {
        return smtpEmailService.createAttachment(buffer, filename);
      } else {
        return new Attachment(buffer.toString('base64'), filename, 'attachment');
      }
    } catch (error) {
      console.error('📧 [FACTORY] Error creating attachment from storage:', error);
      throw error;
    }
  }

  /**
   * Log email to database
   */
  async logEmail(recipientEmail, subject, body, status = 'sent') {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert({
          recipient_email: recipientEmail,
          subject: subject,
          body: body || `Status: ${status}`,
          sent_at: new Date().toISOString()
        });

      if (error) {
        console.error('📧 [FACTORY] Error logging email to Supabase:', error);
      }
    } catch (err) {
      console.error('📧 [FACTORY] Error logging email:', err);
    }
  }
}

// Export singleton instance
const emailServiceFactory = new EmailServiceFactory();
module.exports = { emailServiceFactory, EmailServiceFactory };
module.exports.default = emailServiceFactory;
