/**
 * Security Monitoring Service
 *
 * Provides automated security event monitoring, metric collection,
 * and real-time security dashboard functionality.
 */

const EventEmitter = require('events');

class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      rateLimitViolations: { warning: 10, critical: 50 },
      xssAttempts: { warning: 5, critical: 20 },
      authFailures: { warning: 20, critical: 100 },
      malwareDetections: { warning: 1, critical: 5 },
      suspiciousSessions: { warning: 5, critical: 15 }
    };
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start automated security monitoring
   */
  startMonitoring(intervalMs = 60000) { // Default: 1 minute
    if (this.isMonitoring) {
      console.log('Security monitoring is already running');
      return;
    }

    console.log('🔍 Starting security monitoring service...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectSecurityMetrics();
        await this.analyzeSecurityTrends();
        await this.checkAlertThresholds();
      } catch (error) {
        console.error('Security monitoring error:', error);
        this.emit('monitoring-error', error);
      }
    }, intervalMs);

    this.emit('monitoring-started');
    console.log('✅ Security monitoring service started');
  }

  /**
   * Stop automated security monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping security monitoring service...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.emit('monitoring-stopped');
    console.log('✅ Security monitoring service stopped');
  }

  /**
   * Collect security metrics from various sources
   */
  async collectSecurityMetrics() {
    const now = new Date();
    const timeWindow = 3600000; // 1 hour
    const windowStart = new Date(now.getTime() - timeWindow);

    try {
      // Collect metrics from security events
      const metrics = await this.querySecurityEvents(windowStart, now);

      // Store metrics with timestamp
      const timestamp = now.toISOString();
      this.metrics.set(timestamp, {
        ...metrics,
        timestamp,
        collectedAt: now
      });

      // Keep only last 24 hours of metrics
      this.cleanupOldMetrics();

      this.emit('metrics-collected', metrics);
      return metrics;

    } catch (error) {
      console.error('Failed to collect security metrics:', error);
      throw error;
    }
  }

  /**
   * Query security events from database
   */
  async querySecurityEvents(startTime, endTime) {
    // Mock implementation - in real system, this would query the database
    const mockMetrics = {
      rateLimitViolations: Math.floor(Math.random() * 20),
      xssAttempts: Math.floor(Math.random() * 10),
      authenticationFailures: Math.floor(Math.random() * 30),
      malwareDetections: Math.floor(Math.random() * 3),
      suspiciousSessions: Math.floor(Math.random() * 8),
      fileUploadBlocks: Math.floor(Math.random() * 5),
      tokenBlacklistings: Math.floor(Math.random() * 4),
      cspViolations: Math.floor(Math.random() * 15),
      accountLockouts: Math.floor(Math.random() * 6),
      sessionTerminations: Math.floor(Math.random() * 12)
    };

    // In real implementation, this would be:
    /*
    const supabase = require('../supabase');

    const { data: events, error } = await supabase
      .from('security_events')
      .select('type, severity, created_at')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (error) throw error;

    // Aggregate events by type
    const metrics = {};
    events.forEach(event => {
      metrics[event.type] = (metrics[event.type] || 0) + 1;
    });
    */

    return mockMetrics;
  }

  /**
   * Analyze security trends and patterns
   */
  async analyzeSecurityTrends() {
    const recentMetrics = Array.from(this.metrics.values())
      .slice(-24) // Last 24 data points
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (recentMetrics.length < 2) {
      return null;
    }

    const trends = {};
    const metricKeys = Object.keys(recentMetrics[0]).filter(key =>
      key !== 'timestamp' && key !== 'collectedAt'
    );

    metricKeys.forEach(key => {
      const values = recentMetrics.map(m => m[key] || 0);
      const recent = values.slice(-6); // Last 6 data points
      const previous = values.slice(-12, -6); // Previous 6 data points

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.length > 0
        ? previous.reduce((a, b) => a + b, 0) / previous.length
        : 0;

      const changePercent = previousAvg > 0
        ? ((recentAvg - previousAvg) / previousAvg) * 100
        : 0;

      trends[key] = {
        current: recentAvg,
        previous: previousAvg,
        changePercent: Math.round(changePercent * 100) / 100,
        trend: changePercent > 10 ? 'increasing' :
               changePercent < -10 ? 'decreasing' : 'stable'
      };
    });

    this.emit('trends-analyzed', trends);
    return trends;
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  async checkAlertThresholds() {
    const latestMetrics = Array.from(this.metrics.values()).pop();
    if (!latestMetrics) return;

    const newAlerts = [];

    Object.entries(this.thresholds).forEach(([metric, thresholds]) => {
      const value = latestMetrics[metric] || 0;

      if (value >= thresholds.critical) {
        newAlerts.push({
          id: `${metric}-${Date.now()}`,
          type: 'critical',
          metric,
          value,
          threshold: thresholds.critical,
          message: `Critical: ${metric} exceeded threshold (${value} >= ${thresholds.critical})`,
          timestamp: new Date().toISOString()
        });
      } else if (value >= thresholds.warning) {
        newAlerts.push({
          id: `${metric}-${Date.now()}`,
          type: 'warning',
          metric,
          value,
          threshold: thresholds.warning,
          message: `Warning: ${metric} approaching threshold (${value} >= ${thresholds.warning})`,
          timestamp: new Date().toISOString()
        });
      }
    });

    if (newAlerts.length > 0) {
      this.alerts.push(...newAlerts);

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }

      newAlerts.forEach(alert => {
        this.emit('security-alert', alert);
        console.warn(`🚨 Security Alert: ${alert.message}`);
      });
    }
  }

  /**
   * Get real-time security dashboard data
   */
  getDashboardData() {
    const latestMetrics = Array.from(this.metrics.values()).pop();
    const recentAlerts = this.alerts.slice(-10);

    return {
      status: this.isMonitoring ? 'active' : 'inactive',
      lastUpdate: latestMetrics?.timestamp || null,
      metrics: latestMetrics || {},
      alerts: recentAlerts,
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.type === 'critical').length,
        warningAlerts: this.alerts.filter(a => a.type === 'warning').length,
        metricsCollected: this.metrics.size
      }
    };
  }

  /**
   * Get security metrics for a specific time range
   */
  getMetricsForTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return Array.from(this.metrics.values())
      .filter(metric => {
        const metricTime = new Date(metric.timestamp);
        return metricTime >= start && metricTime <= end;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Get security alerts for a specific time range
   */
  getAlertsForTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.alerts
      .filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime >= start && alertTime <= end;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholds-updated', this.thresholds);
    console.log('Security monitoring thresholds updated');
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [timestamp, metric] of this.metrics.entries()) {
      if (new Date(timestamp) < cutoff) {
        this.metrics.delete(timestamp);
      }
    }
  }

  /**
   * Generate security monitoring report
   */
  generateReport(timeRange = '24h') {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const metrics = this.getMetricsForTimeRange(startTime, now);
    const alerts = this.getAlertsForTimeRange(startTime, now);

    // Calculate aggregated statistics
    const aggregatedMetrics = {};
    if (metrics.length > 0) {
      const metricKeys = Object.keys(metrics[0]).filter(key =>
        key !== 'timestamp' && key !== 'collectedAt'
      );

      metricKeys.forEach(key => {
        const values = metrics.map(m => m[key] || 0);
        aggregatedMetrics[key] = {
          total: values.reduce((a, b) => a + b, 0),
          average: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values)
        };
      });
    }

    return {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      metricsCount: metrics.length,
      alertsCount: alerts.length,
      aggregatedMetrics,
      alerts: alerts.slice(0, 20), // Top 20 alerts
      summary: {
        criticalAlerts: alerts.filter(a => a.type === 'critical').length,
        warningAlerts: alerts.filter(a => a.type === 'warning').length,
        mostFrequentAlert: this.getMostFrequentAlertType(alerts),
        securityScore: this.calculateSecurityScore(aggregatedMetrics, alerts)
      }
    };
  }

  /**
   * Get most frequent alert type
   */
  getMostFrequentAlertType(alerts) {
    const alertCounts = {};
    alerts.forEach(alert => {
      alertCounts[alert.metric] = (alertCounts[alert.metric] || 0) + 1;
    });

    return Object.entries(alertCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  }

  /**
   * Calculate security score based on metrics and alerts
   */
  calculateSecurityScore(metrics, alerts) {
    let score = 100;

    // Deduct points for alerts
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = alerts.filter(a => a.type === 'warning').length;

    score -= criticalAlerts * 10;
    score -= warningAlerts * 5;

    // Deduct points for high metric values
    Object.entries(metrics).forEach(([key, stats]) => {
      const threshold = this.thresholds[key];
      if (threshold && stats.max >= threshold.critical) {
        score -= 15;
      } else if (threshold && stats.max >= threshold.warning) {
        score -= 5;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Export monitoring data for external analysis
   */
  exportData(format = 'json') {
    const data = {
      metrics: Array.from(this.metrics.values()),
      alerts: this.alerts,
      thresholds: this.thresholds,
      exportedAt: new Date().toISOString()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        return data;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion for metrics
    if (data.metrics.length === 0) return '';

    const headers = Object.keys(data.metrics[0]);
    const csvRows = [headers.join(',')];

    data.metrics.forEach(metric => {
      const row = headers.map(header => metric[header] || '').join(',');
      csvRows.push(row);
    });

    return csvRows.join('\n');
  }
}

// Singleton instance
let securityMonitoringInstance = null;

/**
 * Get singleton instance of SecurityMonitoringService
 */
function getSecurityMonitoring() {
  if (!securityMonitoringInstance) {
    securityMonitoringInstance = new SecurityMonitoringService();
  }
  return securityMonitoringInstance;
}

module.exports = {
  SecurityMonitoringService,
  getSecurityMonitoring
};
