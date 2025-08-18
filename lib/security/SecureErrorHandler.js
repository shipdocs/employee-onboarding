/**
 * Secure Error Handler
 * Enhanced error handling with security-focused sanitization, logging, and classification
 */

const { v4: uuidv4 } = require('uuid');
const securityAuditLogger = require('./SecurityAuditLogger');
const configManager = require('./SecureConfigManager');

class SecureErrorHandler {
  constructor() {
    // Error classification for security analysis
    this.errorClassifications = {
      // Security-sensitive errors
      SECURITY_VIOLATION: 'security_violation',
      AUTHENTICATION_ERROR: 'authentication_error',
      AUTHORIZATION_ERROR: 'authorization_error',
      INPUT_VALIDATION_ERROR: 'input_validation_error',
      INJECTION_ATTEMPT: 'injection_attempt',
      XSS_ATTEMPT: 'xss_attempt',
      
      // System errors
      DATABASE_ERROR: 'database_error',
      EXTERNAL_SERVICE_ERROR: 'external_service_error',
      CONFIGURATION_ERROR: 'configuration_error',
      RATE_LIMIT_ERROR: 'rate_limit_error',
      
      // Application errors
      BUSINESS_LOGIC_ERROR: 'business_logic_error',
      VALIDATION_ERROR: 'validation_error',
      NOT_FOUND_ERROR: 'not_found_error',
      CONFLICT_ERROR: 'conflict_error',
      
      // Unknown/Generic
      UNKNOWN_ERROR: 'unknown_error'
    };

    // Security error patterns for detection
    this.securityPatterns = {
      SQL_INJECTION: [
        /union\s+select/i,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /update\s+set/i,
        /exec\s*\(/i,
        /script\s*>/i,
        /'.*or.*'.*=/i
      ],
      XSS_ATTEMPT: [
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe[^>]*>/i,
        /eval\s*\(/i,
        /expression\s*\(/i
      ],
      PATH_TRAVERSAL: [
        /\.\.\//,
        /\.\.\\\//,
        /%2e%2e%2f/i,
        /%2e%2e%5c/i
      ],
      COMMAND_INJECTION: [
        /;\s*cat\s+/i,
        /;\s*ls\s+/i,
        /;\s*rm\s+/i,
        /;\s*wget\s+/i,
        /;\s*curl\s+/i,
        /`.*`/,
        /\$\(.*\)/
      ]
    };

    // Generic error messages for production
    this.genericErrorMessages = {
      400: 'Invalid request. Please check your input and try again.',
      401: 'Authentication required. Please log in and try again.',
      403: 'Access denied. You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      405: 'Method not allowed for this endpoint.',
      409: 'Conflict detected. The resource may have been modified.',
      413: 'Request too large. Please reduce the size of your request.',
      415: 'Unsupported media type.',
      422: 'Invalid input data. Please check your request and try again.',
      429: 'Too many requests. Please wait before trying again.',
      500: 'Internal server error. Please try again later.',
      502: 'Service temporarily unavailable. Please try again later.',
      503: 'Service temporarily unavailable. Please try again later.',
      504: 'Request timeout. Please try again later.'
    };

    // Sensitive data patterns to remove from error messages
    this.sensitivePatterns = [
      /password['":\s]*[^,}\s]*/gi,
      /token['":\s]*[^,}\s]*/gi,
      /secret['":\s]*[^,}\s]*/gi,
      /key['":\s]*[^,}\s]*/gi,
      /authorization['":\s]*[^,}\s]*/gi,
      /bearer\s+[a-zA-Z0-9._-]+/gi,
      /api[_-]?key['":\s]*[^,}\s]*/gi,
      /database[_-]?url['":\s]*[^,}\s]*/gi,
      /connection[_-]?string['":\s]*[^,}\s]*/gi
    ];
  }

  /**
   * Main error handling method
   */
  async handleError(error, context = {}) {
    try {
      // Generate unique error ID for tracking
      const errorId = this.generateErrorId();
      
      // Classify the error
      const classification = this.classifyError(error, context);
      
      // Detect security threats
      const securityThreats = this.detectSecurityThreats(error, context);
      
      // Create detailed server-side log
      await this.logDetailedError(error, context, errorId, classification, securityThreats);
      
      // Create sanitized client response
      const clientResponse = this.createClientResponse(error, context, errorId, classification);
      
      // Log security events if threats detected
      if (securityThreats.length > 0) {
        await this.logSecurityEvent(error, context, securityThreats, errorId);
      }
      
      return {
        clientResponse,
        errorId,
        classification,
        securityThreats
      };
    } catch (handlingError) {
      // Fallback error handling
      console.error('🚨 [SECURE-ERROR-HANDLER] Error in error handling:', handlingError);
      return this.createFallbackResponse();
    }
  }

  /**
   * Classify error type for appropriate handling
   */
  classifyError(error, context) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    // Security-related errors
    if (errorName.includes('auth') || errorCode.startsWith('AUTH_')) {
      return this.errorClassifications.AUTHENTICATION_ERROR;
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || 
        errorCode.includes('INSUFFICIENT_PERMISSIONS')) {
      return this.errorClassifications.AUTHORIZATION_ERROR;
    }
    
    if (errorMessage.includes('validation') || errorCode.startsWith('VALIDATION_')) {
      return this.errorClassifications.INPUT_VALIDATION_ERROR;
    }
    
    if (errorCode.startsWith('RATE_LIMIT')) {
      return this.errorClassifications.RATE_LIMIT_ERROR;
    }
    
    // Database errors
    if (errorName.includes('postgres') || errorName.includes('database') || 
        errorCode.startsWith('DB_')) {
      return this.errorClassifications.DATABASE_ERROR;
    }
    
    // External service errors
    if (errorName.includes('fetch') || errorName.includes('timeout') || 
        errorCode.startsWith('SERVICE_')) {
      return this.errorClassifications.EXTERNAL_SERVICE_ERROR;
    }
    
    // Configuration errors
    if (errorMessage.includes('configuration') || errorCode.startsWith('SYSTEM_CONFIG')) {
      return this.errorClassifications.CONFIGURATION_ERROR;
    }
    
    // HTTP status-based classification
    if (error.statusCode) {
      switch (Math.floor(error.statusCode / 100)) {
        case 4:
          if (error.statusCode === 404) return this.errorClassifications.NOT_FOUND_ERROR;
          if (error.statusCode === 409) return this.errorClassifications.CONFLICT_ERROR;
          return this.errorClassifications.VALIDATION_ERROR;
        case 5:
          return this.errorClassifications.DATABASE_ERROR;
      }
    }
    
    return this.errorClassifications.UNKNOWN_ERROR;
  }

  /**
   * Detect potential security threats in error context
   */
  detectSecurityThreats(error, context) {
    const threats = [];
    const errorMessage = error.message || '';
    const requestData = JSON.stringify(context.requestData || {});
    const userInput = context.userInput || '';
    
    // Check for SQL injection patterns
    const sqlPatterns = this.securityPatterns.SQL_INJECTION;
    if (sqlPatterns.some(pattern => pattern.test(errorMessage) || pattern.test(requestData) || pattern.test(userInput))) {
      threats.push('sql_injection_attempt');
    }
    
    // Check for XSS patterns
    const xssPatterns = this.securityPatterns.XSS_ATTEMPT;
    if (xssPatterns.some(pattern => pattern.test(errorMessage) || pattern.test(requestData) || pattern.test(userInput))) {
      threats.push('xss_attempt');
    }
    
    // Check for path traversal
    const pathPatterns = this.securityPatterns.PATH_TRAVERSAL;
    if (pathPatterns.some(pattern => pattern.test(errorMessage) || pattern.test(requestData) || pattern.test(userInput))) {
      threats.push('path_traversal_attempt');
    }
    
    // Check for command injection
    const cmdPatterns = this.securityPatterns.COMMAND_INJECTION;
    if (cmdPatterns.some(pattern => pattern.test(errorMessage) || pattern.test(requestData) || pattern.test(userInput))) {
      threats.push('command_injection_attempt');
    }
    
    // Check for authentication bypass attempts
    if (error.statusCode === 401 && context.attemptCount > 3) {
      threats.push('brute_force_attempt');
    }
    
    // Check for privilege escalation attempts
    if (error.statusCode === 403 && context.requestedRole && context.userRole) {
      const roleHierarchy = ['crew', 'manager', 'admin'];
      const userRoleIndex = roleHierarchy.indexOf(context.userRole);
      const requestedRoleIndex = roleHierarchy.indexOf(context.requestedRole);
      
      if (requestedRoleIndex > userRoleIndex + 1) {
        threats.push('privilege_escalation_attempt');
      }
    }
    
    return threats;
  }

  /**
   * Create sanitized client response
   */
  createClientResponse(error, context, errorId, classification) {
    const isProduction = configManager.getEnvironment().isProduction;
    const statusCode = error.statusCode || 500;
    
    // Use generic messages in production for security
    let message;
    if (isProduction) {
      message = this.genericErrorMessages[statusCode] || this.genericErrorMessages[500];
    } else {
      message = this.sanitizeErrorMessage(error.message || 'An error occurred');
    }
    
    const response = {
      error: {
        id: errorId,
        message: message,
        code: error.code || 'UNKNOWN_ERROR',
        statusCode: statusCode,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add safe details in development
    if (!isProduction && error.details) {
      response.error.details = this.sanitizeErrorDetails(error.details);
    }
    
    // Add documentation link if available
    const docUrl = this.getDocumentationUrl(error.code);
    if (docUrl) {
      response.error.documentation = docUrl;
    }
    
    return response;
  }

  /**
   * Sanitize error message by removing sensitive information
   */
  sanitizeErrorMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }
    
    let sanitized = message;
    
    // Remove sensitive patterns
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    // Remove file paths
    sanitized = sanitized.replace(/\/[^\s]*\.(js|ts|json|env)/g, '[FILE_PATH]');
    
    // Remove IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');
    
    // Remove UUIDs
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]');
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    
    return sanitized;
  }

  /**
   * Sanitize error details object
   */
  sanitizeErrorDetails(details) {
    if (!details || typeof details !== 'object') {
      return null;
    }
    
    const sanitized = { ...details };
    
    // Remove sensitive keys
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'credentials', 'auth', 'bearer',
      'api_key', 'apikey', 'database_url', 'connection_string'
    ];
    
    sensitiveKeys.forEach(key => {
      Object.keys(sanitized).forEach(objKey => {
        if (objKey.toLowerCase().includes(key)) {
          sanitized[objKey] = '[REDACTED]';
        }
      });
    });
    
    // Sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeErrorDetails(sanitized[key]);
      } else if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitizeErrorMessage(sanitized[key]);
      }
    });
    
    return sanitized;
  }

  /**
   * Log detailed error information server-side
   */
  async logDetailedError(error, context, errorId, classification, securityThreats) {
    const logData = {
      errorId,
      classification,
      securityThreats,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context: {
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        method: context.method,
        path: context.path,
        requestId: context.requestId,
        userRole: context.userRole,
        requestData: this.sanitizeForLogging(context.requestData)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || 'unknown'
      }
    };
    
    // Log to console with appropriate level
    const logLevel = this.getLogLevel(classification, securityThreats);
    this.logToConsole(logData, logLevel);
    
    // TODO: Integrate with external logging services
    // await this.sendToExternalLogger(logData);
    
    return logData;
  }

  /**
   * Log security event for detected threats
   */
  async logSecurityEvent(error, context, securityThreats, errorId) {
    const severity = this.getSecuritySeverity(securityThreats);
    const eventType = this.getSecurityEventType(securityThreats);
    
    await securityAuditLogger.logSecurityViolation(
      eventType,
      severity,
      {
        errorId,
        errorMessage: error.message,
        errorCode: error.code,
        threats: securityThreats,
        requestPath: context.path,
        requestMethod: context.method,
        userInput: context.userInput ? this.sanitizeErrorMessage(context.userInput) : null,
        userId: context.userId
      },
      {
        headers: {
          'x-forwarded-for': context.ipAddress,
          'user-agent': context.userAgent
        }
      }
    );
  }

  /**
   * Get security severity based on detected threats
   */
  getSecuritySeverity(threats) {
    if (threats.includes('sql_injection_attempt') || threats.includes('command_injection_attempt')) {
      return 'critical';
    }
    if (threats.includes('xss_attempt') || threats.includes('privilege_escalation_attempt')) {
      return 'high';
    }
    if (threats.includes('brute_force_attempt') || threats.includes('path_traversal_attempt')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get security event type based on threats
   */
  getSecurityEventType(threats) {
    if (threats.includes('sql_injection_attempt')) return 'sql_injection_attempt';
    if (threats.includes('xss_attempt')) return 'xss_attempt';
    if (threats.includes('command_injection_attempt')) return 'command_injection_attempt';
    if (threats.includes('privilege_escalation_attempt')) return 'privilege_escalation';
    if (threats.includes('brute_force_attempt')) return 'suspicious_activity';
    return 'suspicious_activity';
  }

  /**
   * Get appropriate log level
   */
  getLogLevel(classification, securityThreats) {
    if (securityThreats.length > 0) return 'error';
    if (classification === this.errorClassifications.SECURITY_VIOLATION) return 'error';
    if (classification === this.errorClassifications.DATABASE_ERROR) return 'error';
    if (classification === this.errorClassifications.EXTERNAL_SERVICE_ERROR) return 'warn';
    return 'info';
  }

  /**
   * Sanitize data for logging (remove sensitive info but keep structure)
   */
  sanitizeForLogging(data) {
    if (!data) return null;
    
    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      return this.sanitizeErrorDetails(sanitized);
    } catch (error) {
      return '[UNPARSEABLE_DATA]';
    }
  }

  /**
   * Log to console with appropriate formatting
   */
  logToConsole(logData, level) {
    const icons = {
      error: '🚨',
      warn: '⚠️',
      info: 'ℹ️'
    };
    
    const icon = icons[level] || 'ℹ️';
    const timestamp = new Date().toISOString();
    
    console.log(`${icon} [SECURE-ERROR-HANDLER] ${timestamp}`);
    console.log(`${icon} Error ID: ${logData.errorId}`);
    console.log(`${icon} Classification: ${logData.classification}`);
    
    if (logData.securityThreats.length > 0) {
      console.log(`${icon} Security Threats: ${logData.securityThreats.join(', ')}`);
    }
    
    console.log(`${icon} Error: ${logData.error.name} - ${logData.error.message}`);
    
    if (logData.context.userId) {
      console.log(`${icon} User: ${logData.context.userId}`);
    }
    
    if (logData.context.ipAddress) {
      console.log(`${icon} IP: ${logData.context.ipAddress}`);
    }
    
    if (logData.context.path) {
      console.log(`${icon} Path: ${logData.context.method} ${logData.context.path}`);
    }
    
    // Log stack trace for errors
    if (level === 'error' && logData.error.stack) {
      console.log(`${icon} Stack Trace:`);
      console.log(logData.error.stack);
    }
  }

  /**
   * Create fallback response for when error handling fails
   */
  createFallbackResponse() {
    const errorId = this.generateErrorId();
    
    return {
      clientResponse: {
        error: {
          id: errorId,
          message: 'An unexpected error occurred. Please try again later.',
          code: 'SYSTEM_ERROR',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      },
      errorId,
      classification: this.errorClassifications.UNKNOWN_ERROR,
      securityThreats: []
    };
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Get documentation URL for error code
   */
  getDocumentationUrl(errorCode) {
    if (!errorCode || configManager.getEnvironment().isProduction) {
      return null;
    }
    
    const baseUrl = process.env.DOCS_BASE_URL || 'https://docs.shipdocs.app';
    return `${baseUrl}/errors/${errorCode}`;
  }

  /**
   * Express middleware wrapper
   */
  middleware() {
    return async (error, req, res, next) => {
      const context = {
        userId: req.user?.userId || req.user?.id,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        requestId: req.headers['x-request-id'] || this.generateErrorId(),
        userRole: req.user?.role,
        requestData: req.body,
        userInput: req.query.q || req.body?.content || req.body?.message
      };
      
      const result = await this.handleError(error, context);
      
      res.status(result.clientResponse.error.statusCode)
         .json(result.clientResponse);
    };
  }

  /**
   * Async handler wrapper for route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(async (error) => {
        const context = {
          userId: req.user?.userId || req.user?.id,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          method: req.method,
          path: req.path,
          requestId: req.headers['x-request-id'] || this.generateErrorId(),
          userRole: req.user?.role,
          requestData: req.body,
          userInput: req.query.q || req.body?.content || req.body?.message
        };
        
        const result = await this.handleError(error, context);
        
        res.status(result.clientResponse.error.statusCode)
           .json(result.clientResponse);
      });
    };
  }
}

// Create singleton instance
const secureErrorHandler = new SecureErrorHandler();

module.exports = secureErrorHandler;