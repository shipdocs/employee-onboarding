/**
 * External Logging Service
 * Sends logs to external services like Grafana Cloud while maintaining existing logging
 * Configurable via admin settings, with encryption and rate limiting
 */

const { createLogger, format, transports } = require('winston');
const LokiTransport = require('winston-loki');
const crypto = require('crypto');
const db = require('../database-direct');

class ExternalLoggingService {
  constructor() {
    this.logger = null;
    this.config = null;
    this.rateLimiter = {
      count: 0,
      lastReset: Date.now(),
      maxPerMinute: 100
    };
    this.batchQueue = [];
    this.batchTimer = null;
    this.isInitialized = false;
    
    // Encryption key from environment (should be 32 bytes)
    this.encryptionKey = process.env.EXTERNAL_LOG_ENCRYPTION_KEY || 
                        process.env.JWT_SECRET?.substring(0, 32) || 
                        'default-encryption-key-change-me';
  }

  /**
   * Initialize the external logging service
   */
  async initialize() {
    try {
      // Load configuration from database
      await this.loadConfiguration();
      
      if (this.config?.enabled) {
        await this.setupLogger();
        this.isInitialized = true;
        console.log('[ExternalLogging] Service initialized successfully');
      } else {
        console.log('[ExternalLogging] Service disabled in configuration');
      }
    } catch (error) {
      console.error('[ExternalLogging] Initialization failed:', error.message);
      // Don't throw - external logging should never break the main app
    }
  }

  /**
   * Load configuration from database
   */
  async loadConfiguration() {
    try {
      const result = await db.query(
        `SELECT * FROM external_logging_config WHERE provider = $1`,
        ['grafana_cloud']
      );
      
      if (result.rows.length > 0) {
        this.config = result.rows[0];
        
        // Decrypt API key if present
        if (this.config.api_key_encrypted) {
          this.config.api_key = this.decrypt(this.config.api_key_encrypted);
        }
        
        // Update rate limiter settings
        this.rateLimiter.maxPerMinute = this.config.max_logs_per_minute || 100;
      }
    } catch (error) {
      console.error('[ExternalLogging] Failed to load configuration:', error);
    }
  }

  /**
   * Setup Winston logger with Loki transport for Grafana Cloud
   */
  async setupLogger() {
    if (!this.config.endpoint_url || !this.config.api_key) {
      throw new Error('Missing required configuration: endpoint_url or api_key');
    }

    // Create Loki transport for Grafana Cloud
    const lokiTransport = new LokiTransport({
      host: this.config.endpoint_url,
      labels: {
        app: 'maritime-onboarding',
        environment: process.env.NODE_ENV || 'production',
        version: process.env.APP_VERSION || '2.0.0'
      },
      json: true,
      basicAuth: `${this.config.api_user || ''}:${this.config.api_key}`,
      timeout: 30000,
      onConnectionError: (err) => this.handleConnectionError(err),
      // Batch settings from config
      batchSize: this.config.batch_size || 10,
      interval: this.config.flush_interval_ms || 5000,
      replaceTimestamp: true,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(info => {
          // Sanitize sensitive data before sending
          const sanitized = this.sanitizeLogData(info);
          return JSON.stringify(sanitized);
        })
      )
    });

    this.logger = createLogger({
      level: this.config.log_level || 'warn',
      transports: [lokiTransport]
    });
  }

  /**
   * Send log to external service
   */
  async log(level, message, metadata = {}) {
    // Check if service is enabled and initialized
    if (!this.isInitialized || !this.config?.enabled || !this.logger) {
      return;
    }

    // Apply rate limiting
    if (!this.checkRateLimit()) {
      return;
    }

    // Apply filters
    if (!this.shouldLog(level, message, metadata)) {
      return;
    }

    try {
      // Add to batch queue
      this.batchQueue.push({
        level,
        message,
        metadata: this.sanitizeLogData(metadata),
        timestamp: new Date().toISOString()
      });

      // Process batch if it reaches the configured size
      if (this.batchQueue.length >= (this.config.batch_size || 10)) {
        await this.processBatch();
      } else {
        // Schedule batch processing
        this.scheduleBatchProcessing();
      }

      // Update statistics
      await this.updateStatistics();
    } catch (error) {
      console.error('[ExternalLogging] Failed to send log:', error.message);
    }
  }

  /**
   * Process batched logs
   */
  async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Send all logs in batch
      for (const log of batch) {
        this.logger.log(log.level, log.message, log.metadata);
      }
    } catch (error) {
      console.error('[ExternalLogging] Batch processing failed:', error);
    }
  }

  /**
   * Schedule batch processing
   */
  scheduleBatchProcessing() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(async () => {
      await this.processBatch();
      this.batchTimer = null;
    }, this.config.flush_interval_ms || 5000);
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.rateLimiter.lastReset > 60000) {
      this.rateLimiter.count = 0;
      this.rateLimiter.lastReset = now;
    }

    // Check if under limit
    if (this.rateLimiter.count >= this.rateLimiter.maxPerMinute) {
      return false;
    }

    this.rateLimiter.count++;
    return true;
  }

  /**
   * Apply filters to determine if log should be sent
   */
  async shouldLog(level, message, metadata) {
    try {
      // Load filters from database
      const result = await db.query(
        `SELECT * FROM external_logging_filters 
         WHERE provider = $1 AND enabled = true`,
        ['grafana_cloud']
      );

      const filters = result.rows;
      
      // Check include filters first
      const includeFilters = filters.filter(f => f.filter_type === 'include');
      if (includeFilters.length > 0) {
        const shouldInclude = includeFilters.some(filter => 
          this.evaluateFilter(filter, { level, message, ...metadata })
        );
        if (!shouldInclude) return false;
      }

      // Check exclude filters
      const excludeFilters = filters.filter(f => f.filter_type === 'exclude');
      for (const filter of excludeFilters) {
        if (this.evaluateFilter(filter, { level, message, ...metadata })) {
          return false;
        }
      }

      // Check configuration flags
      if (metadata.type === 'security_event' && !this.config.include_security_events) {
        return false;
      }
      if (metadata.type === 'auth_event' && !this.config.include_auth_events) {
        return false;
      }
      if (level === 'error' && !this.config.include_error_logs) {
        return false;
      }
      if (metadata.type === 'audit' && !this.config.include_audit_logs) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ExternalLogging] Filter evaluation failed:', error);
      return true; // Default to logging on error
    }
  }

  /**
   * Evaluate a single filter rule
   */
  evaluateFilter(filter, data) {
    const value = data[filter.field_name];
    if (value === undefined) return false;

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).includes(filter.value);
      case 'regex':
        return new RegExp(filter.value).test(String(value));
      case 'greater_than':
        return Number(value) > Number(filter.value);
      default:
        return false;
    }
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  sanitizeLogData(data) {
    const sensitive = [
      'password', 'passwd', 'pwd',
      'token', 'jwt', 'bearer',
      'secret', 'key', 'api_key', 'apikey',
      'authorization', 'auth',
      'credit_card', 'cc_number', 'cvv',
      'ssn', 'social_security'
    ];

    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        
        // Check if key contains sensitive terms
        if (sensitive.some(term => lowerKey.includes(term))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          // Check for patterns that look like secrets
          if (obj[key].match(/^Bearer\s+/i)) {
            obj[key] = 'Bearer [REDACTED]';
          } else if (obj[key].match(/^[A-Za-z0-9+/]{40,}={0,2}$/)) {
            // Looks like base64 encoded secret
            obj[key] = '[REDACTED-BASE64]';
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Handle connection errors
   */
  async handleConnectionError(error) {
    console.error('[ExternalLogging] Connection error:', error.message);
    
    try {
      // Update last error in database
      await db.query(
        `UPDATE external_logging_config 
         SET last_connection_status = $1, 
             last_error_message = $2,
             last_connection_test = NOW()
         WHERE provider = $3`,
        ['failed', error.message, 'grafana_cloud']
      );
    } catch (dbError) {
      console.error('[ExternalLogging] Failed to update connection status:', dbError);
    }
  }

  /**
   * Update statistics
   */
  async updateStatistics() {
    try {
      await db.query(
        `UPDATE external_logging_config 
         SET logs_sent_today = logs_sent_today + 1,
             logs_sent_month = logs_sent_month + 1,
             last_log_sent_at = NOW()
         WHERE provider = $1`,
        ['grafana_cloud']
      );
    } catch (error) {
      // Silently fail - statistics are not critical
    }
  }

  /**
   * Test connection to external logging service
   */
  async testConnection() {
    try {
      await this.loadConfiguration();
      
      if (!this.config?.enabled) {
        return { success: false, message: 'External logging is disabled' };
      }

      // Send a test log
      await this.setupLogger();
      
      return new Promise((resolve) => {
        this.logger.info('Connection test', {
          test: true,
          timestamp: new Date().toISOString()
        }, (error) => {
          if (error) {
            resolve({ success: false, message: error.message });
          } else {
            // Update connection status
            db.query(
              `UPDATE external_logging_config 
               SET last_connection_status = $1,
                   last_connection_test = NOW()
               WHERE provider = $2`,
              ['success', 'grafana_cloud']
            );
            resolve({ success: true, message: 'Connection successful' });
          }
        });
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Update configuration
   */
  async updateConfiguration(config, userId) {
    try {
      // Encrypt API key if provided
      let encryptedApiKey = null;
      if (config.api_key) {
        encryptedApiKey = this.encrypt(config.api_key);
      }

      // Update configuration in database
      await db.query(
        `UPDATE external_logging_config 
         SET enabled = COALESCE($1, enabled),
             endpoint_url = COALESCE($2, endpoint_url),
             api_user = COALESCE($3, api_user),
             api_key_encrypted = COALESCE($4, api_key_encrypted),
             log_level = COALESCE($5, log_level),
             include_security_events = COALESCE($6, include_security_events),
             include_auth_events = COALESCE($7, include_auth_events),
             include_error_logs = COALESCE($8, include_error_logs),
             include_audit_logs = COALESCE($9, include_audit_logs),
             max_logs_per_minute = COALESCE($10, max_logs_per_minute),
             batch_size = COALESCE($11, batch_size),
             flush_interval_ms = COALESCE($12, flush_interval_ms),
             configured_by = $13,
             last_modified_at = NOW()
         WHERE provider = $14`,
        [
          config.enabled,
          config.endpoint_url,
          config.api_user,
          encryptedApiKey,
          config.log_level,
          config.include_security_events,
          config.include_auth_events,
          config.include_error_logs,
          config.include_audit_logs,
          config.max_logs_per_minute,
          config.batch_size,
          config.flush_interval_ms,
          userId,
          'grafana_cloud'
        ]
      );

      // Audit the change
      await db.query(
        `INSERT INTO external_logging_audit 
         (action, provider, changed_by, previous_config, new_config)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          config.enabled ? 'configured' : 'disabled',
          'grafana_cloud',
          userId,
          JSON.stringify(this.config),
          JSON.stringify(config)
        ]
      );

      // Reinitialize if configuration changed
      await this.initialize();

      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      console.error('[ExternalLogging] Failed to update configuration:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(text) {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.padEnd(32, '0').substring(0, 32)),
        iv
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('[ExternalLogging] Decryption failed:', error);
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event) {
    await this.log('warn', 'security_event', {
      type: 'security_event',
      event_id: event.event_id,
      severity: event.severity,
      threats: event.threats,
      ip_address: event.ip_address,
      user_id: event.user_id,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(event) {
    await this.log('info', 'auth_event', {
      type: 'auth_event',
      action: event.action, // login, logout, failed_login, mfa_required
      user_id: event.user_id,
      ip_address: event.ip_address,
      success: event.success,
      reason: event.reason,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }

  /**
   * Log error
   */
  async logError(error, context = {}) {
    await this.log('error', error.message, {
      type: 'error',
      stack: error.stack,
      code: error.code,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log audit event
   */
  async logAudit(event) {
    await this.log('info', 'audit_event', {
      type: 'audit',
      action: event.action,
      entity: event.entity,
      entity_id: event.entity_id,
      user_id: event.user_id,
      changes: event.changes,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }
}

// Create singleton instance
const externalLoggingService = new ExternalLoggingService();

// Auto-initialize on load (non-blocking)
setImmediate(async () => {
  try {
    await externalLoggingService.initialize();
  } catch (error) {
    console.error('[ExternalLogging] Auto-initialization failed:', error);
  }
});

module.exports = externalLoggingService;