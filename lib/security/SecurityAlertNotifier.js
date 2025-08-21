/**
 * Security Alert Notifier
 *
 * Handles email notifications for security alerts detected by SecurityMonitoringService
 * Uses database configuration for GUI-manageable settings
 */

const { emailService } = require('../emailService');
const { SecurityConfigService } = require('./SecurityConfigService');

class SecurityAlertNotifier {
  constructor() {
    this.configService = new SecurityConfigService();
    this.emailHistory = new Map(); // Track sent emails for rate limiting
    this.lastAlertTimes = new Map(); // Track last alert time per metric

    // Fallback configuration (used if database config fails)
    this.fallbackConfig = {
      rateLimiting: {
        maxEmailsPerHour: 10,
        cooldownMinutes: 15
      },
      templates: {
        critical: '🚨 CRITICAL Security Alert - Maritime Onboarding',
        warning: '⚠️ Security Warning - Maritime Onboarding'
      },
      dashboardUrl: 'http://localhost:3000/admin/security',
      emergencyContact: 'security@company.com'
    };
  }

  /**
   * Send email notification for security alert
   */
  async sendAlertEmail(alert) {
    try {
      // Store alert in database first
      await this.configService.storeAlert(alert);

      // Check rate limiting
      if (!(await this.shouldSendEmail(alert))) {
        console.log(`Rate limiting: Skipping email for ${alert.metric} alert`);
        return false;
      }

      const recipients = await this.getRecipientsForAlert(alert);
      if (!recipients || recipients.length === 0) {
        console.log(`No recipients configured for ${alert.type} alerts`);
        return false;
      }

      const emailContent = await this.generateEmailContent(alert);
      const subject = await this.getEmailSubject(alert);

      await emailService.sendEmail({
        to: recipients,
        subject: subject,
        html: emailContent.html,
        text: emailContent.text
      });

      // Update rate limiting tracking
      this.updateEmailHistory(alert);

      console.log(`✅ Security alert email sent for ${alert.metric} (${alert.type}) to ${recipients.length} recipients`);
      return true;

    } catch (error) {
      console.error('Failed to send security alert email:', error);
      return false;
    }
  }

  /**
   * Check if email should be sent based on rate limiting
   */
  async shouldSendEmail(alert) {
    try {
      const rateLimitConfig = await this.configService.getConfig('rate_limiting') || this.fallbackConfig.rateLimiting;

      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);

      // Clean old email history
      for (const [timestamp] of this.emailHistory) {
        if (timestamp < hourAgo) {
          this.emailHistory.delete(timestamp);
        }
      }

      // Check hourly limit
      if (this.emailHistory.size >= rateLimitConfig.maxEmailsPerHour) {
        return false;
      }

      // Check cooldown for similar alerts
      const lastAlertTime = this.lastAlertTimes.get(alert.metric);
      if (lastAlertTime) {
        const cooldownMs = rateLimitConfig.cooldownMinutes * 60 * 1000;
        if (now - lastAlertTime < cooldownMs) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking rate limiting:', error);
      return false; // Fail safe - don't send if we can't check limits
    }
  }

  /**
   * Get email recipients based on alert type from database
   */
  async getRecipientsForAlert(alert) {
    try {
      const result = await this.configService.getAlertRecipients(alert.type);
      if (result.success && result.data[alert.type] && result.data[alert.type].email) {
        return result.data[alert.type].email;
      }

      // Fallback to environment variables
      const fallbackRecipients = [];
      if (alert.type === 'critical') {
        if (process.env.SECURITY_EMAIL) fallbackRecipients.push(process.env.SECURITY_EMAIL);
        if (process.env.DEVOPS_EMAIL) fallbackRecipients.push(process.env.DEVOPS_EMAIL);
      } else {
        if (process.env.DEVOPS_EMAIL) fallbackRecipients.push(process.env.DEVOPS_EMAIL);
      }

      return fallbackRecipients.length > 0 ? fallbackRecipients : ['security@company.com'];
    } catch (error) {
      console.error('Error getting alert recipients:', error);
      return ['security@company.com']; // Ultimate fallback
    }
  }

  /**
   * Get email subject from database configuration
   */
  async getEmailSubject(alert) {
    try {
      const templates = await this.configService.getConfig('email_templates') || this.fallbackConfig.templates;
      return templates[alert.type] || this.fallbackConfig.templates[alert.type];
    } catch (error) {
      console.error('Error getting email template:', error);
      return this.fallbackConfig.templates[alert.type];
    }
  }

  /**
   * Generate email content for alert
   */
  generateEmailContent(alert) {
    const dashboardUrl = process.env.GRAFANA_DASHBOARD_URL || 'http://localhost:3000/admin/security';
    const timestamp = new Date(alert.timestamp).toLocaleString();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.type === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${alert.type === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'} Security Alert</h1>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">Alert Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Metric:</td>
              <td style="padding: 8px 0; color: #374151;">${alert.metric}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Value:</td>
              <td style="padding: 8px 0; color: #374151;">${alert.value}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Threshold:</td>
              <td style="padding: 8px 0; color: #374151;">${alert.threshold}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Time:</td>
              <td style="padding: 8px 0; color: #374151;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Message:</td>
              <td style="padding: 8px 0; color: #374151;">${alert.message}</td>
            </tr>
          </table>
        </div>
        
        <div style="padding: 20px; text-align: center;">
          <a href="${dashboardUrl}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Security Dashboard
          </a>
        </div>
        
        <div style="padding: 20px; background: #f3f4f6; font-size: 12px; color: #6b7280;">
          <p><strong>Recommended Actions:</strong></p>
          <ul>
            ${this.getRecommendedActions(alert.metric).map(action => `<li>${action}</li>`).join('')}
          </ul>
          
          <p style="margin-top: 16px;">
            This is an automated security alert from Maritime Onboarding Platform.
            <br>
            For urgent issues, contact: ${process.env.SECURITY_EMAIL || 'security@company.com'}
          </p>
        </div>
      </div>
    `;

    const text = `
SECURITY ALERT: ${alert.type.toUpperCase()}

Metric: ${alert.metric}
Value: ${alert.value}
Threshold: ${alert.threshold}
Time: ${timestamp}
Message: ${alert.message}

View Dashboard: ${dashboardUrl}

Recommended Actions:
${this.getRecommendedActions(alert.metric).map(action => `- ${action}`).join('\n')}

This is an automated security alert from Maritime Onboarding Platform.
For urgent issues, contact: ${process.env.SECURITY_EMAIL || 'security@company.com'}
    `;

    return { html, text };
  }

  /**
   * Get recommended actions based on alert metric
   */
  getRecommendedActions(metric) {
    const actions = {
      rateLimitViolations: [
        'Check for potential DDoS or brute force attacks',
        'Review IP addresses in access logs',
        'Consider temporarily blocking suspicious IPs',
        'Verify rate limiting configuration'
      ],
      xssAttempts: [
        'Review application logs for XSS attack patterns',
        'Verify input sanitization is working correctly',
        'Check Content Security Policy configuration',
        'Consider blocking source IPs if attacks persist'
      ],
      authFailures: [
        'Check for brute force login attempts',
        'Review failed authentication logs',
        'Consider implementing account lockout policies',
        'Verify MFA is enabled for admin accounts'
      ],
      malwareDetections: [
        'Immediately investigate uploaded files',
        'Scan system for potential compromise',
        'Review file upload security controls',
        'Consider temporary file upload restrictions'
      ],
      suspiciousSessions: [
        'Review session management logs',
        'Check for session hijacking attempts',
        'Verify session security configuration',
        'Consider forcing re-authentication for affected users'
      ]
    };

    return actions[metric] || [
      'Review security logs for this metric',
      'Check system configuration',
      'Monitor for continued anomalies',
      'Contact security team if issues persist'
    ];
  }

  /**
   * Update email history for rate limiting
   */
  updateEmailHistory(alert) {
    const now = Date.now();
    this.emailHistory.set(now, alert);
    this.lastAlertTimes.set(alert.metric, now);
  }

  /**
   * Configure email recipients
   */
  async setRecipients(type, recipients, userId) {
    // Persist via config service or recipients table
    if (Array.isArray(recipients)) {
      // Add each recipient to the database
      for (const recipient of recipients) {
        await this.configService.addAlertRecipient(
          type,
          'email',
          recipient,
          userId
        );
      }
    } else {
      await this.configService.addAlertRecipient(
        type,
        'email',
        recipients,
        userId
      );
    }
  }

  /**
   * Get email sending statistics
   */
  async getEmailStats() {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    const recentEmails = Array.from(this.emailHistory.keys())
      .filter(timestamp => timestamp > hourAgo);

    // Get rate limiting config from database or use fallback
    let rateLimitConfig;
    try {
      rateLimitConfig = await this.configService.getConfig('rate_limiting') || this.fallbackConfig.rateLimiting;
    } catch (error) {
      console.error('Error getting rate limiting config:', error);
      rateLimitConfig = this.fallbackConfig.rateLimiting;
    }

    const maxPerHour = rateLimitConfig.maxEmailsPerHour || this.fallbackConfig.rateLimiting.maxEmailsPerHour;

    return {
      emailsSentLastHour: recentEmails.length,
      maxEmailsPerHour: maxPerHour,
      remainingEmails: Math.max(0, maxPerHour - recentEmails.length),
      lastAlertTimes: Object.fromEntries(this.lastAlertTimes)
    };
  }
}

module.exports = { SecurityAlertNotifier };
