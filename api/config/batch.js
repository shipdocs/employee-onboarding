// api/config/batch.js - Batch configuration API endpoint
const { config } = require('../../lib/configService');
const { verifyToken } = require('../../lib/auth-commonjs');

/**
 * Batch Configuration API
 *
 * POST /api/config/batch - Get multiple configuration values at once
 */
async function handler(req, res) {
  // Apply CORS headers
  const { applyCors } = require('../../lib/cors');
const { apiRateLimit } = require('../../lib/rateLimit');
  if (!applyCors(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({ error: 'Keys array is required' });
    }

    if (keys.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 keys allowed per request' });
    }

    // Verify authentication (optional)
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? verifyToken(token) : null;

    // Define public keys that don't require authentication
    const publicKeyPatterns = [
      'app.name',
      'app.supportEmail',
      'auth.sessionTimeout',
      'auth.tokenExpiryWarning',
      'training.maxQuizAttempts',
      'training.photoUploadMaxSize',
      'training.allowedPhotoTypes',
      'ui.*',
      'cache.*',
      'api.timeout',
      'api.retryAttempts'
    ];

    const results = {};
    const errors = [];

    // Process each key
    await Promise.all(
      keys.map(async (key) => {
        try {
          // Check if key is public
          const isPublic = publicKeyPatterns.some(pattern => {
            if (pattern.endsWith('*')) {
              return key.startsWith(pattern.slice(0, -1));
            }
            return key === pattern;
          });

          // Skip non-public keys for unauthenticated requests
          if (!isPublic && !user) {
            return;
          }

          // Get configuration value
          const value = await config.get(key);

          if (value !== undefined) {
            // Sanitize sensitive values
            results[key] = sanitizeValue(key, value, user);
          }
        } catch (error) {
          errors.push({ key, error: error.message });
        }
      })
    );

    // Return results
    return res.status(200).json(results);
  } catch (error) {
    // console.error('Batch config API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Sanitize sensitive configuration values
 */
function sanitizeValue(key, value, user) {
  const sensitiveKeys = [
    'security.jwt_secret',
    'email.mailersend_api_key',
    'email.smtp_password',
    'database.serviceKey',
    'translation.deepl_api_key',
    'translation.google_api_key'
  ];

  if (sensitiveKeys.includes(key)) {
    if (!user || user.role !== 'admin') {
      return '***HIDDEN***';
    }
    // Show masked version for admins
    if (typeof value === 'string' && value.length > 8) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
  }

  return value;
}

module.exports = apiRateLimit(handler);
