/**
 * Body Size Limit Middleware
 * Enforces request body size limits to prevent DoS attacks
 */

const { BODY_SIZE_LIMITS } = require('../validation');

/**
 * Raw body parser with size limit
 * For use with Vercel serverless functions
 */
function getRawBody(req, limit) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      
      if (size > limit) {
        req.pause();
        reject(new Error(`LIMIT_FILE_SIZE`));
        return;
      }
      
      data += chunk;
    });

    req.on('end', () => {
      try {
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

/**
 * Body size limit middleware
 * @param {string} type - The type of endpoint (default, auth, upload, content, api)
 * @returns {Function} Middleware function
 */
function bodySizeLimit(type = 'default') {
  const limit = BODY_SIZE_LIMITS[type] || BODY_SIZE_LIMITS.default;

  return async (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (next) next();
      return;
    }

    try {
      // For Vercel, we need to handle raw body parsing
      if (!req.body && req.headers['content-type']?.includes('application/json')) {
        const rawBody = await getRawBody(req, limit);
        req.body = JSON.parse(rawBody);
      }

      // Check content-length header
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > limit) {
        return res.status(413).json({
          error: 'Request body too large',
          message: `Maximum size is ${Math.round(limit / 1024)}KB`,
          maxSize: limit,
          receivedSize: contentLength
        });
      }

      if (next) next();
    } catch (error) {
      if (error.message === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Request body too large',
          message: `Maximum size is ${Math.round(limit / 1024)}KB`,
          maxSize: limit
        });
      }

      // JSON parse error
      if (error instanceof SyntaxError) {
        return res.status(400).json({
          error: 'Invalid JSON',
          message: 'Request body contains invalid JSON'
        });
      }

      // Other errors
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process request'
      });
    }
  };
}

/**
 * Higher-order function to wrap handlers with body size limit
 */
function withBodySizeLimit(handler, type = 'default') {
  const middleware = bodySizeLimit(type);

  return async (req, res) => {
    // Apply middleware
    await new Promise((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(() => {
      // Response already sent by middleware
    });

    // If response not sent, continue with handler
    if (!res.headersSent) {
      return handler(req, res);
    }
  };
}

module.exports = {
  bodySizeLimit,
  withBodySizeLimit,
  getRawBody
};