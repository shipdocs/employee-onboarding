// api/config/[key].js - Configuration API endpoint
const { config } = require('../../lib/configService');
const { verifyToken } = require('../../lib/auth-commonjs');

/**
 * Configuration API
 *
 * GET /api/config/:key - Get configuration value
 * PUT /api/config/:key - Update configuration value (admin only)
 */
async function handler(req, res) {
  // Apply CORS headers
  const { applyCors } = require('../../lib/cors');
const { apiRateLimit } = require('../../lib/rateLimit');
  if (!applyCors(req, res)) {
    return; // Preflight handled
  }

  try {
    // Get configuration key from URL
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Configuration key is required' });
    }

    // Verify authentication (optional for GET, required for PUT)
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? verifyToken(token) : null;

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, key, user);
      case 'PUT':
        return handlePut(req, res, key, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (_error) {
    // console.error('Config API error:', _error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET: Retrieve configuration value
 */
async function handleGet(req, res, key, user) {
  try {
    // Check if key is allowed for public access
    const publicKeys = [
      'app.name',
      'app.supportEmail',
      'auth.sessionTimeout',
      'auth.tokenExpiryWarning',
      'training.maxQuizAttempts',
      'training.photoUploadMaxSize',
      'training.allowedPhotoTypes',
      'ui.*' // All UI settings are public
    ];

    const isPublic = publicKeys.some(pattern => {
      if (pattern.endsWith('*')) {
        return key.startsWith(pattern.slice(0, -1));
      }
      return key === pattern;
    });

    // Restrict access to sensitive keys
    if (!isPublic && !user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get configuration value
    const value = await config.get(key);

    if (value === undefined) {
      return res.status(404).json({ error: 'Configuration key not found' });
    }

    // Sanitize sensitive values
    const sanitizedValue = sanitizeValue(key, value, user);

    return res.status(200).json({
      key,
      value: sanitizedValue,
      source: getValueSource(key)
    });
  } catch (_error) {
    // console.error(`Error getting config ${key}:`, _error);
    return res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
}

/**
 * PUT: Update configuration value (admin only)
 */
async function handlePut(req, res, key, user) {
  try {
    // Require admin authentication
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if key is updatable
    const readOnlyKeys = [
      'app.version',
      'database.*',
      'features.rolloutPercentageStep'
    ];

    const isReadOnly = readOnlyKeys.some(pattern => {
      if (pattern.endsWith('*')) {
        return key.startsWith(pattern.slice(0, -1));
      }
      return key === pattern;
    });

    if (isReadOnly) {
      return res.status(403).json({ error: 'Configuration key is read-only' });
    }

    // Update configuration
    const success = await config.set(key, value);

    if (!success) {
      return res.status(400).json({ error: 'Failed to update configuration' });
    }

    // Log configuration change

    return res.status(200).json({
      message: 'Configuration updated successfully',
      key,
      value
    });
  } catch (_error) {
    // console.error(`Error updating config ${key}:`, _error);
    return res.status(500).json({ error: 'Failed to update configuration' });
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

  // Admin users can see masked versions
  if (sensitiveKeys.includes(key)) {
    if (!user || user.role !== 'admin') {
      return '***HIDDEN***';
    }
    // Show first and last 4 characters for admins
    if (typeof value === 'string' && value.length > 8) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
  }

  return value;
}

/**
 * Get the source of a configuration value
 */
function getValueSource(key) {
  const dbCategories = ['email', 'security', 'training', 'application'];
  const category = key.split('.')[0];

  if (dbCategories.includes(category)) {
    return 'database';
  }

  if (process.env[key.toUpperCase().replace(/\./g, '_')]) {
    return 'environment';
  }

  return 'default';
}

module.exports = apiRateLimit(handler);
