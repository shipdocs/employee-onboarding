/**
 * Health Monitoring Service
 * Monitors system health and sends alerts when issues are detected
 */

const { supabase } = require('../../lib/supabase');
const config = require('./health-monitoring-config');

class HealthMonitor {
  constructor() {
    this.config = config;
    this.status = {
      endpoints: {},
      lastCheck: null,
      uptime: {
        start: Date.now(),
        checks: 0,
        failures: 0
      }
    };
    this.alertThrottle = new Map();
  }

  /**
   * Check all endpoints
   */
  async checkAllEndpoints() {
    const results = {
      timestamp: new Date().toISOString(),
      endpoints: {},
      overall: 'healthy',
      failedEndpoints: 0
    };

    for (const [name, endpoint] of Object.entries(this.config.endpoints)) {
      const result = await this.checkEndpoint(name, endpoint);
      results.endpoints[name] = result;
      
      if (result.status === 'down') {
        results.failedEndpoints++;
        if (endpoint.critical) {
          results.overall = 'critical';
        } else if (results.overall !== 'critical') {
          results.overall = 'degraded';
        }
      }
    }

    this.status.lastCheck = results;
    this.status.uptime.checks++;
    
    if (results.overall !== 'healthy') {
      this.status.uptime.failures++;
    }

    // Check alert rules
    await this.evaluateAlertRules(results);

    // Store metrics
    await this.storeMetrics(results);

    return results;
  }

  /**
   * Check individual endpoint
   */
  async checkEndpoint(name, config) {
    const startTime = Date.now();
    let attempts = 0;
    let lastError = null;

    while (attempts < config.retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${config.url}`, {
          method: 'GET',
          headers: {
            'X-Health-Check': 'true',
            'X-Health-Check-Type': 'monitoring'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        const data = await response.json();

        return {
          status: response.ok ? 'up' : 'down',
          statusCode: response.status,
          responseTime,
          data,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts < config.retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // All retries failed
    return {
      status: 'down',
      error: lastError.message,
      responseTime: Date.now() - startTime,
      attempts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluate alert rules
   */
  async evaluateAlertRules(results) {
    for (const rule of this.config.alerts.rules) {
      const shouldAlert = this.evaluateCondition(rule.condition, results);
      
      if (shouldAlert) {
        await this.sendAlert(rule, results);
      }
    }
  }

  /**
   * Evaluate a condition string
   */
  evaluateCondition(condition, context) {
    try {
      // Create a safe evaluation context
      const safeContext = {
        endpoint: context.endpoints,
        failedEndpoints: context.failedEndpoints,
        overall: context.overall
      };

      // Simple condition evaluator (in production, use a proper expression parser)
      const func = new Function('context', `
        with (context) {
          return ${condition};
        }
      `);
      
      return func(safeContext);
    } catch (error) {
      console.error('Failed to evaluate condition:', condition, error);
      return false;
    }
  }

  /**
   * Send alert
   */
  async sendAlert(rule, results) {
    // Check throttle
    const throttleKey = `${rule.name}-${rule.severity}`;
    const lastAlert = this.alertThrottle.get(throttleKey);
    
    if (lastAlert && Date.now() - lastAlert < 300000) { // 5 minutes
      return; // Alert already sent recently
    }

    this.alertThrottle.set(throttleKey, Date.now());

    const alert = {
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date().toISOString(),
      details: results
    };

    // Send to configured channels
    for (const channel of rule.channels) {
      if (this.config.alerts.channels[channel]?.enabled) {
        await this.sendToChannel(channel, alert);
      }
    }

    // Log alert
    await this.logAlert(alert);
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, alert) {
    const channelConfig = this.config.alerts.channels[channel];

    switch (channel) {
      case 'email':
        await this.sendEmailAlert(channelConfig, alert);
        break;
      case 'slack':
        await this.sendSlackAlert(channelConfig, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(channelConfig, alert);
        break;
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(config, alert) {
    // Implementation would use unifiedEmailService
    console.log('Email alert:', alert);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(config, alert) {
    if (!config.webhook) return;

    try {
      const color = {
        critical: '#FF0000',
        high: '#FF6600',
        medium: '#FFCC00',
        low: '#00CC00'
      }[alert.severity] || '#808080';

      const payload = {
        channel: config.channel,
        attachments: [{
          color,
          title: `🚨 ${alert.rule}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true
            }
          ],
          footer: 'Maritime Onboarding System',
          ts: Date.now() / 1000
        }]
      };

      await fetch(config.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send PagerDuty alert
   */
  async sendPagerDutyAlert(config, alert) {
    // PagerDuty implementation
    console.log('PagerDuty alert:', alert);
  }

  /**
   * Log alert to database
   */
  async logAlert(alert) {
    try {
      await supabase
        .from('system_alerts')
        .insert({
          type: 'health_monitoring',
          severity: alert.severity,
          rule: alert.rule,
          message: alert.message,
          details: alert.details,
          created_at: alert.timestamp
        });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  /**
   * Store metrics
   */
  async storeMetrics(results) {
    try {
      const metrics = {
        timestamp: results.timestamp,
        overall_status: results.overall,
        failed_endpoints: results.failedEndpoints,
        endpoint_status: {},
        response_times: {},
        uptime_percentage: this.calculateUptime()
      };

      for (const [name, result] of Object.entries(results.endpoints)) {
        metrics.endpoint_status[name] = result.status;
        metrics.response_times[name] = result.responseTime;
      }

      await supabase
        .from('health_metrics')
        .insert({
          type: 'health_check',
          metrics,
          created_at: results.timestamp
        });

    } catch (error) {
      console.error('Failed to store metrics:', error);
    }
  }

  /**
   * Calculate uptime percentage
   */
  calculateUptime() {
    if (this.status.uptime.checks === 0) return 100;
    
    const successRate = (this.status.uptime.checks - this.status.uptime.failures) / this.status.uptime.checks;
    return Math.round(successRate * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      ...this.status,
      uptime: {
        ...this.status.uptime,
        percentage: this.calculateUptime(),
        duration: Date.now() - this.status.uptime.start
      }
    };
  }
}

module.exports = HealthMonitor;