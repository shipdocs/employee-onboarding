// Standardized error handling middleware for API routes

class APIError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'APIError';
  }
}

// Standard error types
const ErrorTypes = {
  VALIDATION_ERROR: { statusCode: 400, code: 'VALIDATION_ERROR' },
  AUTHENTICATION_ERROR: { statusCode: 401, code: 'AUTHENTICATION_ERROR' },
  AUTHORIZATION_ERROR: { statusCode: 403, code: 'AUTHORIZATION_ERROR' },
  NOT_FOUND: { statusCode: 404, code: 'NOT_FOUND' },
  CONFLICT: { statusCode: 409, code: 'CONFLICT' },
  RATE_LIMIT: { statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' },
  INTERNAL_ERROR: { statusCode: 500, code: 'INTERNAL_ERROR' },
  SERVICE_UNAVAILABLE: { statusCode: 503, code: 'SERVICE_UNAVAILABLE' }
};

// Error factory functions
const createError = (type, message, details = null) => {
  const error = new APIError(message, type.statusCode, type.code);
  if (details) {
    error.details = details;
  }
  return error;
};

// Specific error creators
const validationError = (message, details) => 
  createError(ErrorTypes.VALIDATION_ERROR, message, details);

const authenticationError = (message = 'Authentication required') => 
  createError(ErrorTypes.AUTHENTICATION_ERROR, message);

const authorizationError = (message = 'Insufficient permissions') => 
  createError(ErrorTypes.AUTHORIZATION_ERROR, message);

const notFoundError = (resource = 'Resource') => 
  createError(ErrorTypes.NOT_FOUND, `${resource} not found`);

const conflictError = (message) => 
  createError(ErrorTypes.CONFLICT, message);

const rateLimitError = (message = 'Too many requests') => 
  createError(ErrorTypes.RATE_LIMIT, message);

const internalError = (message = 'Internal server error') => 
  createError(ErrorTypes.INTERNAL_ERROR, message);

// Error handler middleware
const errorHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, req, res);
    }
  };
};

// Handle error response
const handleError = (error, req, res) => {
  // Log error for monitoring
  logError(error, req);

  // Handle known API errors
  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details || undefined
    });
  }

  // Handle Supabase errors
  if (error.code && error.message) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Resource already exists',
        code: 'CONFLICT'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Invalid reference',
        code: 'VALIDATION_ERROR'
      });
    }
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Resource not found',
        code: 'NOT_FOUND'
      });
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'AUTHENTICATION_ERROR'
    });
  }
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'AUTHENTICATION_ERROR'
    });
  }

  // Default to internal error
  console.error('Unhandled error:', error);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

// Error logging
const logError = (error, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    user: req.user?.userId || 'anonymous',
    ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
  };

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
    console.error('Production error:', JSON.stringify(errorLog));
  } else {
    console.error('Error log:', errorLog);
  }
};

// Async handler wrapper for cleaner syntax
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    handleError(error, req, res);
  });
};

module.exports = {
  APIError,
  ErrorTypes,
  createError,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  conflictError,
  rateLimitError,
  internalError,
  errorHandler,
  handleError,
  asyncHandler
};