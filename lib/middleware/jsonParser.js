/**
 * Custom JSON parser middleware that properly handles special characters
 * Fixes issues with special characters in JSON payloads
 */

const getRawBody = require('raw-body');

/**
 * Custom JSON parser that properly handles special characters
 */
function customJsonParser(options = {}) {
  const limit = options.limit || '50mb';

  return async (req, res, next) => {
    // Skip if body already parsed
    if (req.body !== undefined) {
      return next();
    }

    // Only parse JSON content type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      req.body = {};
      return next();
    }

    try {
      // Get raw body as buffer
      const buffer = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: limit,
        encoding: 'utf8'
      });

      // Convert buffer to string (handles UTF-8 properly)
      const bodyString = buffer.toString('utf8');

      // Parse JSON
      if (bodyString.length > 0) {
        try {
          req.body = JSON.parse(bodyString);
        } catch (parseError) {
          // Log the actual body that failed to parse for debugging
          console.error('JSON Parse Error:', parseError.message);
          console.error('Body length:', bodyString.length);
          console.error('First 100 chars:', bodyString.substring(0, 100));

          return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
            details: parseError.message
          });
        }
      } else {
        req.body = {};
      }

      next();
    } catch (error) {
      console.error('Error reading request body:', error);

      if (error.type === 'entity.too.large') {
        return res.status(413).json({
          error: 'Payload too large',
          message: `Request body exceeds limit of ${limit}`
        });
      }

      return res.status(400).json({
        error: 'Bad request',
        message: 'Failed to process request body'
      });
    }
  };
}

module.exports = { customJsonParser };
