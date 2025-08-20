/**
 * Centralized Error Handling Middleware
 * Provides consistent error handling and logging across the application
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.errorLog = path.join(this.logDir, 'errors.log');
    this.criticalLog = path.join(this.logDir, 'critical.log');

    // Initialize log directory
    this.initLogs();
  }

  /**
   * Initialize log directory
   */
  async initLogs() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Custom Error Classes
   */
  static ValidationError = class extends Error {
    constructor(message, field = null) {
      super(message);
      this.name = 'ValidationError';
      this.statusCode = 400;
      this.field = field;
    }
  };

  static AuthenticationError = class extends Error {
    constructor(message = 'Authentication failed') {
      super(message);
      this.name = 'AuthenticationError';
      this.statusCode = 401;
    }
  };

  static AuthorizationError = class extends Error {
    constructor(message = 'Insufficient permissions') {
      super(message);
      this.name = 'AuthorizationError';
      this.statusCode = 403;
    }
  };

  static NotFoundError = class extends Error {
    constructor(resource = 'Resource') {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
      this.statusCode = 404;
    }
  };

  static ConflictError = class extends Error {
    constructor(message = 'Resource conflict') {
      super(message);
      this.name = 'ConflictError';
      this.statusCode = 409;
    }
  };

  static RateLimitError = class extends Error {
    constructor(retryAfter = 60) {
      super('Too many requests');
      this.name = 'RateLimitError';
      this.statusCode = 429;
      this.retryAfter = retryAfter;
    }
  };

  static DatabaseError = class extends Error {
    constructor(message = 'Database operation failed', originalError = null) {
      super(message);
      this.name = 'DatabaseError';
      this.statusCode = 500;
      this.originalError = originalError;
    }
  };

  static ExternalServiceError = class extends Error {
    constructor(service, originalError = null) {
      super(`External service error: ${service}`);
      this.name = 'ExternalServiceError';
      this.statusCode = 502;
      this.service = service;
      this.originalError = originalError;
    }
  };

  /**
   * Log error to file
   */
  async logError(error, req = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        user: req.user?.id || 'anonymous',
        headers: this.sanitizeHeaders(req.headers)
      } : null,
      environment: process.env.NODE_ENV
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';

      // Log to appropriate file based on severity
      if (error.statusCode >= 500 || error.name === 'CriticalError') {
        await fs.appendFile(this.criticalLog, logLine);
        // Also log critical errors to console in production
        if (process.env.NODE_ENV === 'production') {
          console.error('CRITICAL ERROR:', error.message);
        }
      } else {
        await fs.appendFile(this.errorLog, logLine);
      }
    } catch (logError) {
      console.error('Failed to write to error log:', logError);
    }
  }

  /**
   * Sanitize headers for logging
   */
  sanitizeHeaders(headers) {
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    for (const key of sensitive) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Format error response
   */
  formatErrorResponse(error, isDevelopment = false) {
    const response = {
      error: true,
      message: error.message || 'An error occurred',
      statusCode: error.statusCode || 500
    };

    // Add field information for validation errors
    if (error.field) {
      response.field = error.field;
    }

    // Add retry information for rate limit errors
    if (error.retryAfter) {
      response.retryAfter = error.retryAfter;
    }

    // Add detailed error information in development
    if (isDevelopment) {
      response.details = {
        name: error.name,
        stack: error.stack,
        originalError: error.originalError?.message
      };
    }

    // Sanitize error messages in production
    if (!isDevelopment && response.statusCode === 500) {
      response.message = 'Internal server error';
    }

    return response;
  }

  /**
   * Express error middleware
   */
  middleware() {
    return async (err, req, res, next) => {
      // Log the error
      await this.logError(err, req);

      // Determine status code
      const statusCode = err.statusCode || 500;

      // Set response status
      res.status(statusCode);

      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      // Format and send response
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorResponse = this.formatErrorResponse(err, isDevelopment);

      res.json(errorResponse);
    };
  }

  /**
   * Async route wrapper
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validate request middleware
   */
  validateRequest(schema) {
    return (req, res, next) => {
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const validationError = new ErrorHandler.ValidationError(
          error.details.map(d => d.message).join(', '),
          error.details[0]?.path?.join('.')
        );
        return next(validationError);
      }

      next();
    };
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException() {
    process.on('uncaughtException', async (error) => {
      console.error('UNCAUGHT EXCEPTION:', error);
      await this.logError(error);

      // Give time for error to be logged
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection() {
    process.on('unhandledRejection', async (reason, promise) => {
      const error = new Error(`Unhandled Rejection: ${reason}`);
      error.name = 'UnhandledRejection';
      error.statusCode = 500;

      console.error('UNHANDLED REJECTION:', reason);
      await this.logError(error);
    });
  }

  /**
   * Monitor error rates
   */
  async getErrorStats(hours = 24) {
    try {
      const errorContent = await fs.readFile(this.errorLog, 'utf-8');
      const criticalContent = await fs.readFile(this.criticalLog, 'utf-8');

      const allErrors = errorContent.split('\n')
        .concat(criticalContent.split('\n'))
        .filter(line => line)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry);

      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const recentErrors = allErrors.filter(entry =>
        new Date(entry.timestamp) > cutoff
      );

      // Calculate statistics
      const stats = {
        total: recentErrors.length,
        byStatusCode: {},
        byEndpoint: {},
        byErrorType: {},
        criticalCount: 0
      };

      for (const entry of recentErrors) {
        // Count by status code
        const statusCode = entry.error.statusCode || 500;
        stats.byStatusCode[statusCode] = (stats.byStatusCode[statusCode] || 0) + 1;

        // Count by endpoint
        if (entry.request?.url) {
          const endpoint = entry.request.url.split('?')[0];
          stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
        }

        // Count by error type
        const errorType = entry.error.name || 'Unknown';
        stats.byErrorType[errorType] = (stats.byErrorType[errorType] || 0) + 1;

        // Count critical errors
        if (statusCode >= 500) {
          stats.criticalCount++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }

  /**
   * Clean old error logs
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      for (const logFile of [this.errorLog, this.criticalLog]) {
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.split('\n')
          .filter(line => line)
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(entry => entry && new Date(entry.timestamp) > cutoff)
          .map(entry => JSON.stringify(entry))
          .join('\n');

        await fs.writeFile(logFile, lines + '\n');
      }

      console.log(`✅ Cleaned error logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to clean error logs:', error);
    }
  }
}

// Export singleton instance and error classes
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
module.exports.ErrorHandler = ErrorHandler;
module.exports.ValidationError = ErrorHandler.ValidationError;
module.exports.AuthenticationError = ErrorHandler.AuthenticationError;
module.exports.AuthorizationError = ErrorHandler.AuthorizationError;
module.exports.NotFoundError = ErrorHandler.NotFoundError;
module.exports.ConflictError = ErrorHandler.ConflictError;
module.exports.RateLimitError = ErrorHandler.RateLimitError;
module.exports.DatabaseError = ErrorHandler.DatabaseError;
module.exports.ExternalServiceError = ErrorHandler.ExternalServiceError;
