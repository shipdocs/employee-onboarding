/**
 * Error Middleware for API Routes
 * Provides centralized error handling for all API endpoints
 */

const ErrorHandler = require('../errorHandler.js');
const secureErrorHandler = require('../security/SecureErrorHandler');

// Global error handling middleware
async function errorMiddleware(error, req, res, next) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Use secure error handler
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

  const result = await secureErrorHandler.handleError(error, context);
  res.status(result.clientResponse.error.statusCode)
     .json(result.clientResponse);
}

// Request ID middleware - adds correlation ID to all requests
function requestIdMiddleware(req, res, next) {
  // Check if request ID already exists (from load balancer, etc.)
  const existingRequestId = req.headers['x-request-id'] ||
                           req.headers['x-correlation-id'] ||
                           req.headers['request-id'];

  if (!existingRequestId) {
    req.headers['x-request-id'] = ErrorHandler.generateRequestId();
  }

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.headers['x-request-id']);

  next();
}

// Method validation middleware
function methodValidationMiddleware(allowedMethods = ['GET']) {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      const error = ErrorHandler.createErrorResponse(
        'VALIDATION_INVALID_METHOD',
        `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
        { allowedMethods, requestedMethod: req.method }
      );
      return next(error);
    }
    next();
  };
}

// Content-Type validation middleware
function contentTypeValidationMiddleware(requiredType = 'application/json') {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];

      if (!contentType || !contentType.includes(requiredType)) {
        const error = ErrorHandler.createErrorResponse(
          'VALIDATION_INVALID_CONTENT_TYPE',
          `Invalid Content-Type. Expected: ${requiredType}`,
          { expected: requiredType, received: contentType }
        );
        return next(error);
      }
    }
    next();
  };
}

// Request size validation middleware
function requestSizeValidationMiddleware(maxSizeBytes = 1024 * 1024) { // 1MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSizeBytes) {
      const error = ErrorHandler.createErrorResponse(
        'VALIDATION_REQUEST_TOO_LARGE',
        `Request size exceeds limit of ${Math.round(maxSizeBytes / 1024)}KB`,
        { maxSize: maxSizeBytes, requestSize: contentLength }
      );
      return next(error);
    }
    next();
  };
}

// Rate limiting error handler
function rateLimitErrorHandler(req, res, next, rateLimitInfo) {
  const error = ErrorHandler.createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    `Rate limit exceeded. Try again in ${rateLimitInfo.retryAfter} seconds.`,
    {
      limit: rateLimitInfo.limit,
      remaining: rateLimitInfo.remaining,
      retryAfter: rateLimitInfo.retryAfter,
      resetTime: rateLimitInfo.resetTime
    }
  );

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime);
  res.setHeader('Retry-After', rateLimitInfo.retryAfter);

  next(error);
}

// Authentication error handler
function authErrorHandler(req, res, next, authError) {
  let error;

  if (authError.type === 'token_expired') {
    error = ErrorHandler.createErrorResponse(
      'AUTH_TOKEN_EXPIRED',
      'Authentication token has expired',
      { expiredAt: authError.expiredAt }
    );
  } else if (authError.type === 'token_invalid') {
    error = ErrorHandler.createErrorResponse(
      'AUTH_TOKEN_INVALID',
      'Invalid authentication token',
      { reason: authError.reason }
    );
  } else if (authError.type === 'insufficient_permissions') {
    error = ErrorHandler.createErrorResponse(
      'AUTH_INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions for this operation',
      {
        requiredPermissions: authError.requiredPermissions,
        userPermissions: authError.userPermissions
      }
    );
  } else {
    error = ErrorHandler.createErrorResponse(
      'AUTH_INVALID_CREDENTIALS',
      'Authentication failed'
    );
  }

  next(error);
}

// Database error handler
function databaseErrorHandler(dbError) {
  if (dbError.code === 'PGRST116') {
    // No rows returned
    return ErrorHandler.createErrorResponse(
      'DB_RECORD_NOT_FOUND',
      'Requested record not found'
    );
  } else if (dbError.code === 'PGRST301') {
    // Constraint violation
    return ErrorHandler.createErrorResponse(
      'DB_CONSTRAINT_VIOLATION',
      'Database constraint violation',
      { constraint: dbError.details }
    );
  } else if (dbError.message?.includes('connection')) {
    return ErrorHandler.createErrorResponse(
      'DB_CONNECTION_ERROR',
      'Database connection failed'
    );
  } else {
    return ErrorHandler.createErrorResponse(
      'DB_QUERY_ERROR',
      'Database operation failed',
      { originalError: dbError.message }
    );
  }
}

// Service error handler for external services
function serviceErrorHandler(serviceError, serviceName) {
  if (serviceError.code === 'ECONNREFUSED' || serviceError.code === 'ENOTFOUND') {
    return ErrorHandler.createErrorResponse(
      'SERVICE_UNAVAILABLE',
      `${serviceName} service is unavailable`,
      { service: serviceName, reason: 'Connection failed' }
    );
  } else if (serviceError.code === 'ETIMEDOUT') {
    return ErrorHandler.createErrorResponse(
      'SERVICE_TIMEOUT',
      `${serviceName} service timeout`,
      { service: serviceName, timeout: serviceError.timeout }
    );
  } else if (serviceError.response?.status === 429) {
    return ErrorHandler.createErrorResponse(
      'SERVICE_QUOTA_EXCEEDED',
      `${serviceName} service quota exceeded`,
      { service: serviceName, retryAfter: serviceError.response.headers['retry-after'] }
    );
  } else {
    return ErrorHandler.createErrorResponse(
      'SERVICE_ERROR',
      `${serviceName} service error`,
      { service: serviceName, originalError: serviceError.message }
    );
  }
}

// Validation error handler
function validationErrorHandler(validationErrors) {
  const errors = Array.isArray(validationErrors) ? validationErrors : [validationErrors];

  return ErrorHandler.createErrorResponse(
    'VALIDATION_FAILED',
    'Request validation failed',
    {
      errors: errors.map(err => ({
        field: err.field || err.path,
        message: err.message,
        value: err.value,
        code: err.code
      }))
    }
  );
}

// Async wrapper for route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error boundary for catching unhandled errors
function errorBoundary(req, res, next) {
  // Catch unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    // console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    const error = ErrorHandler.createErrorResponse(
      'SYSTEM_INTERNAL_ERROR',
      'An unexpected error occurred',
      { reason: reason.toString() }
    );

    if (!res.headersSent) {
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

      const result = await secureErrorHandler.handleError(error, context);
      res.status(result.clientResponse.error.statusCode)
         .json(result.clientResponse);
    }
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', async (error) => {
    // console.error('Uncaught Exception:', error);

    const apiError = ErrorHandler.createErrorResponse(
      'SYSTEM_INTERNAL_ERROR',
      'A critical error occurred',
      { error: error.message }
    );

    if (!res.headersSent) {
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

      const result = await secureErrorHandler.handleError(apiError, context);
      res.status(result.clientResponse.error.statusCode)
         .json(result.clientResponse);
    }

    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  next();
}

module.exports = {
  errorMiddleware,
  requestIdMiddleware,
  methodValidationMiddleware,
  contentTypeValidationMiddleware,
  requestSizeValidationMiddleware,
  rateLimitErrorHandler,
  authErrorHandler,
  databaseErrorHandler,
  serviceErrorHandler,
  validationErrorHandler,
  asyncHandler,
  errorBoundary
};
