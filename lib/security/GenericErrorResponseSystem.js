/**
 * Generic Error Response System
 * Provides standardized, secure error responses with consistent formatting
 */

class GenericErrorResponseSystem {
  constructor() {
    // Generic error response templates by status code
    this.genericResponses = {
      // 4xx Client Errors
      400: {
        code: 'BAD_REQUEST',
        message: 'Invalid request. Please check your input and try again.',
        category: 'client_error',
        retryable: false
      },
      401: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in and try again.',
        category: 'authentication_error',
        retryable: true,
        action: 'login_required'
      },
      403: {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to perform this action.',
        category: 'authorization_error',
        retryable: false,
        action: 'contact_administrator'
      },
      404: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        category: 'client_error',
        retryable: false
      },
      405: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed for this endpoint.',
        category: 'client_error',
        retryable: false
      },
      409: {
        code: 'CONFLICT',
        message: 'Conflict detected. The resource may have been modified.',
        category: 'client_error',
        retryable: true,
        action: 'refresh_and_retry'
      },
      413: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request too large. Please reduce the size of your request.',
        category: 'client_error',
        retryable: false
      },
      415: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported media type.',
        category: 'client_error',
        retryable: false
      },
      422: {
        code: 'UNPROCESSABLE_ENTITY',
        message: 'Invalid input data. Please check your request and try again.',
        category: 'validation_error',
        retryable: false
      },
      429: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please wait before trying again.',
        category: 'rate_limit_error',
        retryable: true,
        action: 'wait_and_retry'
      },

      // 5xx Server Errors
      500: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error. Please try again later.',
        category: 'server_error',
        retryable: true,
        action: 'retry_later'
      },
      502: {
        code: 'BAD_GATEWAY',
        message: 'Service temporarily unavailable. Please try again later.',
        category: 'server_error',
        retryable: true,
        action: 'retry_later'
      },
      503: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please try again later.',
        category: 'server_error',
        retryable: true,
        action: 'retry_later'
      },
      504: {
        code: 'GATEWAY_TIMEOUT',
        message: 'Request timeout. Please try again later.',
        category: 'server_error',
        retryable: true,
        action: 'retry_later'
      }
    };

    // Error code to status code mapping
    this.errorCodeMapping = {
      // Authentication errors
      'AUTH_INVALID_CREDENTIALS': 401,
      'AUTH_TOKEN_EXPIRED': 401,
      'AUTH_TOKEN_INVALID': 401,
      'AUTH_SESSION_EXPIRED': 401,
      'AUTH_ACCOUNT_LOCKED': 423,
      'AUTH_INSUFFICIENT_PERMISSIONS': 403,
      'AUTH_ACCOUNT_NOT_ACTIVE': 403,
      'AUTH_ACCOUNT_NOT_CONFIGURED': 401,
      'AUTH_MFA_REQUIRED': 401,
      'AUTH_MFA_INVALID': 401,

      // Validation errors
      'VALIDATION_REQUIRED_FIELD': 400,
      'VALIDATION_INVALID_FORMAT': 400,
      'VALIDATION_OUT_OF_RANGE': 400,
      'VALIDATION_INVALID_EMAIL': 400,
      'VALIDATION_INVALID_METHOD': 405,
      'VALIDATION_INVALID_CONTENT_TYPE': 415,
      'VALIDATION_REQUEST_TOO_LARGE': 413,
      'VALIDATION_PASSWORD_TOO_WEAK': 400,
      'VALIDATION_DUPLICATE_ENTRY': 409,
      'VALIDATION_INVALID_FILE_TYPE': 415,
      'VALIDATION_FILE_TOO_LARGE': 413,

      // Database errors
      'DB_CONNECTION_ERROR': 500,
      'DB_QUERY_ERROR': 500,
      'DB_CONSTRAINT_VIOLATION': 409,
      'DB_RECORD_NOT_FOUND': 404,
      'DB_TRANSACTION_FAILED': 500,
      'DB_TIMEOUT': 504,

      // External service errors
      'SERVICE_TRANSLATION_UNAVAILABLE': 503,
      'SERVICE_TRANSLATION_ERROR': 500,
      'SERVICE_EMAIL_FAILED': 503,
      'SERVICE_STORAGE_ERROR': 503,
      'SERVICE_TIMEOUT': 504,
      'SERVICE_QUOTA_EXCEEDED': 503,
      'SERVICE_AUTHENTICATION_FAILED': 502,

      // Rate limiting errors
      'RATE_LIMIT_EXCEEDED': 429,
      'RATE_LIMIT_QUOTA_EXCEEDED': 429,
      'RATE_LIMIT_TOO_MANY_REQUESTS': 429,
      'RATE_LIMIT_IP_BLOCKED': 429,

      // System errors
      'SYSTEM_INTERNAL_ERROR': 500,
      'SYSTEM_CONFIGURATION_ERROR': 500,
      'SYSTEM_MAINTENANCE': 503,
      'SYSTEM_TIMEOUT': 504,
      'SYSTEM_UNAVAILABLE': 503,
      'SYSTEM_OVERLOADED': 503,

      // File operation errors
      'FILE_NOT_FOUND': 404,
      'FILE_TOO_LARGE': 413,
      'FILE_INVALID_TYPE': 415,
      'FILE_UPLOAD_FAILED': 500,
      'FILE_PROCESSING_FAILED': 500,
      'FILE_VIRUS_DETECTED': 422,

      // Training/Content errors
      'TRAINING_PHASE_NOT_FOUND': 404,
      'TRAINING_ITEM_NOT_FOUND': 404,
      'TRAINING_ALREADY_COMPLETED': 409,
      'TRAINING_PREREQUISITES_NOT_MET': 412,
      'CONTENT_NOT_FOUND': 404,
      'CONTENT_INVALID': 422,

      // Security errors
      'SECURITY_XSS_DETECTED': 422,
      'SECURITY_INJECTION_DETECTED': 422,
      'SECURITY_MALICIOUS_FILE': 422,
      'SECURITY_SUSPICIOUS_ACTIVITY': 403,
      'SECURITY_ACCESS_VIOLATION': 403
    };

    // Retry strategies for different error types
    this.retryStrategies = {
      'exponential_backoff': {
        description: 'Wait with exponentially increasing delays',
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        maxRetries: 3
      },
      'fixed_delay': {
        description: 'Wait for a fixed amount of time',
        delay: 5000,
        maxRetries: 3
      },
      'immediate': {
        description: 'Retry immediately',
        delay: 0,
        maxRetries: 1
      },
      'no_retry': {
        description: 'Do not retry',
        maxRetries: 0
      }
    };

    // User-friendly action suggestions
    this.actionSuggestions = {
      'login_required': {
        message: 'Please log in to continue',
        action: 'redirect_to_login'
      },
      'contact_administrator': {
        message: 'Please contact your administrator for assistance',
        action: 'show_contact_info'
      },
      'refresh_and_retry': {
        message: 'Please refresh the page and try again',
        action: 'refresh_page'
      },
      'wait_and_retry': {
        message: 'Please wait a moment and try again',
        action: 'show_retry_timer'
      },
      'retry_later': {
        message: 'Please try again in a few minutes',
        action: 'show_retry_suggestion'
      },
      'check_input': {
        message: 'Please check your input and try again',
        action: 'highlight_errors'
      },
      'reduce_request_size': {
        message: 'Please reduce the size of your request',
        action: 'show_size_limits'
      }
    };
  }

  /**
   * Create a generic error response
   */
  createGenericResponse(statusCode, errorCode = null, customMessage = null, context = {}) {
    const template = this.genericResponses[statusCode] || this.genericResponses[500];
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();

    // Determine final error code
    const finalErrorCode = errorCode || template.code;

    // Determine final message
    const finalMessage = customMessage || template.message;

    // Build base response
    const response = {
      error: {
        id: errorId,
        code: finalErrorCode,
        message: finalMessage,
        statusCode: statusCode,
        category: template.category,
        timestamp: timestamp,
        retryable: template.retryable
      }
    };

    // Add action suggestion if available
    if (template.action && this.actionSuggestions[template.action]) {
      response.error.action = {
        type: template.action,
        message: this.actionSuggestions[template.action].message
      };
    }

    // Add retry information for retryable errors
    if (template.retryable) {
      response.error.retry = this.getRetryInfo(template.category, statusCode);
    }

    // Add context-specific information
    if (context.requestId) {
      response.error.requestId = context.requestId;
    }

    if (context.correlationId) {
      response.error.correlationId = context.correlationId;
    }

    // Add rate limit information for 429 errors
    if (statusCode === 429 && context.rateLimit) {
      response.error.rateLimit = {
        limit: context.rateLimit.limit,
        remaining: context.rateLimit.remaining,
        resetTime: context.rateLimit.resetTime,
        retryAfter: context.rateLimit.retryAfter
      };
    }

    // Add validation errors for 422 responses
    if (statusCode === 422 && context.validationErrors) {
      response.error.validation = {
        errors: this.sanitizeValidationErrors(context.validationErrors)
      };
    }

    return response;
  }

  /**
   * Map error code to appropriate status code
   */
  mapErrorCodeToStatusCode(errorCode) {
    return this.errorCodeMapping[errorCode] || 500;
  }

  /**
   * Get retry information based on error category
   */
  getRetryInfo(category, statusCode) {
    let strategy;

    switch (category) {
      case 'rate_limit_error':
        strategy = 'exponential_backoff';
        break;
      case 'server_error':
        if (statusCode >= 500 && statusCode < 504) {
          strategy = 'exponential_backoff';
        } else {
          strategy = 'fixed_delay';
        }
        break;
      case 'authentication_error':
        strategy = 'no_retry';
        break;
      case 'authorization_error':
        strategy = 'no_retry';
        break;
      default:
        strategy = 'fixed_delay';
    }

    const retryStrategy = this.retryStrategies[strategy];

    return {
      strategy: strategy,
      description: retryStrategy.description,
      maxRetries: retryStrategy.maxRetries,
      ...(retryStrategy.delay && { delay: retryStrategy.delay }),
      ...(retryStrategy.initialDelay && { initialDelay: retryStrategy.initialDelay }),
      ...(retryStrategy.maxDelay && { maxDelay: retryStrategy.maxDelay }),
      ...(retryStrategy.multiplier && { multiplier: retryStrategy.multiplier })
    };
  }

  /**
   * Sanitize validation errors for client response
   */
  sanitizeValidationErrors(validationErrors) {
    if (!Array.isArray(validationErrors)) {
      return [];
    }

    return validationErrors.map(error => ({
      field: error.field || 'unknown',
      message: this.sanitizeErrorMessage(error.message || 'Invalid value'),
      code: error.code || 'VALIDATION_ERROR'
    }));
  }

  /**
   * Sanitize error message
   */
  sanitizeErrorMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }

    // Remove sensitive patterns
    const sensitivePatterns = [
      /password['":\s]*[^,}\s]*/gi,
      /token['":\s]*[^,}\s]*/gi,
      /secret['":\s]*[^,}\s]*/gi,
      /key['":\s]*[^,}\s]*/gi,
      /authorization['":\s]*[^,}\s]*/gi,
      /bearer\s+[a-zA-Z0-9._-]+/gi,
      /api[_-]?key['":\s]*[^,}\s]*/gi
    ];

    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Create error response from error object
   */
  createResponseFromError(error, context = {}) {
    // Determine status code
    let statusCode = error.statusCode;
    if (!statusCode && error.code) {
      statusCode = this.mapErrorCodeToStatusCode(error.code);
    }
    if (!statusCode) {
      statusCode = 500;
    }

    // Create generic response
    return this.createGenericResponse(
      statusCode,
      error.code,
      null, // Use generic message for security
      context
    );
  }

  /**
   * Create success response template
   */
  createSuccessResponse(data = null, message = null, statusCode = 200) {
    const response = {
      success: true,
      statusCode: statusCode,
      timestamp: new Date().toISOString()
    };

    if (message) {
      response.message = message;
    }

    if (data !== null) {
      response.data = data;
    }

    return response;
  }

  /**
   * Create paginated response template
   */
  createPaginatedResponse(data, pagination, message = null) {
    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      message: message,
      data: data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
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
   * Check if error is retryable
   */
  isRetryable(statusCode, errorCode = null) {
    const template = this.genericResponses[statusCode];
    if (!template) return false;

    // Override for specific error codes
    if (errorCode) {
      const nonRetryableCodes = [
        'AUTH_INVALID_CREDENTIALS',
        'AUTH_INSUFFICIENT_PERMISSIONS',
        'VALIDATION_INVALID_FORMAT',
        'SECURITY_XSS_DETECTED',
        'SECURITY_INJECTION_DETECTED'
      ];

      if (nonRetryableCodes.includes(errorCode)) {
        return false;
      }
    }

    return template.retryable;
  }

  /**
   * Get error category
   */
  getErrorCategory(statusCode) {
    const template = this.genericResponses[statusCode];
    return template ? template.category : 'unknown_error';
  }

  /**
   * Create maintenance mode response
   */
  createMaintenanceResponse(estimatedDuration = null) {
    const response = this.createGenericResponse(503, 'SYSTEM_MAINTENANCE');

    if (estimatedDuration) {
      response.error.maintenance = {
        estimatedDuration: estimatedDuration,
        message: `System maintenance in progress. Expected completion in ${estimatedDuration}.`
      };
    }

    return response;
  }

  /**
   * Create rate limit response with headers
   */
  createRateLimitResponse(rateLimit) {
    return this.createGenericResponse(429, 'RATE_LIMIT_EXCEEDED', null, {
      rateLimit: rateLimit
    });
  }
}

// Create singleton instance
const genericErrorResponseSystem = new GenericErrorResponseSystem();

module.exports = genericErrorResponseSystem;
