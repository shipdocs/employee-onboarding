// lib/email-interceptor.js - Email interception for development/staging environments
// Prevents accidental emails to real users during development and testing

const { supabase } = require('./database-supabase-compat');

class EmailInterceptor {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.vercelEnv = process.env.VERCEL_ENV;
    this.interceptEnabled = this.shouldIntercept();
    this.safeRecipients = this.getSafeRecipients();
  }

  // Determine if interception should be enabled
  shouldIntercept() {
    // Production should never intercept
    if (this.environment === 'production' && this.vercelEnv === 'production') {
      return false;
    }

    // Check for explicit override
    if (process.env.EMAIL_INTERCEPT === 'false') {
      return false;
    }

    // Intercept in all non-production environments
    return true;
  }

  // Get safe recipient list based on environment
  getSafeRecipients() {
    const baseRecipients = {
      development: [
        'dev-team@shipdocs.app',
        'test@shipdocs.app',
        'developer@localhost'
      ],
      staging: [
        'staging-team@shipdocs.app',
        'qa@shipdocs.app'
      ],
      preview: [
        'preview-team@shipdocs.app',
        'qa@shipdocs.app'
      ]
    };

    // Add custom safe recipients from environment
    const customRecipients = process.env.SAFE_EMAIL_RECIPIENTS
      ? process.env.SAFE_EMAIL_RECIPIENTS.split(',').map(e => e.trim())
      : [];

    const envRecipients = baseRecipients[this.environment] || baseRecipients.development;
    return [...new Set([...envRecipients, ...customRecipients])];
  }

  // Get redirect address based on environment
  getRedirectAddress() {
    const redirectMap = {
      development: process.env.DEV_EMAIL_REDIRECT || 'dev-team@shipdocs.app',
      staging: process.env.STAGING_EMAIL_REDIRECT || 'staging-team@shipdocs.app',
      preview: process.env.PREVIEW_EMAIL_REDIRECT || 'preview-team@shipdocs.app',
      testing: process.env.TEST_EMAIL_REDIRECT || 'test-team@shipdocs.app'
    };

    return redirectMap[this.environment] || redirectMap.development;
  }

  // Get environment prefix for subject
  getSubjectPrefix() {
    const prefixMap = {
      development: '[DEV]',
      staging: '[STAGING]',
      preview: '[PREVIEW]',
      testing: '[TEST]'
    };

    return prefixMap[this.environment] || '[DEV]';
  }

  // Check if email should be intercepted
  shouldInterceptEmail(email) {
    // Don't intercept if interception is disabled
    if (!this.interceptEnabled) {
      return false;
    }

    // Don't intercept emails to safe recipients
    if (this.safeRecipients.includes(email.toLowerCase())) {
      return false;
    }

    // Intercept all other emails
    return true;
  }

  // Intercept email and modify it for safe delivery
  async interceptEmail(emailData) {
    const intercepted = {
      ...emailData,
      intercepted: false,
      originalRecipient: null,
      interceptReason: null
    };

    // Check if interception is needed
    if (!this.shouldInterceptEmail(emailData.to)) {
      return intercepted;
    }

    // Store original recipient
    intercepted.originalRecipient = emailData.to;
    intercepted.intercepted = true;
    intercepted.interceptReason = `${this.environment} environment`;

    // Redirect to safe address
    intercepted.to = this.getRedirectAddress();

    // Add prefix to subject
    const prefix = this.getSubjectPrefix();
    intercepted.subject = `${prefix} ${emailData.subject}`;

    // Add interception notice to body
    const notice = this.createInterceptionNotice(emailData);

    if (emailData.html) {
      intercepted.html = notice.html + emailData.html;
    }

    if (emailData.text) {
      intercepted.text = notice.text + '\n\n' + emailData.text;
    }

    // Log interception
    await this.logInterception(emailData, intercepted);

    return intercepted;
  }

  // Create interception notice
  createInterceptionNotice(emailData) {
    const html = `
      <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 15px; margin-bottom: 20px; border-radius: 8px; font-family: Arial, sans-serif;">
        <h3 style="color: #92400E; margin: 0 0 10px 0;">⚠️ Email Intercepted - ${this.environment.toUpperCase()} Environment</h3>
        <p style="margin: 5px 0; color: #78350F;"><strong>Original Recipient:</strong> ${emailData.to}</p>
        <p style="margin: 5px 0; color: #78350F;"><strong>Original Subject:</strong> ${emailData.subject}</p>
        <p style="margin: 5px 0; color: #78350F;"><strong>Intercepted At:</strong> ${new Date().toISOString()}</p>
        <p style="margin: 10px 0 0 0; color: #78350F; font-size: 14px;">
          This email was intercepted to prevent delivery to the original recipient in the ${this.environment} environment.
          In production, this email would have been sent to: <strong>${emailData.to}</strong>
        </p>
      </div>
      <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
    `;

    const text = `
========================================
⚠️ EMAIL INTERCEPTED - ${this.environment.toUpperCase()} ENVIRONMENT
========================================
Original Recipient: ${emailData.to}
Original Subject: ${emailData.subject}
Intercepted At: ${new Date().toISOString()}

This email was intercepted to prevent delivery to the original recipient in the ${this.environment} environment.
In production, this email would have been sent to: ${emailData.to}
========================================
`;

    return { html, text };
  }

  // Log email interception
  async logInterception(original, intercepted) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        original_recipient: original.to,
        redirect_recipient: intercepted.to,
        original_subject: original.subject,
        intercepted_subject: intercepted.subject,
        reason: intercepted.interceptReason,
        metadata: {
          vercel_env: this.vercelEnv,
          node_env: this.environment,
          intercept_enabled: this.interceptEnabled
        }
      };

      // Try to log to database
      const { error } = await supabase
        .from('email_interceptions')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log interception to database:', error);
      }

      // Always log to console in development
      if (this.environment === 'development') {
        console.log('📧 Email Intercepted:', {
          from: original.to,
          to: intercepted.to,
          subject: intercepted.subject
        });
      }

    } catch (error) {
      console.error('Error logging interception:', error);
    }
  }

  // Create interception tracking table
  async createInterceptionTable() {
    try {
      const { error } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_interceptions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            environment VARCHAR(50),
            original_recipient VARCHAR(255),
            redirect_recipient VARCHAR(255),
            original_subject TEXT,
            intercepted_subject TEXT,
            reason VARCHAR(255),
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_interceptions_timestamp ON email_interceptions(timestamp);
          CREATE INDEX IF NOT EXISTS idx_interceptions_recipient ON email_interceptions(original_recipient);
        `
      });

      if (error) {
        console.error('Error creating interception table:', error);
      }
    } catch (error) {
      console.error('Error in createInterceptionTable:', error);
    }
  }

  // Get interception statistics
  async getInterceptionStats(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('email_interceptions')
        .select('*')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const stats = {
        total: data.length,
        byEnvironment: {},
        byOriginalDomain: {},
        recentInterceptions: data.slice(0, 10)
      };

      data.forEach(interception => {
        // Count by environment
        stats.byEnvironment[interception.environment] =
          (stats.byEnvironment[interception.environment] || 0) + 1;

        // Count by original domain
        const domain = interception.original_recipient.split('@')[1];
        stats.byOriginalDomain[domain] =
          (stats.byOriginalDomain[domain] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('Error getting interception stats:', error);
      return null;
    }
  }

  // Bulk intercept for testing
  async testInterception(recipients) {
    const results = [];

    for (const recipient of recipients) {
      const testEmail = {
        to: recipient,
        subject: 'Test Email',
        html: '<p>This is a test email.</p>',
        text: 'This is a test email.'
      };

      const intercepted = await this.interceptEmail(testEmail);
      results.push({
        original: recipient,
        intercepted: intercepted.intercepted,
        redirectTo: intercepted.to,
        reason: intercepted.interceptReason
      });
    }

    return results;
  }
}

// Export singleton instance
const emailInterceptor = new EmailInterceptor();

// Initialize table on first load
emailInterceptor.createInterceptionTable().catch(console.error);

module.exports = {
  emailInterceptor,
  EmailInterceptor
};
