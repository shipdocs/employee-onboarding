// api/security/rate-limit-management.js - Rate limit management utilities
const { requireAuth } = require('../../lib/auth');
const { globalRateLimiter } = require('../../lib/security/GlobalRateLimiter');
const db = require('../../lib/database');
const { adminRateLimit } = require('../../lib/rateLimit');

/**
 * Rate limit management operations
 * POST /api/security/rate-limit-management
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const authResult = await requireAuth(req, res, ['admin']);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, key, keys, reason } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Action is required'
      });
    }

    let result = {};

    switch (action) {
      case 'clear':
        if (!key && !keys) {
          return res.status(400).json({
            error: 'Bad request',
            message: 'Key or keys array is required for clear action'
          });
        }

        if (key) {
          // Clear single key
          const cleared = await globalRateLimiter.clearRateLimit(key);
          result = { key: key, cleared: cleared };

          // Log the admin action
          await logAdminAction(authResult.user, 'clear_rate_limit', { key: key, reason: reason });
        } else if (keys && Array.isArray(keys)) {
          // Clear multiple keys
          const results = {};
          for (const k of keys) {
            results[k] = await globalRateLimiter.clearRateLimit(k);
          }
          result = { keys: results };

          // Log the admin action
          await logAdminAction(authResult.user, 'clear_rate_limits', { keys: keys, reason: reason });
        }
        break;

      case 'status':
        if (!key) {
          return res.status(400).json({
            error: 'Bad request',
            message: 'Key is required for status action'
          });
        }

        const status = await globalRateLimiter.getRateLimitStatus(key);
        result = { key: key, status: status };
        break;

      case 'stats':
        const storeStats = await globalRateLimiter.getStoreStats();
        result = { storeStats: storeStats };
        break;

      default:
        return res.status(400).json({
          error: 'Bad request',
          message: `Unknown action: ${action}. Supported actions: clear, status, stats`
        });
    }

    return res.json({
      success: true,
      action: action,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit management error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform rate limit management operation'
    });
  }
}

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(user, action, details) {
  try {
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: action,
        resource_type: 'rate_limit_management',
        details: {
          admin_user: user.email,
          admin_role: user.role,
          ...details,
          timestamp: new Date().toISOString()
        },
        ip_address: null, // Would need to be passed from request
        user_agent: null  // Would need to be passed from request
      });

    // Also log to security_events for comprehensive monitoring
    await supabase
      .from('security_events')
      .insert({
        event_id: `admin_rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'admin_rate_limit_action',
        severity: 'medium',
        user_id: user.id,
        ip_address: null,
        user_agent: null,
        details: {
          action: action,
          admin_user: user.email,
          admin_role: user.role,
          ...details,
          timestamp: new Date().toISOString()
        },
        threats: []
      });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

module.exports = adminRateLimit(handler);
