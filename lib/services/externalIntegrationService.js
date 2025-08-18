/**
 * External Integration Service
 * Handles notifications and integrations with external incident response tools
 */

const { supabase } = require('../supabase');
const axios = require('axios');
const configService = require('../configService');

// Integration configuration
const EXTERNAL_INTEGRATIONS = {
  webhook: {
    enabled: process.env.INCIDENT_WEBHOOK_ENABLED === 'true',
    url: process.env.INCIDENT_WEBHOOK_URL,
    secret: process.env.INCIDENT_WEBHOOK_SECRET,
    timeout: 10000
  },

  pagerduty: {
    enabled: process.env.PAGERDUTY_ENABLED === 'true',
    integration_key: process.env.PAGERDUTY_INTEGRATION_KEY,
    api_url: 'https://events.pagerduty.com/v2/enqueue',
    severity_mapping: {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info'
    }
  },

  slack: {
    enabled: process.env.SLACK_ENABLED === 'true',
    webhook_url: process.env.SLACK_WEBHOOK_URL,
    channel: process.env.SLACK_CHANNEL || '#incidents',
    severity_filter: ['critical', 'high']
  },

  email: {
    enabled: process.env.INCIDENT_EMAIL_ENABLED === 'true',
    recipients: process.env.INCIDENT_EMAIL_RECIPIENTS?.split(',') || [],
    severity_filter: ['critical', 'high']
  }
};

class ExternalIntegrationService {
  constructor() {
    this.isEnabled = process.env.EXTERNAL_INTEGRATION_ENABLED !== 'false';
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Get integration configuration from database settings
   * Falls back to environment variables for migration period
   */
  async getIntegrationConfig() {
    return {
      webhook: {
        enabled: await configService.get('integrations.webhook_enabled') || EXTERNAL_INTEGRATIONS.webhook.enabled,
        url: await configService.get('integrations.webhook_url') || EXTERNAL_INTEGRATIONS.webhook.url,
        secret: await configService.get('integrations.webhook_secret') || EXTERNAL_INTEGRATIONS.webhook.secret,
        timeout: 10000
      },
      pagerduty: {
        enabled: await configService.get('integrations.pagerduty_enabled') || EXTERNAL_INTEGRATIONS.pagerduty.enabled,
        integration_key: await configService.get('integrations.pagerduty_integration_key') || EXTERNAL_INTEGRATIONS.pagerduty.integration_key,
        api_url: await configService.get('integrations.pagerduty_api_url') || EXTERNAL_INTEGRATIONS.pagerduty.api_url,
        severity_mapping: {
          critical: 'critical',
          high: 'error',
          medium: 'warning',
          low: 'info'
        }
      },
      slack: {
        enabled: await configService.get('integrations.slack_enabled') || EXTERNAL_INTEGRATIONS.slack.enabled,
        webhook_url: await configService.get('integrations.slack_webhook_url') || EXTERNAL_INTEGRATIONS.slack.webhook_url,
        channel: await configService.get('integrations.slack_channel') || EXTERNAL_INTEGRATIONS.slack.channel,
        severity_filter: ['critical', 'high']
      },
      email: {
        enabled: EXTERNAL_INTEGRATIONS.email.enabled,
        recipients: EXTERNAL_INTEGRATIONS.email.recipients,
        severity_filter: ['critical', 'high']
      }
    };
  }

  /**
   * Send incident notification to all configured external systems
   */
  async notifyExternalSystems(incident) {
    if (!this.isEnabled) return;

    const notifications = [];

    try {
      // Get current configuration from database
      const config = await this.getIntegrationConfig();

      // Send to webhook endpoint
      if (config.webhook.enabled) {
        notifications.push(this.sendWebhookNotification(incident, config.webhook));
      }

      // Send to PagerDuty
      if (config.pagerduty.enabled) {
        notifications.push(this.sendPagerDutyNotification(incident, config.pagerduty));
      }

      // Send to Slack
      if (config.slack.enabled &&
          config.slack.severity_filter.includes(incident.severity)) {
        notifications.push(this.sendSlackNotification(incident, config.slack));
      }

      // Send email notifications
      if (config.email.enabled &&
          config.email.severity_filter.includes(incident.severity)) {
        notifications.push(this.sendEmailNotification(incident, config.email));
      }

      // Wait for all notifications to complete
      await Promise.allSettled(notifications);

    } catch (error) {
      console.error('Error sending external notifications:', error);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(incident, config = null) {
    if (!config) {
      const integrationConfig = await this.getIntegrationConfig();
      config = integrationConfig.webhook;
    }

    const payload = {
      event_type: 'incident.detected',
      incident: {
        id: incident.incident_id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        title: incident.title,
        description: incident.description,
        detection_time: incident.detection_time,
        affected_users: incident.affected_users,
        affected_systems: incident.affected_systems,
        metadata: incident.metadata
      },
      response_required: incident.severity === 'critical',
      sla_deadline: this.calculateSLADeadline(incident)
    };

    return await this.sendNotification({
      type: 'webhook',
      endpoint: config.url,
      payload,
      incident_id: incident.incident_id,
      headers: {
        'Content-Type': 'application/json',
        'X-Incident-Signature': this.generateWebhookSignature(payload, config.secret)
      }
    });
  }

  /**
   * Send PagerDuty notification
   */
  async sendPagerDutyNotification(incident, config = null) {
    if (!config) {
      const integrationConfig = await this.getIntegrationConfig();
      config = integrationConfig.pagerduty;
    }

    const payload = {
      routing_key: config.integration_key,
      event_action: 'trigger',
      dedup_key: incident.incident_id,
      payload: {
        summary: incident.title,
        source: 'maritime-onboarding',
        severity: config.severity_mapping[incident.severity] || 'info',
        component: incident.affected_systems?.[0] || 'unknown',
        group: incident.type.split('.')[0],
        class: incident.type,
        custom_details: {
          incident_id: incident.incident_id,
          detection_time: incident.detection_time,
          affected_users: incident.affected_users,
          affected_systems: incident.affected_systems,
          metadata: incident.metadata
        }
      }
    };

    return await this.sendNotification({
      type: 'pagerduty',
      endpoint: config.api_url,
      payload,
      incident_id: incident.incident_id,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(incident, config = null) {
    if (!config) {
      const integrationConfig = await this.getIntegrationConfig();
      config = integrationConfig.slack;
    }

    const color = {
      critical: 'danger',
      high: 'warning',
      medium: '#ffcc00',
      low: 'good'
    }[incident.severity] || '#cccccc';

    const payload = {
      channel: config.channel,
      username: 'Incident Bot',
      icon_emoji: ':rotating_light:',
      text: `🚨 ${incident.severity.toUpperCase()} INCIDENT DETECTED`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Incident ID',
            value: incident.incident_id,
            short: true
          },
          {
            title: 'Type',
            value: incident.type.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            short: true
          },
          {
            title: 'Title',
            value: incident.title,
            short: false
          },
          {
            title: 'Affected Systems',
            value: incident.affected_systems?.join(', ') || 'Unknown',
            short: true
          },
          {
            title: 'Detection Time',
            value: new Date(incident.detection_time).toLocaleString(),
            short: true
          }
        ],
        footer: 'Maritime Onboarding Incident Detection',
        ts: Math.floor(new Date(incident.detection_time).getTime() / 1000)
      }]
    };

    return await this.sendNotification({
      type: 'slack',
      endpoint: config.webhook_url,
      payload,
      incident_id: incident.incident_id,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(incident, config = null) {
    if (!config) {
      const integrationConfig = await this.getIntegrationConfig();
      config = integrationConfig.email;
    }

    // This would integrate with the existing email service
    const emailService = require('./unifiedEmailService');

    const subject = `🚨 ${incident.severity.toUpperCase()} Incident: ${incident.title}`;
    const htmlContent = this.generateEmailTemplate(incident);

    const promises = config.recipients.map(recipient =>
      emailService.sendEmail({
        to: recipient,
        subject,
        html: htmlContent,
        metadata: {
          type: 'incident_notification',
          incident_id: incident.incident_id,
          severity: incident.severity
        }
      })
    );

    await Promise.allSettled(promises);

    return await this.logNotification({
      type: 'email',
      endpoint: 'email_service',
      payload: { subject, recipients: config.recipients },
      incident_id: incident.incident_id,
      success: true
    });
  }

  /**
   * Send notification with retry logic
   */
  async sendNotification({ type, endpoint, payload, incident_id, headers = {} }) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(endpoint, payload, {
          headers,
          timeout: EXTERNAL_INTEGRATIONS.webhook.timeout
        });

        // Log successful notification
        await this.logNotification({
          type,
          endpoint,
          payload,
          incident_id,
          success: true,
          response_code: response.status,
          response_body: JSON.stringify(response.data).substring(0, 1000)
        });

        return response;

      } catch (error) {
        lastError = error;
        console.error(`Notification attempt ${attempt} failed for ${type}:`, error.message);

        // Log failed attempt
        await this.logNotification({
          type,
          endpoint,
          payload,
          incident_id,
          success: false,
          response_code: error.response?.status,
          response_body: error.message,
          retry_count: attempt - 1
        });

        // Wait before retry (except on last attempt)
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Log notification attempt
   */
  async logNotification({
    type,
    endpoint,
    payload,
    incident_id,
    success,
    response_code = null,
    response_body = null,
    retry_count = 0
  }) {
    try {
      await supabase
        .from('incident_external_notifications')
        .insert([{
          incident_id,
          notification_type: type,
          endpoint_url: endpoint,
          payload,
          success,
          response_code,
          response_body,
          retry_count
        }]);
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Calculate SLA deadline based on severity
   */
  calculateSLADeadline(incident) {
    const slaMinutes = {
      critical: 15,
      high: 60,
      medium: 240,
      low: 1440
    }[incident.severity] || 1440;

    const deadline = new Date(incident.detection_time);
    deadline.setMinutes(deadline.getMinutes() + slaMinutes);
    return deadline.toISOString();
  }

  /**
   * Generate webhook signature for security
   */
  generateWebhookSignature(payload, secret) {
    if (!secret) return null;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Generate email template for incident notification
   */
  generateEmailTemplate(incident) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${incident.severity === 'critical' ? '#dc3545' : '#ffc107'};">
              🚨 ${incident.severity.toUpperCase()} Incident Detected
            </h1>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>${incident.title}</h2>
              <p><strong>Incident ID:</strong> ${incident.incident_id}</p>
              <p><strong>Type:</strong> ${incident.type}</p>
              <p><strong>Severity:</strong> ${incident.severity}</p>
              <p><strong>Detection Time:</strong> ${new Date(incident.detection_time).toLocaleString()}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3>Description</h3>
              <p>${incident.description}</p>
            </div>
            
            ${incident.affected_systems?.length ? `
              <div style="margin: 20px 0;">
                <h3>Affected Systems</h3>
                <ul>
                  ${incident.affected_systems.map(system => `<li>${system}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${incident.affected_users?.length ? `
              <div style="margin: 20px 0;">
                <h3>Affected Users</h3>
                <ul>
                  ${incident.affected_users.map(user => `<li>${user}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin: 30px 0; padding: 15px; background: #e9ecef; border-radius: 5px;">
              <p><strong>Response Required:</strong> ${incident.severity === 'critical' ? 'IMMEDIATE' : 'Within SLA'}</p>
              <p><strong>SLA Deadline:</strong> ${this.calculateSLADeadline(incident)}</p>
            </div>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification from the Maritime Onboarding Incident Detection System.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications() {
    try {
      const { data: failedNotifications, error } = await supabase
        .from('incident_external_notifications')
        .select('*')
        .eq('success', false)
        .lt('retry_count', this.retryAttempts)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) throw error;

      for (const notification of failedNotifications) {
        try {
          await this.sendNotification({
            type: notification.notification_type,
            endpoint: notification.endpoint_url,
            payload: notification.payload,
            incident_id: notification.incident_id
          });
        } catch (error) {
          console.error(`Retry failed for notification ${notification.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
    }
  }
}

// Export singleton instance
const externalIntegrationService = new ExternalIntegrationService();

module.exports = {
  externalIntegrationService,
  EXTERNAL_INTEGRATIONS
};
