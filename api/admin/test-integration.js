/**
 * Test Integration API
 * Allows testing external integrations from the admin interface
 * Located at: /api/admin/system-settings/test-integration
 */

const db = require('../../lib/database-direct');
const { externalIntegrationService } = require('../../lib/services/externalIntegrationService');
const { authenticateRequest } = require('../../lib/auth');
const { applyCors } = require('../../lib/cors');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  // Apply CORS headers
  if (!applyCors(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication using the standard auth function
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type: integrationType, settings } = req.body;

    if (!integrationType) {
      return res.status(400).json({ error: 'Integration type is required' });
    }

    if (!settings) {
      return res.status(400).json({ error: 'Settings are required' });
    }

    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [DEBUG] Test integration request:', {
        integrationType,
        settingsKeys: Object.keys(settings),
        settings: settings
      });
    }

    // Create a test incident for validation
    const testIncident = {
      incident_id: `test-${Date.now()}`,
      type: 'system.test',
      severity: 'low',
      status: 'detected',
      title: 'Integration Test',
      description: 'This is a test incident to validate external integration configuration.',
      detection_time: new Date().toISOString(),
      affected_users: [],
      affected_systems: ['admin-panel'],
      metadata: {
        test: true,
        triggered_by: user.email,
        timestamp: new Date().toISOString()
      }
    };

    let result = { success: false, error: 'Unknown error' };

    try {
      switch (integrationType) {
        case 'pagerduty':
          const pagerdutyKey = settings['integrations.pagerduty_integration_key'] ||
                              settings['pagerduty_integration_key'] ||
                              settings.pagerduty_integration_key;

          if (!pagerdutyKey) {
            return res.status(400).json({
              success: false,
              error: 'PagerDuty integration key is required',
              debug: process.env.NODE_ENV === 'development' ? {
                availableKeys: Object.keys(settings),
                expectedKey: 'integrations.pagerduty_integration_key'
              } : undefined
            });
          }

          // Validate PagerDuty integration key format
          if (typeof pagerdutyKey !== 'string' || pagerdutyKey.length < 10) {
            return res.status(400).json({
              success: false,
              error: 'PagerDuty integration key appears to be invalid. It should be a long alphanumeric string (32+ characters).',
              debug: process.env.NODE_ENV === 'development' ? {
                keyLength: pagerdutyKey.length,
                keyPreview: pagerdutyKey.substring(0, 8) + '...',
                expectedFormat: 'Long alphanumeric string (32+ characters)'
              } : undefined
            });
          }

          const pagerdutyConfig = {
            enabled: true,
            integration_key: pagerdutyKey,
            api_url: settings['integrations.pagerduty_api_url'] ||
                    settings['pagerduty_api_url'] ||
                    settings.pagerduty_api_url ||
                    'https://events.pagerduty.com/v2/enqueue',
            severity_mapping: {
              critical: 'critical',
              high: 'error',
              medium: 'warning',
              low: 'info'
            }
          };

          try {
            await externalIntegrationService.sendPagerDutyNotification(testIncident, pagerdutyConfig);
            result = { success: true, message: 'PagerDuty test notification sent successfully' };
          } catch (pagerdutyError) {
            // Handle specific PagerDuty errors
            let errorMessage = 'PagerDuty integration test failed';

            if (pagerdutyError.response?.data) {
              const errorData = typeof pagerdutyError.response.data === 'string'
                ? pagerdutyError.response.data
                : JSON.stringify(pagerdutyError.response.data);

              if (errorData.includes('Invalid routing key')) {
                errorMessage = 'Invalid PagerDuty integration key. Please check your integration key in PagerDuty settings.';
              } else if (errorData.includes('Unauthorized')) {
                errorMessage = 'PagerDuty integration key is not authorized. Please verify the key has proper permissions.';
              } else {
                errorMessage = `PagerDuty API error: ${errorData}`;
              }
            }

            throw new Error(errorMessage);
          }
          break;

        case 'slack':
          if (!settings['integrations.slack_webhook_url']) {
            return res.status(400).json({
              success: false,
              error: 'Slack webhook URL is required'
            });
          }

          const slackConfig = {
            enabled: true,
            webhook_url: settings['integrations.slack_webhook_url'],
            channel: settings['integrations.slack_channel'] || '#incidents',
            severity_filter: ['critical', 'high', 'medium', 'low']
          };

          await externalIntegrationService.sendSlackNotification(testIncident, slackConfig);
          result = { success: true, message: 'Slack test notification sent successfully' };
          break;

        case 'webhook':
          if (!settings['integrations.webhook_url']) {
            return res.status(400).json({
              success: false,
              error: 'Webhook URL is required'
            });
          }

          const webhookConfig = {
            enabled: true,
            url: settings['integrations.webhook_url'],
            secret: settings['integrations.webhook_secret'] || '',
            timeout: 10000
          };

          await externalIntegrationService.sendWebhookNotification(testIncident, webhookConfig);
          result = { success: true, message: 'Webhook test notification sent successfully' };
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported integration type: ${integrationType}`
          });
      }

      // Log successful test
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'integration_test_success',
          severity: 'low',
          user_id: user.id,
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          details: {
            integration_type: integrationType,
            message: result.message,
            timestamp: new Date().toISOString()
          },
          threats: []
        });

      res.status(200).json(result);

    } catch (integrationError) {
      console.error(`Integration test failed for ${integrationType}:`, integrationError);

      // Log the failed test attempt
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'integration_test_failed',
          severity: 'medium',
          user_id: user.id,
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          details: {
            integration_type: integrationType,
            error: integrationError.message,
            timestamp: new Date().toISOString()
          },
          threats: ['configuration_error']
        });

      res.status(400).json({
        success: false,
        error: integrationError.message || 'Integration test failed',
        debug: process.env.NODE_ENV === 'development' ? {
          stack: integrationError.stack,
          response: integrationError.response?.data,
          status: integrationError.response?.status
        } : undefined
      });
    }

  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = adminRateLimit(handler);
