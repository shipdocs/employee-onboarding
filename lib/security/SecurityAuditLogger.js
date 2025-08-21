/**
 * Security Audit Logger
 * Comprehensive security event logging system for monitoring and investigation
 */

const db = require('../database-direct');
const configManager = require('./SecureConfigManager');

class SecurityAuditLogger {
  constructor() {
    this.eventBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.isFlushingBuffer = false;

    // Event type classifications
    this.eventTypes = {
      // Authentication Events
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILURE: 'login_failure',
      LOGOUT: 'logout',
      TOKEN_REFRESH: 'token_refresh',
      TOKEN_BLACKLIST: 'token_blacklist',
      PASSWORD_CHANGE: 'password_change',
      MFA_SETUP: 'mfa_setup',
      MFA_VERIFICATION: 'mfa_verification',

      // Authorization Events
      ACCESS_DENIED: 'access_denied',
      PRIVILEGE_ESCALATION: 'privilege_escalation',
      UNAUTHORIZED_ACCESS: 'unauthorized_access',

      // Security Violations
      XSS_ATTEMPT: 'xss_attempt',
      SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
      RATE_LIMIT_VIOLATION: 'rate_limit_violation',
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      MALICIOUS_FILE_UPLOAD: 'malicious_file_upload',

      // Configuration Events
      CONFIG_ACCESS: 'config_access',
      CONFIG_CHANGE: 'config_change',
      CONFIG_VALIDATION_ERROR: 'config_validation_error',

      // System Events
      SYSTEM_ERROR: 'system_error',
      SECURITY_SCAN: 'security_scan',
      AUDIT_LOG_ACCESS: 'audit_log_access',

      // Data Events
      DATA_EXPORT: 'data_export',
      DATA_DELETION: 'data_deletion',
      SENSITIVE_DATA_ACCESS: 'sensitive_data_access'
    };

    // Severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };

    // Threat categories
    this.threatCategories = {
      AUTHENTICATION_BYPASS: 'authentication_bypass',
      AUTHORIZATION_BYPASS: 'authorization_bypass',
      DATA_BREACH: 'data_breach',
      INJECTION_ATTACK: 'injection_attack',
      XSS_ATTACK: 'xss_attack',
      BRUTE_FORCE: 'brute_force',
      ACCOUNT_TAKEOVER: 'account_takeover',
      PRIVILEGE_ESCALATION: 'privilege_escalation',
      MALWARE: 'malware',
      SUSPICIOUS_BEHAVIOR: 'suspicious_behavior',
      CONFIGURATION_TAMPERING: 'configuration_tampering',
      INFORMATION_DISCLOSURE: 'information_disclosure'
    };

    // Start buffer flushing
    this.startBufferFlushing();
  }

  /**
   * Redact IP address for privacy compliance
   * Masks the last octet for IPv4 and last 64 bits for IPv6
   */
  redactIP(ipAddress) {
    if (!ipAddress) return null;

    // IPv4 redaction - mask last octet
    if (ipAddress.includes('.') && !ipAddress.includes(':')) {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }

    // IPv6 redaction - mask last 64 bits
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
      }
    }

    // Fallback - hash the IP
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 8);
  }

  /**
   * Redact user agent for privacy compliance
   * Keeps browser and OS info but removes detailed version numbers
   */
  redactUserAgent(userAgent) {
    if (!userAgent) return null;

    // Extract basic browser and OS info, remove detailed versions
    const simplified = userAgent
      .replace(/\d+\.\d+\.\d+\.\d+/g, 'x.x.x.x') // Remove version numbers
      .replace(/\b\d{2,}\b/g, 'xx') // Remove build numbers
      .substring(0, 200); // Limit length

    return simplified;
  }

  /**
   * Redact sensitive content for logging
   * Truncates content and removes potential PII
   */
  redactContent(content, maxLength = 100) {
    if (!content) return null;

    const truncated = String(content).substring(0, maxLength);

    // Remove potential PII patterns
    return truncated
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]');
  }

  /**
   * Log a security event
   */
  async logEvent(eventData) {
    try {
      const event = this.normalizeEvent(eventData);

      // Add to buffer for batch processing
      this.eventBuffer.push(event);

      // Flush buffer if it's getting full
      if (this.eventBuffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }

      // For critical events, flush immediately
      if (event.severity === this.severityLevels.CRITICAL) {
        await this.flushBuffer();
      }

      // Log to console in development
      if (configManager.getEnvironment().isDevelopment) {
        this.logToConsole(event);
      }

      return { success: true, eventId: event.event_id };
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to log security event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Normalize and validate event data
   */
  normalizeEvent(eventData) {
    const now = new Date().toISOString();
    const eventId = this.generateEventId(eventData.type);

    return {
      event_id: eventId,
      type: eventData.type || this.eventTypes.SYSTEM_ERROR,
      severity: eventData.severity || this.severityLevels.MEDIUM,
      user_id: eventData.userId || null,
      ip_address: eventData.ipAddress || null,
      user_agent: eventData.userAgent || null,
      details: {
        ...eventData.details,
        timestamp: now,
        source: eventData.source || 'security_audit_logger',
        environment: configManager.getEnvironment().node
      },
      threats: Array.isArray(eventData.threats) ? eventData.threats : [],
      created_at: now
    };
  }

  /**
   * Generate unique event ID
   */
  generateEventId(type) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const random = crypto.randomBytes(9).toString('hex');
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Log authentication events
   */
  async logAuthentication(type, userId, success, details = {}, req = null) {
    return await this.logEvent({
      type: type,
      severity: success ? this.severityLevels.LOW : this.severityLevels.MEDIUM,
      userId: userId,
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      details: {
        success,
        ...details
      },
      threats: success ? [] : [this.threatCategories.AUTHENTICATION_BYPASS]
    });
  }

  /**
   * Log authorization failures
   */
  async logAuthorizationFailure(userId, requiredRole, actualRole, resource = null, req = null) {
    return await this.logEvent({
      type: this.eventTypes.ACCESS_DENIED,
      severity: this.severityLevels.MEDIUM,
      userId: userId,
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      details: {
        required_role: requiredRole,
        actual_role: actualRole,
        resource: resource,
        access_denied: true
      },
      threats: [this.threatCategories.AUTHORIZATION_BYPASS]
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(type, severity, details = {}, req = null) {
    const threatMap = {
      [this.eventTypes.XSS_ATTEMPT]: [this.threatCategories.XSS_ATTACK],
      [this.eventTypes.SQL_INJECTION_ATTEMPT]: [this.threatCategories.INJECTION_ATTACK],
      [this.eventTypes.RATE_LIMIT_VIOLATION]: [this.threatCategories.BRUTE_FORCE],
      [this.eventTypes.MALICIOUS_FILE_UPLOAD]: [this.threatCategories.MALWARE],
      [this.eventTypes.SUSPICIOUS_ACTIVITY]: [this.threatCategories.SUSPICIOUS_BEHAVIOR]
    };

    return await this.logEvent({
      type: type,
      severity: severity,
      userId: details.userId || null,
      ipAddress: this.redactIP(req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress),
      userAgent: this.redactUserAgent(req?.headers?.['user-agent']),
      details: details,
      threats: threatMap[type] || [this.threatCategories.SUSPICIOUS_BEHAVIOR]
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(type, userId, dataType, recordCount = null, details = {}, req = null) {
    const severity = dataType === 'sensitive' ? this.severityLevels.MEDIUM : this.severityLevels.LOW;
    const threats = dataType === 'sensitive' ? [this.threatCategories.INFORMATION_DISCLOSURE] : [];

    return await this.logEvent({
      type: type,
      severity: severity,
      userId: userId,
      ipAddress: this.redactIP(req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress),
      userAgent: this.redactUserAgent(req?.headers?.['user-agent']),
      details: {
        data_type: dataType,
        record_count: recordCount,
        ...details
      },
      threats: threats
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(type, severity, details = {}) {
    return await this.logEvent({
      type: type,
      severity: severity,
      details: {
        system_event: true,
        ...details
      },
      threats: []
    });
  }

  /**
   * Flush event buffer to database
   */
  async flushBuffer() {
    if (this.isFlushingBuffer || this.eventBuffer.length === 0) {
      return;
    }

    this.isFlushingBuffer = true;
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Convert events to proper format for direct SQL insert
      const columns = ['event_id', 'type', 'severity', 'user_id', 'ip_address', 'user_agent', 'details', 'threats', 'created_at'];
      const values = eventsToFlush.map(event => [
        event.event_id,
        event.type,
        event.severity,
        event.user_id,
        event.ip_address,
        event.user_agent,
        JSON.stringify(event.details),
        JSON.stringify(event.threats),
        event.created_at
      ]);

      // Build bulk insert query
      const placeholders = values.map((_, i) =>
        `($${i * columns.length + 1}, $${i * columns.length + 2}, $${i * columns.length + 3}, $${i * columns.length + 4}, $${i * columns.length + 5}, $${i * columns.length + 6}, $${i * columns.length + 7}, $${i * columns.length + 8}, $${i * columns.length + 9})`
      ).join(', ');

      const query = `
        INSERT INTO security_events (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
      `;

      const flatValues = values.flat();
      await db.query(query, flatValues);

      console.log(`🔒 [SECURITY-AUDIT] Flushed ${eventsToFlush.length} events to database`);
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to flush events to database:', error);
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Buffer flush error:', error);
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    } finally {
      this.isFlushingBuffer = false;
    }
  }

  /**
   * Start automatic buffer flushing
   */
  startBufferFlushing() {
    setInterval(async () => {
      await this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Log to console for development
   */
  logToConsole(event) {
    const severityIcons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    const icon = severityIcons[event.severity] || '⚪';
    console.log(`🔒 [SECURITY-AUDIT] ${icon} ${event.type} (${event.severity})`);

    if (event.user_id) {
      console.log(`🔒 [SECURITY-AUDIT]   User: ${event.user_id}`);
    }

    if (event.ip_address) {
      console.log(`🔒 [SECURITY-AUDIT]   IP: ${event.ip_address}`);
    }

    if (event.threats.length > 0) {
      console.log(`🔒 [SECURITY-AUDIT]   Threats: ${event.threats.join(', ')}`);
    }

    if (event.details && Object.keys(event.details).length > 0) {
      console.log(`🔒 [SECURITY-AUDIT]   Details: ${JSON.stringify(event.details, null, 2)}`);
    }
  }

  /**
   * Query security events
   */
  async queryEvents(filters = {}) {
    try {
      let query = 'SELECT * FROM security_events';
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (filters.severity) {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(filters.severity);
      }

      if (filters.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(filters.userId);
      }

      if (filters.ipAddress) {
        conditions.push(`ip_address = $${params.length + 1}`);
        params.push(filters.ipAddress);
      }

      if (filters.since) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(filters.since);
      }

      if (filters.until) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(filters.until);
      }

      if (filters.threats && filters.threats.length > 0) {
        conditions.push(`threats && $${params.length + 1}`);
        params.push(filters.threats);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }

      const result = await db.query(query, params);
      return { success: true, events: result.rows || [] };
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to query events:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security event statistics
   */
  async getStatistics(timeframe = '24h') {
    try {
      const since = new Date();
      switch (timeframe) {
        case '1h':
          since.setHours(since.getHours() - 1);
          break;
        case '24h':
          since.setDate(since.getDate() - 1);
          break;
        case '7d':
          since.setDate(since.getDate() - 7);
          break;
        case '30d':
          since.setDate(since.getDate() - 30);
          break;
        default:
          since.setDate(since.getDate() - 1);
      }

      const query = `
        SELECT type, severity, threats
        FROM security_events
        WHERE created_at >= $1
      `;
      const result = await db.query(query, [since.toISOString()]);
      const data = result.rows;

      const stats = {
        total: data.length,
        by_severity: {},
        by_type: {},
        by_threat: {},
        timeframe: timeframe
      };

      data.forEach(event => {
        // Count by severity
        stats.by_severity[event.severity] = (stats.by_severity[event.severity] || 0) + 1;

        // Count by type
        stats.by_type[event.type] = (stats.by_type[event.type] || 0) + 1;

        // Count by threat
        if (event.threats && Array.isArray(event.threats)) {
          event.threats.forEach(threat => {
            stats.by_threat[threat] = (stats.by_threat[threat] || 0) + 1;
          });
        }
      });

      return { success: true, statistics: stats };
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to get statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security alerts (high and critical events)
   */
  async getSecurityAlerts(limit = 50) {
    try {
      const query = `
        SELECT * FROM security_events
        WHERE severity IN ('high', 'critical')
        ORDER BY created_at DESC
        LIMIT $1
      `;
      const result = await db.query(query, [limit]);

      return { success: true, alerts: result.rows || [] };
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to get security alerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old security events
   */
  async cleanupOldEvents(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = `
        DELETE FROM security_events
        WHERE created_at < $1
      `;
      await db.query(query, [cutoffDate.toISOString()]);

      console.log(`🔒 [SECURITY-AUDIT] Cleaned up security events older than ${retentionDays} days`);
      return { success: true };
    } catch (error) {
      console.error('🔒 [SECURITY-AUDIT] Failed to cleanup old events:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const securityAuditLogger = new SecurityAuditLogger();

module.exports = securityAuditLogger;
