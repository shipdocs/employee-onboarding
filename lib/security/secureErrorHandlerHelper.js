/**
 * Secure Error Handler Helper
 * Provides easy-to-use functions for API endpoints that don't use createAPIHandler
 */

const secureErrorHandler = require('./SecureErrorHandler');

/**
 * Handle error and send secure response
 * @param {Error} error - The error to handle
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} user - Optional user object for context
 */
async function handleErrorAndRespond(error, req, res, user = null) {
  const context = {
    userId: user?.id || user?.userId || req.user?.userId || req.user?.id,
    ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    requestId: req.headers['x-request-id'],
    userRole: user?.role || req.user?.role,
    requestData: req.body,
    userInput: req.query.q || req.body?.content || req.body?.message
  };

  const result = await secureErrorHandler.handleError(error, context);
  res.status(result.clientResponse.error.statusCode)
     .json(result.clientResponse);
}

/**
 * Create a simple error object for common cases
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code (optional)
 */
function createSimpleError(message, statusCode = 500, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
}

/**
 * Wrap an async handler with secure error handling
 * @param {Function} handler - The async handler function
 * @returns {Function} Wrapped handler with error handling
 */
function wrapWithSecureErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      await handleErrorAndRespond(error, req, res);
    }
  };
}

module.exports = {
  handleErrorAndRespond,
  createSimpleError,
  wrapWithSecureErrorHandling
};
