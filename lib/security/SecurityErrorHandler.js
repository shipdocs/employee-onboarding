/**
 * Security-Specific Error Handler
 * Specialized error handling for security violations, attacks, and threats
 */

const secureErrorHandler = require('./SecureErrorHandler');
const genericErrorResponseSystem = require('./GenericErrorResponseSystem');
const securityAuditLogger = require('./SecurityAuditLogger');
const configManager = require('./SecureConfigManager');

class SecurityErrorHandler {
  constructor() {
    // Security error types with specific handling
    this.securityErrorTypes = {
      XSS_ATTEMPT: 'xss_attempt',
      SQL_INJECTION: 'sql_injection_attempt',
      COMMAND_INJECTION: 'command_injection_attempt',
      PATH_TRAVERSAL: 'path_traversal_attempt',
      CSRF_VIOLATION: 'csrf_violation',
      AUTHENTICATION_BYPASS: 'authentication_bypass_attempt',
      AUTHORIZATION_BYPASS: 'authorization_bypass_attempt',
      PRIVILEGE_ESCALATION: 'privilege_escalation_attempt',
      BRUTE_FORCE: 'brute_force_attempt',
      RATE_LIMIT_ABUSE: 'rate_limit_abuse',
      MALICIOUS_FILE_UPLOAD: 'malicious_file_upload',
      DATA_EXFILTRATION: 'data_exfiltration_attempt',
      ACCOUNT_ENUMERATION: 'account_enumeration_attempt',
      SESSION_HIJACKING: 'session_hijacking_attempt',
      TOKEN_MANIPULATION: 'token_manipulation_attempt',
      CONFIGURATION_TAMPERING: 'configuration_tampering_attempt'
    };

    // Security error severity mapping
    this.securitySeverityMapping = {
      [this.securityErrorTypes.XSS_ATTEMPT]: 'high',
      [this.securityErrorTypes.SQL_INJECTION]: 'critical',
      [this.securityErrorTypes.COMMAND_INJECTION]: 'critical',
      [this.securityErrorTypes.PATH_TRAVERSAL]: 'high',
      [this.securityErrorTypes.CSRF_VIOLATION]: 'medium',
      [this.securityErrorTypes.AUTHENTICATION_BYPASS]: 'critical',
      [this.securityErrorTypes.AUTHORIZATION_BYPASS]: 'high',
      [this.securityErrorTypes.PRIVILEGE_ESCALATION]: 'critical',
      [this.securityErrorTypes.BRUTE_FORCE]: 'medium',
      [this.securityErrorTypes.RATE_LIMIT_ABUSE]: 'medium',
      [this.securityErrorTypes.MALICIOUS_FILE_UPLOAD]: 'high',
      [this.securityErrorTypes.DATA_EXFILTRATION]: 'critical',
      [this.securityErrorTypes.ACCOUNT_ENUMERATION]: 'medium',
      [this.securityErrorTypes.SESSION_HIJACKING]: 'critical',
      [this.securityErrorTypes.TOKEN_MANIPULATION]: 'critical',
      [this.securityErrorTypes.CONFIGURATION_TAMPERING]: 'critical'
    };

    // Security response patterns - generic messages to avoid information disclosure
    this.securityResponsePatterns = {
      [this.securityErrorTypes.XSS_ATTEMPT]: {
        statusCode: 422,
        code: 'INVALID_INPUT',
        message: 'Invalid input detected. Please check your data and try again.',
        action: 'sanitize_input'
      },
      [this.securityErrorTypes.SQL_INJECTION]: {
        statusCode: 422,
        code: 'INVALID_REQUEST',
        message: 'Invalid request format. Please check your input.',
        action: 'review_input'
      },
      [this.securityErrorTypes.COMMAND_INJECTION]: {
        statusCode: 422,
        code: 'INVALID_INPUT',
        message: 'Invalid input detected. Please check your data and try again.',
        action: 'sanitize_input'
      },
      [this.securityErrorTypes.PATH_TRAVERSAL]: {
        statusCode: 403,
        code: 'ACCESS_DENIED',
        message: 'Access denied. Invalid file path.',
        action: 'check_permissions'
      },
      [this.securityErrorTypes.CSRF_VIOLATION]: {
        statusCode: 403,
        code: 'INVALID_REQUEST',
        message: 'Invalid request. Please refresh the page and try again.',
        action: 'refresh_page'
      },
      [this.securityErrorTypes.AUTHENTICATION_BYPASS]: {
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required. Please log in and try again.',
        action: 'login_required'
      },
      [this.securityErrorTypes.AUTHORIZATION_BYPASS]: {
        statusCode: 403,
        code: 'ACCESS_DENIED',
        message: 'Access denied. You do not have permission to perform this action.',
        action: 'contact_administrator'
      },
      [this.securityErrorTypes.PRIVILEGE_ESCALATION]: {
        statusCode: 403,
        code: 'ACCESS_DENIED',
        message: 'Access denied. Insufficient privileges.',
        action: 'contact_administrator'
      },
      [this.securityErrorTypes.BRUTE_FORCE]: {
        statusCode: 429,
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts. Please wait before trying again.',
        action: 'wait_and_retry'
      },
      [this.securityErrorTypes.RATE_LIMIT_ABUSE]: {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please slow down your requests.',
        action: 'reduce_request_rate'
      },
      [this.securityErrorTypes.MALICIOUS_FILE_UPLOAD]: {
        statusCode: 422,
        code: 'INVALID_FILE',
        message: 'File validation failed. Please check your file and try again.',
        action: 'check_file_format'
      },
      [this.securityErrorTypes.DATA_EXFILTRATION]: {
        statusCode: 403,
        code: 'ACCESS_DENIED',
        message: 'Access denied. Request not authorized.',
        action: 'contact_administrator'
      },
      [this.securityErrorTypes.ACCOUNT_ENUMERATION]: {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Resource not found.',
        action: 'check_request'
      },
      [this.securityErrorTypes.SESSION_HIJACKING]: {
        statusCode: 401,
        code: 'SESSION_INVALID',
        message: 'Session invalid. Please log in again.',
        action: 'login_required'
      },
      [this.securityErrorTypes.TOKEN_MANIPULATION]: {
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token. Please log in again.',
        action: 'login_required'
      },
      [this.securityErrorTypes.CONFIGURATION_TAMPERING]: {
        statusCode: 403,
        code: 'ACCESS_DENIED',
        message: 'Access denied. Configuration access not authorized.',
        action: 'contact_administrator'
      }
    };

    // Automatic response actions for different security violations
    this.automaticActions = {
      [this.securityErrorTypes.BRUTE_FORCE]: ['temporary_ip_block', 'account_lockout'],
      [this.securityErrorTypes.SQL_INJECTION]: ['immediate_block', 'security_alert'],
      [this.securityErrorTypes.COMMAND_INJECTION]: ['immediate_block', 'security_alert'],
      [this.securityErrorTypes.XSS_ATTEMPT]: ['input_sanitization', 'security_log'],
      [this.securityErrorTypes.PRIVILEGE_ESCALATION]: ['session_termination', 'security_alert'],
      [this.securityErrorTypes.DATA_EXFILTRATION]: ['immediate_block', 'security_alert'],
      [this.securityErrorTypes.SESSION_HIJACKING]: ['session_termination', 'security_alert'],
      [this.securityErrorTypes.TOKEN_MANIPULATION]: ['token_blacklist', 'security_alert'],
      [this.securityErrorTypes.MALICIOUS_FILE_UPLOAD]: ['file_quarantine', 'security_log']
    };

    // Security alert thresholds
    this.alertThresholds = {
      [this.securityErrorTypes.BRUTE_FORCE]: { count: 5, timeWindow: 300000 }, // 5 attempts in 5 minutes
      [this.securityErrorTypes.XSS_ATTEMPT]: { count: 3, timeWindow: 600000 }, // 3 attempts in 10 minutes
      [this.securityErrorTypes.SQL_INJECTION]: { count: 1, timeWindow: 0 }, // Immediate alert
      [this.securityErrorTypes.COMMAND_INJECTION]: { count: 1, timeWindow: 0 }, // Immediate alert
      [this.securityErrorTypes.PRIVILEGE_ESCALATION]: { count: 2, timeWindow: 300000 }, // 2 attempts in 5 minutes
      [this.securityErrorTypes.RATE_LIMIT_ABUSE]: { count: 10, timeWindow: 600000 } // 10 violations in 10 minutes
    };
  }

  /**
   * Handle security-specific errors
   */
  async handleSecurityError(securityErrorType, context = {}, originalError = null) {
    try {
      // Get security error pattern
      const pattern = this.securityResponsePatterns[securityErrorType];
      if (!pattern) {
        throw new Error(`Unknown security error type: ${securityErrorType}`);
      }

      // Generate unique security incident ID
      const incidentId = this.generateSecurityIncidentId(securityErrorType);

      // Log security event
      await this.logSecurityEvent(securityErrorType, context, incidentId, originalError);

      // Execute automatic security actions
      await this.executeAutomaticActions(securityErrorType, context, incidentId);

      // Check if security alert should be triggered
      await this.checkSecurityAlertThreshold(securityErrorType, context);

      // Create sanitized client response
      const clientResponse = this.createSecurityErrorResponse(pattern, incidentId, context);

      // Log detailed information server-side
      await this.logDetailedSecurityError(securityErrorType, context, incidentId, originalError);

      return {
        clientResponse,
        incidentId,
        securityErrorType,
        severity: this.securitySeverityMapping[securityErrorType] || 'medium',
        actionsExecuted: this.automaticActions[securityErrorType] || []
      };
    } catch (error) {
      await securityAuditLogger.logEvent({
        type: 'system_error',
        severity: 'high',
        details: {
          component: 'SecurityErrorHandler',
          operation: 'handleSecurityError',
          error: error.message,
          originalSecurityErrorType: securityErrorType
        }
      });
      return this.createFallbackSecurityResponse();
    }
  }

  /**
   * Create sanitized security error response for client
   */
  createSecurityErrorResponse(pattern, incidentId, context) {
    const response = genericErrorResponseSystem.createGenericResponse(
      pattern.statusCode,
      pattern.code,
      pattern.message,
      {
        requestId: context.requestId,
        correlationId: incidentId
      }
    );

    // Add security-specific metadata (safe for client)
    response.error.security = {
      incidentId: incidentId,
      timestamp: new Date().toISOString(),
      action: pattern.action
    };

    // Add rate limit information if applicable
    if (pattern.statusCode === 429 && context.rateLimit) {
      response.error.rateLimit = {
        retryAfter: context.rateLimit.retryAfter || 60,
        resetTime: context.rateLimit.resetTime
      };
    }

    return response;
  }

  /**
   * Log security event with comprehensive details
   */
  async logSecurityEvent(securityErrorType, context, incidentId, originalError) {
    const severity = this.securitySeverityMapping[securityErrorType] || 'medium';

    const eventDetails = {
      incidentId: incidentId,
      securityErrorType: securityErrorType,
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        code: originalError.code
      } : null,
      requestDetails: {
        method: context.method,
        path: context.path,
        userAgent: context.userAgent,
        referer: context.referer,
        contentType: context.contentType
      },
      inputData: this.sanitizeInputForLogging(context.inputData),
      detectionMethod: context.detectionMethod || 'pattern_matching',
      confidence: context.confidence || 'high'
    };

    await securityAuditLogger.logSecurityViolation(
      securityErrorType,
      severity,
      eventDetails,
      {
        headers: {
          'x-forwarded-for': context.ipAddress,
          'user-agent': context.userAgent
        }
      }
    );
  }

  /**
   * Execute automatic security actions
   */
  async executeAutomaticActions(securityErrorType, context, incidentId) {
    const actions = this.automaticActions[securityErrorType];
    if (!actions || actions.length === 0) {
      return [];
    }

    const executedActions = [];

    for (const action of actions) {
      try {
        switch (action) {
          case 'temporary_ip_block':
            await this.temporaryIpBlock(context.ipAddress, incidentId);
            executedActions.push(action);
            break;

          case 'account_lockout':
            if (context.userId) {
              await this.temporaryAccountLockout(context.userId, incidentId);
              executedActions.push(action);
            }
            break;

          case 'immediate_block':
            await this.immediateIpBlock(context.ipAddress, incidentId);
            executedActions.push(action);
            break;

          case 'security_alert':
            await this.triggerSecurityAlert(securityErrorType, context, incidentId);
            executedActions.push(action);
            break;

          case 'session_termination':
            if (context.userId) {
              await this.terminateUserSessions(context.userId, incidentId);
              executedActions.push(action);
            }
            break;

          case 'token_blacklist':
            if (context.token) {
              await this.blacklistToken(context.token, incidentId);
              executedActions.push(action);
            }
            break;

          case 'file_quarantine':
            if (context.fileId) {
              await this.quarantineFile(context.fileId, incidentId);
              executedActions.push(action);
            }
            break;

          case 'input_sanitization':
            // Log that input was sanitized
            console.log(`🔒 [SECURITY-ACTION] Input sanitized for incident ${incidentId}`);
            executedActions.push(action);
            break;

          case 'security_log':
            // Additional security logging already handled above
            executedActions.push(action);
            break;
        }
      } catch (actionError) {
        await securityAuditLogger.logEvent({
          type: 'system_error',
          severity: 'medium',
          details: {
            component: 'SecurityErrorHandler',
            operation: 'executeAutomaticActions',
            action: action,
            error: actionError.message,
            incidentId: incidentId
          }
        });
      }
    }

    return executedActions;
  }

  /**
   * Check if security alert threshold is reached
   */
  async checkSecurityAlertThreshold(securityErrorType, context) {
    const threshold = this.alertThresholds[securityErrorType];
    if (!threshold) {
      return false;
    }

    try {
      // Query recent security events of this type from the same IP
      const since = new Date(Date.now() - threshold.timeWindow);
      const events = await securityAuditLogger.queryEvents({
        type: securityErrorType,
        ipAddress: context.ipAddress,
        since: since.toISOString(),
        limit: threshold.count + 1
      });

      if (events.success && events.events.length >= threshold.count) {
        await this.triggerSecurityAlert(securityErrorType, context, null, {
          eventCount: events.events.length,
          timeWindow: threshold.timeWindow,
          threshold: threshold.count
        });
        return true;
      }
    } catch (error) {
      await securityAuditLogger.logEvent({
        type: 'system_error',
        severity: 'medium',
        details: {
          component: 'SecurityErrorHandler',
          operation: 'checkSecurityAlertThreshold',
          securityErrorType: securityErrorType,
          error: error.message
        }
      });
    }

    return false;
  }

  /**
   * Log detailed security error information server-side
   */
  async logDetailedSecurityError(securityErrorType, context, incidentId, originalError) {
    const logData = {
      timestamp: new Date().toISOString(),
      incidentId: incidentId,
      securityErrorType: securityErrorType,
      severity: this.securitySeverityMapping[securityErrorType],
      context: {
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        method: context.method,
        path: context.path,
        referer: context.referer,
        contentType: context.contentType,
        requestSize: context.requestSize,
        sessionId: context.sessionId
      },
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        code: originalError.code,
        stack: originalError.stack
      } : null,
      detectionDetails: {
        method: context.detectionMethod || 'pattern_matching',
        confidence: context.confidence || 'high',
        patterns: context.matchedPatterns || [],
        inputSample: this.sanitizeInputForLogging(context.inputData)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        version: process.env.APP_VERSION || 'unknown'
      }
    };

    // Log with appropriate severity
    const severity = this.securitySeverityMapping[securityErrorType];
    const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : '🟡';

    console.log(`${icon} [SECURITY-ERROR] ${securityErrorType} - Incident ${incidentId}`);
    console.log(`${icon} [SECURITY-ERROR] IP: ${context.ipAddress}, User: ${context.userId || 'anonymous'}`);
    console.log(`${icon} [SECURITY-ERROR] Path: ${context.method} ${context.path}`);

    if (context.matchedPatterns && context.matchedPatterns.length > 0) {
      console.log(`${icon} [SECURITY-ERROR] Matched patterns: ${context.matchedPatterns.join(', ')}`);
    }
  }

  /**
   * Sanitize input data for logging
   */
  sanitizeInputForLogging(inputData) {
    if (!inputData) return null;

    try {
      const sanitized = JSON.parse(JSON.stringify(inputData));

      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

      const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        Object.keys(obj).forEach(key => {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          } else if (typeof obj[key] === 'string' && obj[key].length > 1000) {
            obj[key] = obj[key].substring(0, 1000) + '...[TRUNCATED]';
          }
        });

        return obj;
      };

      return sanitizeObject(sanitized);
    } catch (error) {
      return '[UNPARSEABLE_INPUT]';
    }
  }

  /**
   * Generate unique security incident ID
   */
  generateSecurityIncidentId(securityErrorType) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const typePrefix = securityErrorType.split('_')[0].toLowerCase();
    return `sec_${typePrefix}_${timestamp}_${random}`;
  }

  /**
   * Create fallback security response
   */
  createFallbackSecurityResponse() {
    const incidentId = this.generateSecurityIncidentId('unknown');

    return {
      clientResponse: genericErrorResponseSystem.createGenericResponse(500, 'SECURITY_ERROR'),
      incidentId,
      securityErrorType: 'unknown',
      severity: 'medium',
      actionsExecuted: []
    };
  }

  // Security action implementations (placeholders for integration with other systems)

  async temporaryIpBlock(ipAddress, incidentId) {
    console.log(`🔒 [SECURITY-ACTION] Temporary IP block for ${ipAddress} - Incident ${incidentId}`);
    // TODO: Integrate with rate limiting system or firewall
  }

  async immediateIpBlock(ipAddress, incidentId) {
    console.log(`🚨 [SECURITY-ACTION] Immediate IP block for ${ipAddress} - Incident ${incidentId}`);
    // TODO: Integrate with firewall or security system
  }

  async temporaryAccountLockout(userId, incidentId) {
    console.log(`🔒 [SECURITY-ACTION] Temporary account lockout for user ${userId} - Incident ${incidentId}`);
    // TODO: Integrate with user management system
  }

  async terminateUserSessions(userId, incidentId) {
    console.log(`🔒 [SECURITY-ACTION] Terminating sessions for user ${userId} - Incident ${incidentId}`);
    // TODO: Integrate with session management system
  }

  async blacklistToken(token, incidentId) {
    console.log(`🔒 [SECURITY-ACTION] Blacklisting token - Incident ${incidentId}`);
    // TODO: Integrate with token blacklist system
  }

  async quarantineFile(fileId, incidentId) {
    console.log(`🔒 [SECURITY-ACTION] Quarantining file ${fileId} - Incident ${incidentId}`);
    // TODO: Integrate with file management system
  }

  async triggerSecurityAlert(securityErrorType, context, incidentId, additionalData = {}) {
    console.log(`🚨 [SECURITY-ALERT] ${securityErrorType} alert triggered - Incident ${incidentId}`);
    // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
  }

  /**
   * Express middleware for security error handling
   */
  middleware() {
    return async (error, req, res, next) => {
      // Check if this is a security-related error
      const securityErrorType = this.detectSecurityErrorType(error, req);

      if (securityErrorType) {
        const context = {
          userId: req.user?.userId || req.user?.id,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          method: req.method,
          path: req.path,
          referer: req.headers.referer,
          contentType: req.headers['content-type'],
          requestSize: req.headers['content-length'],
          sessionId: req.sessionID,
          requestId: req.headers['x-request-id'],
          inputData: { body: req.body, query: req.query, params: req.params }
        };

        const result = await this.handleSecurityError(securityErrorType, context, error);

        res.status(result.clientResponse.error.statusCode)
           .json(result.clientResponse);
      } else {
        // Pass to regular error handler
        next(error);
      }
    };
  }

  /**
   * Detect if error is security-related
   */
  detectSecurityErrorType(error, req) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Check for specific security error codes
    if (errorCode.includes('XSS') || errorMessage.includes('xss')) {
      return this.securityErrorTypes.XSS_ATTEMPT;
    }

    if (errorCode.includes('SQL_INJECTION') || errorMessage.includes('sql injection')) {
      return this.securityErrorTypes.SQL_INJECTION;
    }

    if (errorCode.includes('COMMAND_INJECTION') || errorMessage.includes('command injection')) {
      return this.securityErrorTypes.COMMAND_INJECTION;
    }

    if (errorCode.includes('PATH_TRAVERSAL') || errorMessage.includes('path traversal')) {
      return this.securityErrorTypes.PATH_TRAVERSAL;
    }

    if (errorCode.includes('RATE_LIMIT') && error.statusCode === 429) {
      return this.securityErrorTypes.RATE_LIMIT_ABUSE;
    }

    if (errorCode.includes('AUTH_') && error.statusCode === 401) {
      return this.securityErrorTypes.AUTHENTICATION_BYPASS;
    }

    if (errorCode.includes('INSUFFICIENT_PERMISSIONS') && error.statusCode === 403) {
      return this.securityErrorTypes.AUTHORIZATION_BYPASS;
    }

    if (errorMessage.includes('malicious') || errorMessage.includes('virus')) {
      return this.securityErrorTypes.MALICIOUS_FILE_UPLOAD;
    }

    return null;
  }
}

// Create singleton instance
const securityErrorHandler = new SecurityErrorHandler();

module.exports = securityErrorHandler;
