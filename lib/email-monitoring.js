// lib/email-monitoring.js - Email monitoring and alerting system
// Tracks email metrics, detects anomalies, and sends alerts

const { supabase } = require('./supabase');
const { emailSecurity } = require('./email-security');

class EmailMonitoringService {
  constructor() {
    this.metrics = {
      sent: 0,
      failed: 0,
      blocked: 0,
      intercepted: 0,
      bounced: 0,
    };
    this.alertThresholds = {
      failureRate: 0.1, // 10% failure rate
      bounceRate: 0.05, // 5% bounce rate
      blockRate: 0.2, // 20% block rate
      hourlyLimit: 100, // Max emails per hour
      dailyLimit: 1000, // Max emails per day
    };
    this.monitoringInterval = null;
    this.alertCooldown = new Map(); // Prevent alert spam
  }

  // Initialize monitoring service
  async initialize() {
    // Create monitoring tables
    await this.createMonitoringTables();
    
    // Start periodic monitoring
    this.startMonitoring();
    
    // Initialize webhook handlers
    await this.initializeWebhooks();
    
    console.log('✅ Email monitoring service initialized');
  }

  // Create monitoring tables
  async createMonitoringTables() {
    try {
      // Email metrics table
      const { error: metricsError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_metrics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metric_type VARCHAR(50) NOT NULL,
            metric_value INTEGER DEFAULT 0,
            time_window VARCHAR(20),
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON email_metrics(timestamp);
          CREATE INDEX IF NOT EXISTS idx_metrics_type ON email_metrics(metric_type);
        `
      });

      // Email alerts table
      const { error: alertsError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_alerts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            metadata JSONB,
            acknowledged BOOLEAN DEFAULT FALSE,
            acknowledged_by UUID,
            acknowledged_at TIMESTAMP WITH TIME ZONE
          );
          
          CREATE INDEX IF NOT EXISTS idx_alerts_created ON email_alerts(created_at);
          CREATE INDEX IF NOT EXISTS idx_alerts_type ON email_alerts(alert_type);
          CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON email_alerts(acknowledged);
        `
      });

      // Email bounce tracking
      const { error: bounceError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_bounces (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email_address VARCHAR(255) NOT NULL,
            bounce_type VARCHAR(50),
            bounce_reason TEXT,
            bounced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_bounces_email ON email_bounces(email_address);
          CREATE INDEX IF NOT EXISTS idx_bounces_timestamp ON email_bounces(bounced_at);
        `
      });

      // Email patterns table for anomaly detection
      const { error: patternsError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_patterns (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pattern_type VARCHAR(50) NOT NULL,
            pattern_value TEXT,
            occurrences INTEGER DEFAULT 1,
            first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_patterns_type ON email_patterns(pattern_type);
          CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON email_patterns(last_seen);
        `
      });

    } catch (error) {
      console.error('Error creating monitoring tables:', error);
    }
  }

  // Start monitoring interval
  startMonitoring() {
    // Run monitoring checks every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringChecks().catch(console.error);
    }, 5 * 60 * 1000);

    // Run initial check
    this.performMonitoringChecks().catch(console.error);
  }

  // Perform monitoring checks
  async performMonitoringChecks() {
    try {
      // Collect metrics
      const metrics = await this.collectMetrics();
      
      // Check for anomalies
      await this.detectAnomalies(metrics);
      
      // Check thresholds
      await this.checkThresholds(metrics);
      
      // Update patterns
      await this.updatePatterns(metrics);
      
      // Store metrics
      await this.storeMetrics(metrics);
      
    } catch (error) {
      console.error('Error in monitoring checks:', error);
    }
  }

  // Collect current metrics
  async collectMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    try {
      // Get email counts from logs
      const { data: hourlyLogs, error: hourlyError } = await supabase
        .from('email_notifications')
        .select('sent_at')
        .gte('sent_at', oneHourAgo.toISOString());

      const { data: dailyLogs, error: dailyError } = await supabase
        .from('email_notifications')
        .select('sent_at')
        .gte('sent_at', oneDayAgo.toISOString());

      // Get security events
      const { data: securityEvents, error: securityError } = await supabase
        .from('email_security_logs')
        .select('event_type')
        .gte('timestamp', oneHourAgo.toISOString());

      // Get bounce data
      const { data: bounces, error: bounceError } = await supabase
        .from('email_bounces')
        .select('bounce_type')
        .gte('bounced_at', oneHourAgo.toISOString());

      // Calculate metrics
      const metrics = {
        timestamp: now,
        hourly: {
          sent: hourlyLogs?.length || 0,
          blocked: securityEvents?.filter(e => e.event_type.includes('blocked')).length || 0,
          failed: securityEvents?.filter(e => e.event_type.includes('failed')).length || 0,
          bounced: bounces?.length || 0,
        },
        daily: {
          sent: dailyLogs?.length || 0,
        },
        rates: {},
      };

      // Calculate rates
      if (metrics.hourly.sent > 0) {
        metrics.rates.failureRate = metrics.hourly.failed / metrics.hourly.sent;
        metrics.rates.bounceRate = metrics.hourly.bounced / metrics.hourly.sent;
        metrics.rates.blockRate = metrics.hourly.blocked / (metrics.hourly.sent + metrics.hourly.blocked);
      }

      return metrics;

    } catch (error) {
      console.error('Error collecting metrics:', error);
      return null;
    }
  }

  // Detect anomalies in email patterns
  async detectAnomalies(metrics) {
    if (!metrics) return;

    const anomalies = [];

    // Check for sudden spikes
    const previousMetrics = await this.getPreviousMetrics();
    if (previousMetrics) {
      // Spike in email volume (>200% increase)
      if (metrics.hourly.sent > previousMetrics.hourly.sent * 2) {
        anomalies.push({
          type: 'volume_spike',
          severity: 'warning',
          description: `Email volume spike: ${metrics.hourly.sent} emails (${Math.round((metrics.hourly.sent / previousMetrics.hourly.sent - 1) * 100)}% increase)`,
        });
      }

      // Spike in failures
      if (metrics.hourly.failed > previousMetrics.hourly.failed * 3) {
        anomalies.push({
          type: 'failure_spike',
          severity: 'critical',
          description: `Failure spike: ${metrics.hourly.failed} failures`,
        });
      }
    }

    // Check for unusual patterns
    const patterns = await this.getUnusualPatterns();
    anomalies.push(...patterns);

    // Create alerts for anomalies
    for (const anomaly of anomalies) {
      await this.createAlert(anomaly.type, anomaly.severity, anomaly.description, {
        metrics: metrics,
        anomaly: anomaly,
      });
    }
  }

  // Check threshold violations
  async checkThresholds(metrics) {
    if (!metrics) return;

    // Check failure rate
    if (metrics.rates.failureRate > this.alertThresholds.failureRate) {
      await this.createAlert(
        'high_failure_rate',
        'critical',
        `High failure rate: ${Math.round(metrics.rates.failureRate * 100)}%`,
        { rate: metrics.rates.failureRate }
      );
    }

    // Check bounce rate
    if (metrics.rates.bounceRate > this.alertThresholds.bounceRate) {
      await this.createAlert(
        'high_bounce_rate',
        'warning',
        `High bounce rate: ${Math.round(metrics.rates.bounceRate * 100)}%`,
        { rate: metrics.rates.bounceRate }
      );
    }

    // Check hourly limit
    if (metrics.hourly.sent > this.alertThresholds.hourlyLimit) {
      await this.createAlert(
        'hourly_limit_exceeded',
        'warning',
        `Hourly limit exceeded: ${metrics.hourly.sent} emails sent`,
        { limit: this.alertThresholds.hourlyLimit, actual: metrics.hourly.sent }
      );
    }

    // Check daily limit
    if (metrics.daily.sent > this.alertThresholds.dailyLimit) {
      await this.createAlert(
        'daily_limit_exceeded',
        'critical',
        `Daily limit exceeded: ${metrics.daily.sent} emails sent`,
        { limit: this.alertThresholds.dailyLimit, actual: metrics.daily.sent }
      );
    }
  }

  // Get previous metrics for comparison
  async getPreviousMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('email_metrics')
        .select('*')
        .gte('timestamp', twoHoursAgo.toISOString())
        .lt('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);

      return data?.[0]?.metadata || null;

    } catch (error) {
      console.error('Error getting previous metrics:', error);
      return null;
    }
  }

  // Detect unusual patterns
  async getUnusualPatterns() {
    const patterns = [];

    try {
      // Check for repeated failures to same domain
      const { data: failureDomains, error: failureError } = await supabase
        .from('email_security_logs')
        .select('recipient_email')
        .eq('security_action', 'failed')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (failureDomains) {
        const domainCounts = {};
        failureDomains.forEach(log => {
          const domain = log.recipient_email?.split('@')[1];
          if (domain) {
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          }
        });

        Object.entries(domainCounts).forEach(([domain, count]) => {
          if (count > 5) {
            patterns.push({
              type: 'repeated_domain_failures',
              severity: 'warning',
              description: `Repeated failures to ${domain}: ${count} failures`,
            });
          }
        });
      }

      // Check for suspicious sending patterns
      const { data: sendingPatterns, error: patternError } = await supabase
        .from('email_notifications')
        .select('recipient_email, sent_at')
        .gte('sent_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false });

      if (sendingPatterns) {
        // Check for bulk sends to similar addresses
        const emailPatterns = {};
        sendingPatterns.forEach(email => {
          const prefix = email.recipient_email.split('@')[0].substring(0, 5);
          emailPatterns[prefix] = (emailPatterns[prefix] || 0) + 1;
        });

        Object.entries(emailPatterns).forEach(([prefix, count]) => {
          if (count > 10) {
            patterns.push({
              type: 'bulk_similar_addresses',
              severity: 'warning',
              description: `Bulk sends to similar addresses (${prefix}*): ${count} emails`,
            });
          }
        });
      }

    } catch (error) {
      console.error('Error detecting patterns:', error);
    }

    return patterns;
  }

  // Update pattern tracking
  async updatePatterns(metrics) {
    if (!metrics) return;

    try {
      // Update volume pattern
      await this.updatePattern('hourly_volume', metrics.hourly.sent.toString(), {
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      });

      // Update failure pattern
      if (metrics.hourly.failed > 0) {
        await this.updatePattern('failure_pattern', metrics.hourly.failed.toString(), {
          failureRate: metrics.rates.failureRate,
        });
      }

    } catch (error) {
      console.error('Error updating patterns:', error);
    }
  }

  // Update individual pattern
  async updatePattern(patternType, patternValue, metadata = {}) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('email_patterns')
        .select('*')
        .eq('pattern_type', patternType)
        .eq('pattern_value', patternValue)
        .single();

      if (existing && !fetchError) {
        // Update existing pattern
        await supabase
          .from('email_patterns')
          .update({
            occurrences: existing.occurrences + 1,
            last_seen: new Date().toISOString(),
            metadata: { ...existing.metadata, ...metadata },
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await supabase
          .from('email_patterns')
          .insert({
            pattern_type: patternType,
            pattern_value: patternValue,
            metadata: metadata,
          });
      }
    } catch (error) {
      console.error('Error updating pattern:', error);
    }
  }

  // Store metrics in database
  async storeMetrics(metrics) {
    if (!metrics) return;

    try {
      await supabase
        .from('email_metrics')
        .insert({
          metric_type: 'hourly_snapshot',
          metric_value: metrics.hourly.sent,
          time_window: 'hourly',
          metadata: metrics,
        });

    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }

  // Create alert
  async createAlert(alertType, severity, description, metadata = {}) {
    // Check cooldown to prevent spam
    const cooldownKey = `${alertType}:${severity}`;
    const lastAlert = this.alertCooldown.get(cooldownKey);
    
    if (lastAlert && Date.now() - lastAlert < 30 * 60 * 1000) { // 30 min cooldown
      return;
    }

    try {
      const alert = {
        alert_type: alertType,
        severity: severity,
        title: this.getAlertTitle(alertType),
        description: description,
        metadata: metadata,
      };

      const { data, error } = await supabase
        .from('email_alerts')
        .insert(alert)
        .select()
        .single();

      if (!error && data) {
        // Update cooldown
        this.alertCooldown.set(cooldownKey, Date.now());

        // Send notification based on severity
        if (severity === 'critical') {
          await this.sendCriticalAlert(data);
        }

        console.warn(`⚠️ Email Alert: ${severity.toUpperCase()} - ${description}`);
      }

    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  // Get alert title based on type
  getAlertTitle(alertType) {
    const titles = {
      high_failure_rate: 'High Email Failure Rate',
      high_bounce_rate: 'High Email Bounce Rate',
      hourly_limit_exceeded: 'Hourly Email Limit Exceeded',
      daily_limit_exceeded: 'Daily Email Limit Exceeded',
      volume_spike: 'Email Volume Spike Detected',
      failure_spike: 'Email Failure Spike Detected',
      repeated_domain_failures: 'Repeated Failures to Domain',
      bulk_similar_addresses: 'Bulk Email Pattern Detected',
      api_key_expiring: 'API Key Expiring Soon',
      security_incident: 'Email Security Incident',
    };

    return titles[alertType] || 'Email System Alert';
  }

  // Send critical alert notification
  async sendCriticalAlert(alert) {
    // This would integrate with your notification system
    // For now, just log it prominently
    console.error('🚨 CRITICAL EMAIL ALERT 🚨');
    console.error(`Type: ${alert.alert_type}`);
    console.error(`Title: ${alert.title}`);
    console.error(`Description: ${alert.description}`);
    console.error(`Metadata:`, alert.metadata);
    
    // Could send to Slack, PagerDuty, email admins, etc.
  }

  // Handle email bounce webhook
  async handleBounceWebhook(webhookData) {
    try {
      const { email, bounceType, bounceReason } = webhookData;

      // Record bounce
      await supabase
        .from('email_bounces')
        .insert({
          email_address: email,
          bounce_type: bounceType,
          bounce_reason: bounceReason,
          metadata: webhookData,
        });

      // Update user status if hard bounce
      if (bounceType === 'hard') {
        await this.handleHardBounce(email);
      }

    } catch (error) {
      console.error('Error handling bounce webhook:', error);
    }
  }

  // Handle hard bounce
  async handleHardBounce(email) {
    try {
      // Mark email as invalid in users table
      const { error } = await supabase
        .from('users')
        .update({ email_valid: false, email_bounce_reason: 'hard_bounce' })
        .eq('email', email);

      if (!error) {
        await this.createAlert(
          'hard_bounce',
          'warning',
          `Hard bounce detected for ${email}`,
          { email }
        );
      }

    } catch (error) {
      console.error('Error handling hard bounce:', error);
    }
  }

  // Initialize webhook handlers
  async initializeWebhooks() {
    // This would set up webhook endpoints for your email provider
    // Implementation depends on your infrastructure
  }

  // Get monitoring dashboard data
  async getDashboardData() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

      // Get recent metrics
      const { data: recentMetrics, error: metricsError } = await supabase
        .from('email_metrics')
        .select('*')
        .gte('timestamp', oneDayAgo.toISOString())
        .order('timestamp', { ascending: false });

      // Get recent alerts
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('email_alerts')
        .select('*')
        .gte('created_at', oneDayAgo.toISOString())
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      // Get bounce statistics
      const { data: bounceStats, error: bounceError } = await supabase
        .from('email_bounces')
        .select('bounce_type, COUNT(*)')
        .gte('bounced_at', oneWeekAgo.toISOString())
        .group('bounce_type');

      // Get security statistics
      const securityStats = await emailSecurity.getSecurityMetrics('24h');

      return {
        metrics: recentMetrics || [],
        alerts: recentAlerts || [],
        bounceStats: bounceStats || [],
        securityStats: securityStats || {},
        currentStatus: this.getCurrentStatus(),
      };

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  }

  // Get current system status
  getCurrentStatus() {
    const status = {
      operational: true,
      issues: [],
    };

    // Check for recent critical alerts
    if (this.alertCooldown.size > 0) {
      status.operational = false;
      status.issues.push('Active alerts detected');
    }

    return status;
  }

  // Stop monitoring
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Export singleton instance
const emailMonitoring = new EmailMonitoringService();

module.exports = {
  emailMonitoring,
  EmailMonitoringService,
};