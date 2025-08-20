// lib/rateLimit.js - Rate limiting middleware for API endpoints
const { globalRateLimiter } = require('./security/GlobalRateLimiter');
const { supabase } = require('./supabase');
const { isEnabled, FEATURES } = require('../config/features');

/**
 * Rate limiting middleware using GlobalRateLimiter
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests per window
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 */
function rateLimit(options = {}) {
  const rateLimitOptions = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    maxRequests: options.max || options.maxRequests || 100, // 100 requests per window
    keyGenerator: options.keyGenerator || ((req) => getClientIP(req)),
    enableLogging: true,
    enableHeaders: true
  };

  return globalRateLimiter.middleware(rateLimitOptions);
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
function withRateLimit(handler, options = {}) {
  const rateLimiter = rateLimit(options);

  return async (req, res) => {
    return new Promise((resolve, reject) => {
      rateLimiter(req, res, (error) => {
        if (error) {
          reject(error);
        } else if (res.headersSent) {
          // Rate limit was hit, response already sent
          resolve();
        } else {
          // Continue with original handler
          resolve(handler(req, res));
        }
      });
    });
  };
}

/**
 * Predefined rate limiters for different endpoint types
 */

// Authentication endpoints - strict limits to prevent brute force
const authRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 5, // 5 attempts per minute
  keyGenerator: (req) => `auth:${getClientIP(req)}`,
  skipConditions: [
    // Skip rate limiting for successful authentications from known IPs
    async (req) => {
      // Could implement IP whitelist logic here
      return false;
    }
  ]
});

// File upload endpoints - moderate limits to prevent abuse
const uploadRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  keyGenerator: (req) => `upload:${getClientIP(req)}`,
  skipConditions: [
    // Skip for authenticated admin users
    async (req) => {
      return req.user && req.user.role === 'admin';
    }
  ]
});

// General API endpoints - standard limits
const apiRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => `api:${getClientIP(req)}`,
  skipConditions: [
    // Skip for health check endpoints
    async (req) => {
      return req.url && req.url.includes('/health');
    }
  ]
});

// Admin endpoints - moderate limits for administrative operations
const adminRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 admin operations per 15 minutes
  keyGenerator: (req) => `admin:${getClientIP(req)}:${req.user?.id || 'anonymous'}`,
  skipConditions: [
    // No skip conditions for admin endpoints - always enforce limits
  ]
});

// Email endpoints - strict limits to prevent spam
const emailRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 emails per 5 minutes
  keyGenerator: (req) => `email:${getClientIP(req)}:${req.user?.id || 'anonymous'}`
});

// Password reset endpoints - very strict limits
const passwordResetRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 password reset attempts per 15 minutes
  keyGenerator: (req) => `password_reset:${getClientIP(req)}`
});

// Quiz/training endpoints - moderate limits
const trainingRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 30, // 30 training actions per 5 minutes
  keyGenerator: (req) => `training:${getClientIP(req)}:${req.user?.id || 'anonymous'}`
});

// Search endpoints - moderate limits to prevent scraping
const searchRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20, // 20 searches per minute
  keyGenerator: (req) => `search:${getClientIP(req)}`
});

// Webhook endpoints - higher limits for legitimate integrations
const webhookRateLimit = (handler) => withRateLimit(handler, {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // 100 webhook calls per minute
  keyGenerator: (req) => `webhook:${getClientIP(req)}`,
  skipConditions: [
    // Skip for requests with valid webhook signatures
    async (req) => {
      // Could implement webhook signature validation here
      return false;
    }
  ]
});

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Log rate limit violations for security monitoring
 */
async function logRateLimitViolation(req, key, rateLimitData) {
  try {
    // Log to audit_log for backwards compatibility
    await supabase
      .from('audit_log')
      .insert({
        user_id: null,
        action: 'rate_limit_violation',
        resource_type: 'security',
        details: {
          ip_address: getClientIP(req),
          user_agent: req.headers['user-agent'],
          endpoint: req.url,
          method: req.method,
          rate_limit_key: key,
          request_count: rateLimitData.count,
          window_start: new Date(rateLimitData.firstRequest).toISOString()
        },
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent']
      });

    // Also log to security_events for enhanced monitoring
    await supabase
      .from('security_events')
      .insert({
        event_id: `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'rate_limit_exceeded',
        severity: 'high', // High severity for potential brute force
        user_id: req.user?.id || null,
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        details: {
          endpoint: req.url,
          method: req.method,
          rate_limit_key: key,
          current_count: rateLimitData.count,
          first_request: new Date(rateLimitData.firstRequest).toISOString(),
          reset_time: new Date(rateLimitData.resetTime).toISOString(),
          timestamp: new Date().toISOString(),
          potential_attack: rateLimitData.count > 10 // Flag as potential attack if many attempts
        },
        threats: ['brute_force_attempt', 'rate_limit_violation']
      });
  } catch (error) {
    // console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * Clear rate limit for a specific key (for testing or admin override)
 */
async function clearRateLimit(key) {
  return await globalRateLimiter.clearRateLimit(key);
}

/**
 * Get current rate limit status for a key
 */
async function getRateLimitStatus(key) {
  return await globalRateLimiter.getRateLimitStatus(key);
}

// Export all functions and rate limiters
module.exports = {
  withRateLimit,
  rateLimit,
  authRateLimit,
  uploadRateLimit,
  apiRateLimit,
  adminRateLimit,
  emailRateLimit,
  passwordResetRateLimit,
  trainingRateLimit,
  searchRateLimit,
  webhookRateLimit,
  getClientIP,
  logRateLimitViolation,
  clearRateLimit,
  getRateLimitStatus
};
