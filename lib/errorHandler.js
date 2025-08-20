/**
 * Centralized Error Handling System
 * Provides standardized error responses across all API routes
 */

const { v4: uuidv4 } = require('uuid');

// Error code classification system
const ERROR_CODES = {
  // Authentication & Authorization (AUTH_*)
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_ACCOUNT_LOCKED: 'Account temporarily locked',
  AUTH_TOKEN_EXPIRED: 'Authentication token expired',
  AUTH_TOKEN_INVALID: 'Invalid authentication token',
  AUTH_INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  AUTH_ACCOUNT_NOT_ACTIVE: 'Account is not active',
  AUTH_ACCOUNT_NOT_CONFIGURED: 'Account not properly configured',
  AUTH_SESSION_EXPIRED: 'Session has expired',

  // Validation (VALIDATION_*)
  VALIDATION_REQUIRED_FIELD: 'Required field missing',
  VALIDATION_INVALID_FORMAT: 'Invalid data format',
  VALIDATION_OUT_OF_RANGE: 'Value out of allowed range',
  VALIDATION_INVALID_EMAIL: 'Invalid email format',
  VALIDATION_INVALID_METHOD: 'HTTP method not allowed',
  VALIDATION_INVALID_CONTENT_TYPE: 'Invalid content type',
  VALIDATION_REQUEST_TOO_LARGE: 'Request size too large',
  VALIDATION_UNSUPPORTED_LANGUAGE: 'Unsupported language',
  VALIDATION_INVALID_LANGUAGE_PAIR: 'Invalid language pair',
  VALIDATION_PASSWORD_TOO_WEAK: 'Password does not meet requirements',
  VALIDATION_DUPLICATE_ENTRY: 'Entry already exists',

  // Database (DB_*)
  DB_CONNECTION_ERROR: 'Database connection failed',
  DB_QUERY_ERROR: 'Database query failed',
  DB_CONSTRAINT_VIOLATION: 'Database constraint violation',
  DB_RECORD_NOT_FOUND: 'Record not found',
  DB_TRANSACTION_FAILED: 'Database transaction failed',

  // External Services (SERVICE_*)
  SERVICE_TRANSLATION_UNAVAILABLE: 'Translation service unavailable',
  SERVICE_TRANSLATION_ERROR: 'Translation service error',
  SERVICE_EMAIL_FAILED: 'Email delivery failed',
  SERVICE_STORAGE_ERROR: 'File storage error',
  SERVICE_TIMEOUT: 'External service timeout',
  SERVICE_QUOTA_EXCEEDED: 'Service quota exceeded',

  // Rate Limiting (RATE_*)
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  RATE_LIMIT_QUOTA_EXCEEDED: 'API quota exceeded',
  RATE_LIMIT_TOO_MANY_REQUESTS: 'Too many requests',

  // System (SYSTEM_*)
  SYSTEM_INTERNAL_ERROR: 'Internal server error',
  SYSTEM_CONFIGURATION_ERROR: 'System configuration error',
  SYSTEM_MAINTENANCE: 'System under maintenance',
  SYSTEM_TIMEOUT: 'Request timeout',
  SYSTEM_UNAVAILABLE: 'System temporarily unavailable',

  // File Operations (FILE_*)
  FILE_NOT_FOUND: 'File not found',
  FILE_TOO_LARGE: 'File size exceeds limit',
  FILE_INVALID_TYPE: 'Invalid file type',
  FILE_UPLOAD_FAILED: 'File upload failed',

  // Training & Content (TRAINING_*)
  TRAINING_PHASE_NOT_FOUND: 'Training phase not found',
  TRAINING_ITEM_NOT_FOUND: 'Training item not found',
  TRAINING_ALREADY_COMPLETED: 'Training already completed',
  TRAINING_PREREQUISITES_NOT_MET: 'Prerequisites not met'
};

// HTTP Status Code Mapping
const STATUS_CODE_MAPPING = {
  // 4xx Client Errors
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_SESSION_EXPIRED: 401,
  AUTH_ACCOUNT_LOCKED: 423,
  AUTH_INSUFFICIENT_PERMISSIONS: 403,
  AUTH_ACCOUNT_NOT_ACTIVE: 403,
  AUTH_ACCOUNT_NOT_CONFIGURED: 401,

  VALIDATION_REQUIRED_FIELD: 400,
  VALIDATION_INVALID_FORMAT: 400,
  VALIDATION_OUT_OF_RANGE: 400,
  VALIDATION_INVALID_EMAIL: 400,
  VALIDATION_INVALID_METHOD: 405,
  VALIDATION_INVALID_CONTENT_TYPE: 415,
  VALIDATION_REQUEST_TOO_LARGE: 413,
  VALIDATION_UNSUPPORTED_LANGUAGE: 400,
  VALIDATION_INVALID_LANGUAGE_PAIR: 400,
  VALIDATION_PASSWORD_TOO_WEAK: 400,
  VALIDATION_DUPLICATE_ENTRY: 409,

  DB_RECORD_NOT_FOUND: 404,
  TRAINING_PHASE_NOT_FOUND: 404,
  TRAINING_ITEM_NOT_FOUND: 404,
  FILE_NOT_FOUND: 404,

  RATE_LIMIT_EXCEEDED: 429,
  RATE_LIMIT_QUOTA_EXCEEDED: 429,
  RATE_LIMIT_TOO_MANY_REQUESTS: 429,

  FILE_TOO_LARGE: 413,
  FILE_INVALID_TYPE: 415,

  // 5xx Server Errors
  DB_CONNECTION_ERROR: 500,
  DB_QUERY_ERROR: 500,
  DB_CONSTRAINT_VIOLATION: 500,
  DB_TRANSACTION_FAILED: 500,

  SERVICE_TRANSLATION_UNAVAILABLE: 503,
  SERVICE_TRANSLATION_ERROR: 500,
  SERVICE_EMAIL_FAILED: 503,
  SERVICE_STORAGE_ERROR: 503,
  SERVICE_TIMEOUT: 504,
  SERVICE_QUOTA_EXCEEDED: 503,

  SYSTEM_INTERNAL_ERROR: 500,
  SYSTEM_CONFIGURATION_ERROR: 500,
  SYSTEM_MAINTENANCE: 503,
  SYSTEM_TIMEOUT: 504,
  SYSTEM_UNAVAILABLE: 503,

  FILE_UPLOAD_FAILED: 500,
  TRAINING_ALREADY_COMPLETED: 409,
  TRAINING_PREREQUISITES_NOT_MET: 412
};

// Custom Error Classes
class APIError extends Error {
  constructor(code, message, details = null, statusCode = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode || STATUS_CODE_MAPPING[code] || 500;
  }
}

class AuthError extends APIError {
  constructor(code, message, details = null) {
    super(code, message, details);
    this.name = 'AuthError';
  }
}

class ValidationError extends APIError {
  constructor(code, message, details = null) {
    super(code, message, details);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends APIError {
  constructor(code, message, details = null) {
    super(code, message, details);
    this.name = 'DatabaseError';
  }
}

class ServiceError extends APIError {
  constructor(code, message, details = null) {
    super(code, message, details);
    this.name = 'ServiceError';
  }
}

// Main Error Handler Class
class ErrorHandler {
  static handle(error, req, res, next) {
    const errorResponse = this.formatError(error, req);
    this.logError(error, req, errorResponse);

    res.status(errorResponse.error.statusCode)
       .json(errorResponse);
  }

  static formatError(error, req) {
    const requestId = req.headers['x-request-id'] || this.generateRequestId();
    const isProduction = process.env.NODE_ENV === 'production';

    // Determine error code and message
    let code = error.code || 'SYSTEM_INTERNAL_ERROR';
    let message = error.message || ERROR_CODES[code] || 'An unexpected error occurred';
    let statusCode = error.statusCode || STATUS_CODE_MAPPING[code] || 500;

    // Handle specific error types
    if (error.name === 'PostgrestError') {
      code = 'DB_QUERY_ERROR';
      message = 'Database operation failed';
      statusCode = 500;
    } else if (error.name === 'FetchError') {
      code = 'SERVICE_TIMEOUT';
      message = 'External service communication failed';
      statusCode = 504;
    }

    return {
      error: {
        code: code,
        message: message,
        details: this.getErrorDetails(error, isProduction),
        timestamp: new Date().toISOString(),
        requestId: requestId,
        ...(isProduction ? {} : { path: req.path }),
        method: req.method,
        statusCode: statusCode
      },
      meta: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '2.0.0',
        ...(this.getDocumentationUrl(code) && { documentation: this.getDocumentationUrl(code) })
      }
    };
  }

  static getErrorDetails(error, isProduction) {
    if (isProduction) {
      // In production, only include safe details and sanitize them
      const details = error.details || null;
      if (details && typeof details === 'object') {
        // Remove any potentially sensitive fields
        const sanitizedDetails = { ...details };
        delete sanitizedDetails.stack;
        delete sanitizedDetails.originalMessage;
        delete sanitizedDetails.internalError;
        delete sanitizedDetails.query;
        delete sanitizedDetails.params;
        return sanitizedDetails;
      }
      return details;
    } else {
      // In development, include more debugging information
      return {
        originalMessage: error.message,
        stack: error.stack,
        details: error.details,
        name: error.name
      };
    }
  }

  static getDocumentationUrl(code) {
    // Don't expose internal documentation URLs in production
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    const baseUrl = process.env.DOCS_BASE_URL || 'https://docs.shipdocs.app';
    return `${baseUrl}/errors/${code}`;
  }

  static generateRequestId() {
    return `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  }

  static logError(error, req, errorResponse) {
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: errorResponse.error.requestId,
      error: {
        code: errorResponse.error.code,
        message: errorResponse.error.message,
        statusCode: errorResponse.error.statusCode,
        stack: error.stack
      },
      request: {
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userId: req.user?.userId || null
      }
    };

    // Log to console (can be extended to external logging services)
    // console.error('🚨 API Error:', JSON.stringify(logData, null, 2));

    // TODO: Integrate with external logging service (e.g., Sentry, LogRocket)
    // this.sendToExternalLogger(logData);
  }

  // Helper method to create standardized error responses
  static createErrorResponse(code, customMessage = null, details = null) {
    const message = customMessage || ERROR_CODES[code] || 'An error occurred';
    const statusCode = STATUS_CODE_MAPPING[code] || 500;

    return new APIError(code, message, details, statusCode);
  }

  // Middleware wrapper for async route handlers
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

// Export convenience functions
const createAuthError = (code, message, details) => new AuthError(code, message, details);
const createValidationError = (code, message, details) => new ValidationError(code, message, details);
const createDatabaseError = (code, message, details) => new DatabaseError(code, message, details);
const createServiceError = (code, message, details) => new ServiceError(code, message, details);

module.exports = ErrorHandler;
module.exports.ERROR_CODES = ERROR_CODES;
module.exports.STATUS_CODE_MAPPING = STATUS_CODE_MAPPING;
module.exports.APIError = APIError;
module.exports.AuthError = AuthError;
module.exports.ValidationError = ValidationError;
module.exports.DatabaseError = DatabaseError;
module.exports.ServiceError = ServiceError;
module.exports.createAuthError = createAuthError;
module.exports.createValidationError = createValidationError;
module.exports.createDatabaseError = createDatabaseError;
module.exports.createServiceError = createServiceError;
