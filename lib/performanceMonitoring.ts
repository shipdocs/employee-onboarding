/**
 * Performance Monitoring System
 * Tracks and analyzes application performance metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceBaseline {
  metric: string;
  p50: number;
  p95: number;
  p99: number;
  average: number;
  samples: number;
  lastUpdated: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private thresholds: Map<string, { warning: number; critical: number }> = new Map();

  constructor() {
    this.setupDefaultThresholds();
    this.startPeriodicCleanup();
  }

  /**
   * Setup default performance thresholds
   */
  private setupDefaultThresholds(): void {
    this.thresholds.set('api_response_time', { warning: 500, critical: 1000 });
    this.thresholds.set('database_query_time', { warning: 100, critical: 500 });
    this.thresholds.set('page_load_time', { warning: 2000, critical: 5000 });
    this.thresholds.set('memory_usage', { warning: 80, critical: 95 });
    this.thresholds.set('cpu_usage', { warning: 70, critical: 90 });
    this.thresholds.set('error_rate', { warning: 1, critical: 5 });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    this.updateBaseline(metric);
    this.checkThresholds(metric);

    // Keep only last 10000 metrics to prevent memory issues
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * Update performance baseline for a metric
   */
  private updateBaseline(metric: PerformanceMetric): void {
    const key = `${metric.name}_${metric.unit}`;
    const recentMetrics = this.getRecentMetrics(metric.name, 24 * 60 * 60 * 1000); // Last 24 hours

    if (recentMetrics.length === 0) return;

    const values = recentMetrics.map(m => m.value).sort((a, b) => a - b);
    const p50Index = Math.floor(values.length * 0.5);
    const p95Index = Math.floor(values.length * 0.95);
    const p99Index = Math.floor(values.length * 0.99);

    const baseline: PerformanceBaseline = {
      metric: metric.name,
      p50: values[p50Index] || 0,
      p95: values[p95Index] || 0,
      p99: values[p99Index] || 0,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      samples: values.length,
      lastUpdated: new Date()
    };

    this.baselines.set(key, baseline);
  }

  /**
   * Check if metric exceeds thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    let severity: 'low' | 'medium' | 'high' | 'critical' | null = null;

    if (metric.value >= threshold.critical) {
      severity = 'critical';
    } else if (metric.value >= threshold.warning) {
      severity = 'high';
    }

    if (severity) {
      this.createAlert({
        metric: metric.name,
        threshold: severity === 'critical' ? threshold.critical : threshold.warning,
        currentValue: metric.value,
        severity
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: `perf_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Log critical alerts immediately
    if (alert.severity === 'critical') {
      // console.error(`[CRITICAL PERFORMANCE ALERT] ${alert.metric}: ${alert.currentValue} exceeds ${alert.threshold}`, alert);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendAlertToMonitoringService(alert);
    }
  }

  /**
   * Get recent metrics for a specific metric name
   */
  private getRecentMetrics(name: string, timeWindowMs: number): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(
      metric => metric.name === name && metric.timestamp.getTime() > cutoff
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalMetrics: number;
    metricsByName: Record<string, number>;
    activeAlerts: number;
    criticalAlerts: number;
    baselines: PerformanceBaseline[];
    recentPerformance: {
      apiResponseTime: number;
      databaseQueryTime: number;
      pageLoadTime: number;
    };
  } {
    const metricsByName: Record<string, number> = {};
    this.metrics.forEach(metric => {
      metricsByName[metric.name] = (metricsByName[metric.name] || 0) + 1;
    });

    const activeAlerts = this.alerts.filter(a => !a.resolved).length;
    const criticalAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'critical').length;

    // Calculate recent performance averages
    const recentApiMetrics = this.getRecentMetrics('api_response_time', 60 * 60 * 1000); // Last hour
    const recentDbMetrics = this.getRecentMetrics('database_query_time', 60 * 60 * 1000);
    const recentPageMetrics = this.getRecentMetrics('page_load_time', 60 * 60 * 1000);

    const avgApiTime = recentApiMetrics.length > 0
      ? recentApiMetrics.reduce((sum, m) => sum + m.value, 0) / recentApiMetrics.length
      : 0;
    const avgDbTime = recentDbMetrics.length > 0
      ? recentDbMetrics.reduce((sum, m) => sum + m.value, 0) / recentDbMetrics.length
      : 0;
    const avgPageTime = recentPageMetrics.length > 0
      ? recentPageMetrics.reduce((sum, m) => sum + m.value, 0) / recentPageMetrics.length
      : 0;

    return {
      totalMetrics: this.metrics.length,
      metricsByName,
      activeAlerts,
      criticalAlerts,
      baselines: Array.from(this.baselines.values()),
      recentPerformance: {
        apiResponseTime: avgApiTime,
        databaseQueryTime: avgDbTime,
        pageLoadTime: avgPageTime
      }
    };
  }

  /**
   * Get performance baseline for a metric
   */
  getBaseline(metricName: string, unit: string = 'ms'): PerformanceBaseline | null {
    return this.baselines.get(`${metricName}_${unit}`) || null;
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve a performance alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Set custom threshold for a metric
   */
  setThreshold(metricName: string, warning: number, critical: number): void {
    this.thresholds.set(metricName, { warning, critical });
  }

  /**
   * Send alert to external monitoring service
   */
  private async sendAlertToMonitoringService(alert: PerformanceAlert): Promise<void> {
    try {
      // Implementation would depend on monitoring service (e.g., Datadog, New Relic, etc.)

    } catch (error) {
      // console.error('Failed to send performance alert to monitoring service:', error);
    }
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Clean up old metrics and alerts
   */
  private cleanup(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

    this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoff);
    this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > cutoff);
  }

  /**
   * Export performance data for analysis
   */
  exportData(timeRange?: { start: Date; end: Date }): {
    metrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    baselines: PerformanceBaseline[];
  } {
    let filteredMetrics = this.metrics;
    let filteredAlerts = this.alerts;

    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
      filteredAlerts = this.alerts.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    return {
      metrics: filteredMetrics,
      alerts: filteredAlerts,
      baselines: Array.from(this.baselines.values())
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common performance measurements
export const measureApiPerformance = (endpoint: string) => {
  const start = Date.now();

  return {
    end: (statusCode?: number) => {
      const duration = Date.now() - start;
      performanceMonitor.recordMetric('api_response_time', duration, 'ms', {
        endpoint,
        status: statusCode?.toString() || 'unknown'
      });
      return duration;
    }
  };
};

export const measureDatabasePerformance = (query: string) => {
  const start = Date.now();

  return {
    end: () => {
      const duration = Date.now() - start;
      performanceMonitor.recordMetric('database_query_time', duration, 'ms', {
        query: query.substring(0, 50) // Truncate for privacy
      });
      return duration;
    }
  };
};

export const measurePageLoadPerformance = (page: string, loadTime: number) => {
  performanceMonitor.recordMetric('page_load_time', loadTime, 'ms', { page });
};

export const recordMemoryUsage = (usage: number) => {
  performanceMonitor.recordMetric('memory_usage', usage, '%');
};

export const recordCpuUsage = (usage: number) => {
  performanceMonitor.recordMetric('cpu_usage', usage, '%');
};

export const recordErrorRate = (rate: number) => {
  performanceMonitor.recordMetric('error_rate', rate, '%');
};

export default PerformanceMonitor;
