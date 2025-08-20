/**
 * Standardized API Handler Wrapper
 * Provides consistent error handling and request ID tracking for all API endpoints
 */

const ErrorHandler = require('./errorHandler');
const secureErrorHandler = require('./security/SecureErrorHandler');
const { requestIdMiddleware, asyncHandler } = require('./middleware/errorMiddleware');
const { authenticateToken } = require('./auth');
const { securityMonitoringMiddleware } = require('./middleware/securityMonitoring');

/**
 * Creates a standardized API handler with built-in error handling
 * @param {Function} handler - The actual API handler function
 * @param {Object} options - Configuration options
 * @param {string[]} options.allowedMethods - Allowed HTTP methods (default: ['GET'])
 * @param {boolean} options.requireAuth - Whether authentication is required (default: false)
 * @returns {Function} Wrapped handler with error handling
 */
function createAPIHandler(handler, options = {}) {
  const {
    allowedMethods = ['GET'],
    requireAuth = false
  } = options;

  return async (req, res) => {
    // Add request ID tracking
    requestIdMiddleware(req, res, () => {});

    // Apply security monitoring
    securityMonitoringMiddleware(req, res, () => {});

    try {
      // Method validation
      if (!allowedMethods.includes(req.method)) {
        throw ErrorHandler.createErrorResponse(
          'VALIDATION_INVALID_METHOD',
          `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
          { allowedMethods, requestedMethod: req.method }
        );
      }

      // Authentication validation
      if (requireAuth) {
        const authResult = await authenticateToken(req);
        if (!authResult.success) {
          throw ErrorHandler.createErrorResponse(
            'AUTH_TOKEN_INVALID',
            authResult.error || 'Authentication required',
            { requiresAuth: true }
          );
        }
        // Add authenticated user to request object
        req.user = authResult.user;
      }

      // Execute the handler
      await handler(req, res);
    } catch (error) {
      // Handle any errors using the secure error handler
      const context = {
        userId: req.user?.userId || req.user?.id,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        requestId: req.headers['x-request-id'],
        userRole: req.user?.role,
        requestData: req.body,
        userInput: req.query.q || req.body?.content || req.body?.message
      };

      const errorResult = await secureErrorHandler.handleError(error, context);
      res.status(errorResult.clientResponse.error.statusCode)
         .json(errorResult.clientResponse);
    }
  };
}

/**
 * Wraps an existing handler with error handling
 * Useful for handlers that already have authentication middleware applied
 * @param {Function} handler - The handler function (already wrapped with auth if needed)
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped handler with error handling
 */
function wrapWithErrorHandling(handler, options = {}) {
  return async (req, res) => {
    // Add request ID tracking
    requestIdMiddleware(req, res, () => {});

    // Apply security monitoring
    securityMonitoringMiddleware(req, res, () => {});

    try {
      await handler(req, res);
    } catch (error) {
      // Handle any errors using the secure error handler
      const context = {
        userId: req.user?.userId || req.user?.id,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        requestId: req.headers['x-request-id'],
        userRole: req.user?.role,
        requestData: req.body,
        userInput: req.query.q || req.body?.content || req.body?.message
      };

      const errorResult = await secureErrorHandler.handleError(error, context);
      res.status(errorResult.clientResponse.error.statusCode)
         .json(errorResult.clientResponse);
    }
  };
}

/**
 * Creates consistent error responses
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Custom error message (optional)
 * @param {Object} details - Additional error details
 * @returns {APIError} Formatted error object
 */
function createError(code, message = null, details = null) {
  return ErrorHandler.createErrorResponse(code, message, details);
}

/**
 * Helper to create validation errors
 */
function createValidationError(message, details = null) {
  return ErrorHandler.createErrorResponse('VALIDATION_INVALID_FORMAT', message, details);
}

/**
 * Helper to create authentication errors
 */
function createAuthError(message = 'Authentication failed', details = null) {
  return ErrorHandler.createErrorResponse('AUTH_TOKEN_INVALID', message, details);
}

/**
 * Helper to create database errors
 */
function createDatabaseError(message = 'Database operation failed', details = null) {
  return ErrorHandler.createErrorResponse('DB_QUERY_ERROR', message, details);
}

/**
 * Helper to create not found errors
 */
function createNotFoundError(resource = 'Resource', details = null) {
  return ErrorHandler.createErrorResponse('DB_RECORD_NOT_FOUND', `${resource} not found`, details);
}

module.exports = {
  createAPIHandler,
  wrapWithErrorHandling,
  createError,
  createValidationError,
  createAuthError,
  createDatabaseError,
  createNotFoundError,
  // Re-export ERROR_CODES for convenience
  ERROR_CODES: ErrorHandler.ERROR_CODES
};
