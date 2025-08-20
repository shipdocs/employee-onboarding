/**
 * Configuration Audit Logger
 * Logs configuration access and changes for security auditing
 */

const { supabase } = require('../supabase');

class ConfigurationAuditLogger {
  constructor() {
    this.auditLog = [];
    this.maxLogSize = 1000;
    this.sensitiveKeys = new Set([
      'JWT_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY',
      'MAILERSEND_API_KEY',
      'MFA_ENCRYPTION_KEY',
      'API_KEY_ENCRYPTION_SECRET',
      'CRON_SECRET',
      'PAGERDUTY_WEBHOOK_SECRET',
      'SMTP_PASS',
      'REDIS_URL',
      'VERCEL_ACCESS_TOKEN'
    ]);
  }

  /**
   * Log configuration access
   */
  logAccess(key, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'config_access',
      key: key,
      sensitive: this.sensitiveKeys.has(key),
      context: {
        file: context.file || 'unknown',
        function: context.function || 'unknown',
        line: context.line || 'unknown',
        userId: context.userId || null,
        ip: context.ip || null,
        userAgent: context.userAgent || null
      }
    };

    this.addToLog(logEntry);

    // Log sensitive access to database
    if (this.sensitiveKeys.has(key)) {
      this.logSensitiveAccess(logEntry);
    }
  }

  /**
   * Log configuration validation errors
   */
  logValidationError(key, error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'config_validation_error',
      key: key,
      error: error,
      sensitive: this.sensitiveKeys.has(key),
      context
    };

    this.addToLog(logEntry);
    this.logSecurityEvent(logEntry);
  }

  /**
   * Log configuration initialization
   */
  logInitialization(result, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'config_initialization',
      success: result.success,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
      context
    };

    this.addToLog(logEntry);

    // Log initialization failures as security events
    if (!result.success) {
      this.logSecurityEvent({
        ...logEntry,
        severity: 'high',
        threat: 'configuration_failure'
      });
    }
  }

  /**
   * Log configuration health check
   */
  logHealthCheck(health, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'config_health_check',
      status: health.status,
      configCount: health.configCount,
      errorCount: health.validationErrors?.length || 0,
      context
    };

    this.addToLog(logEntry);

    // Log unhealthy status as security event
    if (health.status === 'unhealthy') {
      this.logSecurityEvent({
        ...logEntry,
        severity: 'medium',
        threat: 'configuration_degradation'
      });
    }
  }

  /**
   * Log runtime configuration changes
   */
  logRuntimeChange(key, oldValue, newValue, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'config_runtime_change',
      key: key,
      sensitive: this.sensitiveKeys.has(key),
      hasOldValue: !!oldValue,
      hasNewValue: !!newValue,
      context
    };

    this.addToLog(logEntry);

    // Always log runtime configuration changes as security events
    this.logSecurityEvent({
      ...logEntry,
      severity: this.sensitiveKeys.has(key) ? 'high' : 'medium',
      threat: 'configuration_modification'
    });
  }

  /**
   * Add entry to in-memory log
   */
  addToLog(entry) {
    this.auditLog.push(entry);

    // Maintain log size limit
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }
  }

  /**
   * Log sensitive configuration access to database
   */
  async logSensitiveAccess(entry) {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_id: `config_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'sensitive_config_access',
          severity: 'low',
          user_id: entry.context.userId,
          ip_address: entry.context.ip,
          user_agent: entry.context.userAgent,
          details: {
            config_key: entry.key,
            access_context: {
              file: entry.context.file,
              function: entry.context.function,
              line: entry.context.line
            },
            timestamp: entry.timestamp
          },
          threats: ['information_disclosure']
        });
    } catch (error) {
      console.error('Failed to log sensitive config access:', error);
    }
  }

  /**
   * Log security events to database
   */
  async logSecurityEvent(entry) {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_id: `config_${entry.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: entry.type,
          severity: entry.severity || 'medium',
          user_id: entry.context?.userId,
          ip_address: entry.context?.ip,
          user_agent: entry.context?.userAgent,
          details: {
            config_key: entry.key,
            error: entry.error,
            success: entry.success,
            status: entry.status,
            context: entry.context,
            timestamp: entry.timestamp
          },
          threats: entry.threat ? [entry.threat] : ['configuration_security']
        });
    } catch (error) {
      console.error('Failed to log configuration security event:', error);
    }
  }

  /**
   * Log to console for development
   */
  logToConsole(entry) {
    const icon = this.getLogIcon(entry.type);
    const sensitiveFlag = entry.sensitive ? ' [SENSITIVE]' : '';

    console.log(`🔧 [CONFIG-AUDIT] ${icon} ${entry.type}${sensitiveFlag}: ${entry.key || 'N/A'}`);

    if (entry.error) {
      console.log(`🔧 [CONFIG-AUDIT]   Error: ${entry.error}`);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(`🔧 [CONFIG-AUDIT]   Context: ${JSON.stringify(entry.context)}`);
    }
  }

  /**
   * Get appropriate icon for log type
   */
  getLogIcon(type) {
    const icons = {
      config_access: '👁️',
      config_validation_error: '❌',
      config_initialization: '🚀',
      config_health_check: '🏥',
      config_runtime_change: '🔄'
    };

    return icons[type] || '📝';
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter = {}) {
    let filteredLog = [...this.auditLog];

    if (filter.type) {
      filteredLog = filteredLog.filter(entry => entry.type === filter.type);
    }

    if (filter.key) {
      filteredLog = filteredLog.filter(entry => entry.key === filter.key);
    }

    if (filter.sensitive !== undefined) {
      filteredLog = filteredLog.filter(entry => entry.sensitive === filter.sensitive);
    }

    if (filter.since) {
      const sinceDate = new Date(filter.since);
      filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) >= sinceDate);
    }

    return filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics() {
    const stats = {
      totalEntries: this.auditLog.length,
      byType: {},
      sensitiveAccess: 0,
      errors: 0,
      lastHour: 0
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.auditLog.forEach(entry => {
      // Count by type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

      // Count sensitive access
      if (entry.sensitive) {
        stats.sensitiveAccess++;
      }

      // Count errors
      if (entry.error || entry.type.includes('error')) {
        stats.errors++;
      }

      // Count last hour
      if (new Date(entry.timestamp) >= oneHourAgo) {
        stats.lastHour++;
      }
    });

    return stats;
  }

  /**
   * Clear audit log (admin function)
   */
  clearAuditLog() {
    const clearedCount = this.auditLog.length;
    this.auditLog = [];

    console.log(`🔧 [CONFIG-AUDIT] Cleared ${clearedCount} audit log entries`);

    return { cleared: clearedCount };
  }

  /**
   * Export audit log for analysis
   */
  exportAuditLog(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      entries: this.auditLog,
      statistics: this.getAuditStatistics()
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'type', 'key', 'sensitive', 'error', 'context'];
      const rows = this.auditLog.map(entry => [
        entry.timestamp,
        entry.type,
        entry.key || '',
        entry.sensitive || false,
        entry.error || '',
        JSON.stringify(entry.context || {})
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return exportData;
  }
}

// Create singleton instance
const configAuditLogger = new ConfigurationAuditLogger();

module.exports = configAuditLogger;
