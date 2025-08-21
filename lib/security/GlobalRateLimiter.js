// lib/security/GlobalRateLimiter.js - Comprehensive Rate Limiting System
const { supabase } = require('../database-supabase-compat');
const { isEnabled, FEATURES } = require('../../config/features');
const { environmentConfig } = require('../../config/environment');

/**
 * Rate limit store interface - defines the contract for rate limit storage
 */
class RateLimitStore {
  async get(key) {
    throw new Error('RateLimitStore.get() must be implemented');
  }

  async set(key, data, ttlMs) {
    throw new Error('RateLimitStore.set() must be implemented');
  }

  async delete(key) {
    throw new Error('RateLimitStore.delete() must be implemented');
  }

  async clear() {
    throw new Error('RateLimitStore.clear() must be implemented');
  }
}

/**
 * In-memory rate limit store implementation
 * Suitable for development and single-instance deployments
 */
class MemoryRateLimitStore extends RateLimitStore {
  constructor() {
    super();
    this.store = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  startCleanup() {
    // Clean up expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, data] of this.store.entries()) {
        if (now >= data.resetTime) {
          this.store.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 [RATE LIMIT] Cleaned up ${cleanedCount} expired entries`);
      }
    }, 2 * 60 * 1000);
  }

  async get(key) {
    const data = this.store.get(key);
    if (!data) return null;

    // Check if expired
    if (Date.now() >= data.resetTime) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  async set(key, data, ttlMs) {
    try {
      this.store.set(key, data);
      return true;
    } catch (error) {
      console.error('MemoryRateLimitStore.set error:', error);
      return false;
    }
  }

  async delete(key) {
    return this.store.delete(key);
  }

  async clear() {
    this.store.clear();
    return true;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  // Get store statistics
  getStats() {
    return {
      size: this.store.size,
      type: 'memory'
    };
  }
}

/**
 * Redis rate limit store implementation
 * Suitable for production and multi-instance deployments
 */
class RedisRateLimitStore extends RateLimitStore {
  constructor(redisClient) {
    super();
    this.redis = redisClient;
    this.keyPrefix = 'ratelimit:';
  }

  async get(key) {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(`${this.keyPrefix}${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('RedisRateLimitStore.get error:', error);
      return null;
    }
  }

  async set(key, data, ttlMs) {
    if (!this.redis) return false;

    try {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      const serializedData = JSON.stringify(data);
      await this.redis.setex(`${this.keyPrefix}${key}`, ttlSeconds, serializedData);
      return true;
    } catch (error) {
      console.error('RedisRateLimitStore.set error:', error);
      return false;
    }
  }

  async delete(key) {
    if (!this.redis) return false;

    try {
      const result = await this.redis.del(`${this.keyPrefix}${key}`);
      return result > 0;
    } catch (error) {
      console.error('RedisRateLimitStore.delete error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.redis) return false;

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('RedisRateLimitStore.clear error:', error);
      return false;
    }
  }

  // Get store statistics
  async getStats() {
    if (!this.redis) return { size: 0, type: 'redis', connected: false };

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      return {
        size: keys.length,
        type: 'redis',
        connected: true
      };
    } catch (error) {
      return { size: 0, type: 'redis', connected: false, error: error.message };
    }
  }
}

/**
 * Global Rate Limiter - Comprehensive rate limiting system
 */
class GlobalRateLimiter {
  constructor(options = {}) {
    this.store = null;
    this.defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: this.defaultKeyGenerator.bind(this),
      skipConditions: [],
      violationHandler: this.defaultViolationHandler.bind(this),
      enableLogging: true,
      enableHeaders: true,
      failureMode: 'allow' // 'allow' or 'deny'
    };

    this.options = { ...this.defaultOptions, ...options };
    this.initializeStore();
  }

  /**
   * Initialize the appropriate rate limit store
   */
  initializeStore() {
    const config = environmentConfig.getConfig();
    const provider = config.security.rateLimitProvider;

    if (provider === 'redis' && process.env.REDIS_URL) {
      // In production with Redis available
      try {
        // Note: Redis client would need to be initialized here
        console.log('⚡ [RATE LIMIT] Redis store configured but not implemented - falling back to memory');
        this.store = new MemoryRateLimitStore();
      } catch (error) {
        console.error('⚠️ [RATE LIMIT] Redis initialization failed, falling back to memory:', error.message);
        this.store = new MemoryRateLimitStore();
      }
    } else {
      // Development or no Redis available
      this.store = new MemoryRateLimitStore();
      console.log('⚡ [RATE LIMIT] Using in-memory store');
    }
  }

  /**
   * Default key generator - uses IP address
   */
  defaultKeyGenerator(req) {
    return this.getClientIP(req);
  }

  /**
   * Default violation handler
   */
  async defaultViolationHandler(req, violation) {
    if (this.options.enableLogging) {
      await this.logRateLimitViolation(req, violation);
    }
  }

  /**
   * Create rate limiting middleware
   */
  middleware(options = {}) {
    const mergedOptions = { ...this.options, ...options };

    return async (req, res, next) => {
      // Check if rate limiting is enabled
      if (!isEnabled(FEATURES.RATE_LIMITING_ENABLED)) {
        return next();
      }

      try {
        const result = await this.checkRateLimit(req, mergedOptions);

        if (result.allowed) {
          // Add rate limit headers
          if (mergedOptions.enableHeaders) {
            this.addRateLimitHeaders(res, result);
          }
          return next();
        } else {
          // Rate limit exceeded
          await mergedOptions.violationHandler(req, result.violation);

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
            limit: mergedOptions.maxRequests,
            windowMs: mergedOptions.windowMs
          });
        }
      } catch (error) {
        console.error('Rate limiting middleware error:', error);

        // Fail according to configured mode
        if (mergedOptions.failureMode === 'deny') {
          return res.status(500).json({
            error: 'Rate limiting service unavailable',
            message: 'Please try again later'
          });
        } else {
          // Fail open - allow request but log the error
          console.warn('⚠️ [RATE LIMIT] Allowing request due to rate limiting failure');
          return next();
        }
      }
    };
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(req, options) {
    const key = options.keyGenerator(req);
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;

    // Check skip conditions
    for (const skipCondition of options.skipConditions) {
      if (await skipCondition(req)) {
        return { allowed: true, skipped: true };
      }
    }

    // Get current rate limit data
    let rateLimitData = await this.store.get(key);

    if (!rateLimitData || now >= rateLimitData.resetTime) {
      // Initialize or reset rate limit data
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now,
        windowMs: windowMs
      };
    }

    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

      return {
        allowed: false,
        retryAfter: retryAfter,
        violation: {
          key: key,
          count: rateLimitData.count,
          limit: maxRequests,
          windowMs: windowMs,
          resetTime: rateLimitData.resetTime,
          firstRequest: rateLimitData.firstRequest
        }
      };
    }

    // Increment counter and save
    rateLimitData.count++;
    const ttl = rateLimitData.resetTime - now;
    await this.store.set(key, rateLimitData, ttl);

    return {
      allowed: true,
      count: rateLimitData.count,
      limit: maxRequests,
      remaining: maxRequests - rateLimitData.count,
      resetTime: rateLimitData.resetTime,
      retryAfter: 0
    };
  }

  /**
   * Add rate limit headers to response
   */
  addRateLimitHeaders(res, result) {
    res.setHeader('X-RateLimit-Limit', result.limit || 0);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining || 0));
    res.setHeader('X-RateLimit-Reset', Math.ceil((result.resetTime || Date.now()) / 1000));

    if (result.retryAfter > 0) {
      res.setHeader('Retry-After', result.retryAfter);
    }
  }

  /**
   * Create endpoint-specific rate limiter
   */
  createEndpointLimiter(endpoint, options = {}) {
    const endpointOptions = {
      ...this.options,
      ...options,
      keyGenerator: (req) => `${endpoint}:${this.getClientIP(req)}`
    };

    return this.middleware(endpointOptions);
  }

  /**
   * Clear rate limit for a specific key
   */
  async clearRateLimit(key) {
    try {
      return await this.store.delete(key);
    } catch (error) {
      console.error('Error clearing rate limit:', error);
      return false;
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key) {
    try {
      const data = await this.store.get(key);
      if (!data) return null;

      const now = Date.now();
      return {
        key: key,
        count: data.count,
        resetTime: data.resetTime,
        remaining: Math.max(0, data.resetTime - now),
        isExpired: now >= data.resetTime
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Get client IP address from request
   */
  getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] || // Cloudflare
      req.headers['x-client-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Log rate limit violations for security monitoring
   */
  async logRateLimitViolation(req, violation) {
    try {
      const eventId = `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ipAddress = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Determine severity based on violation count
      let severity = 'medium';
      if (violation.count > violation.limit * 3) {
        severity = 'critical';
      } else if (violation.count > violation.limit * 2) {
        severity = 'high';
      }

      // Log to security_events table
      await supabase
        .from('security_events')
        .insert({
          event_id: eventId,
          type: 'rate_limit_violation',
          severity: severity,
          user_id: req.user?.id || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            endpoint: req.url || req.path || 'unknown',
            method: req.method || 'unknown',
            rate_limit_key: violation.key,
            current_count: violation.count,
            limit: violation.limit,
            window_ms: violation.windowMs,
            first_request: new Date(violation.firstRequest).toISOString(),
            reset_time: new Date(violation.resetTime).toISOString(),
            timestamp: new Date().toISOString(),
            potential_attack: violation.count > violation.limit * 2,
            headers: {
              'user-agent': userAgent,
              'x-forwarded-for': req.headers['x-forwarded-for'],
              'referer': req.headers['referer']
            }
          },
          threats: this.classifyThreats(violation)
        });

      // Also log to audit_log for backwards compatibility
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.user?.id || null,
          action: 'rate_limit_violation',
          resource_type: 'security',
          details: {
            ip_address: ipAddress,
            user_agent: userAgent,
            endpoint: req.url || req.path || 'unknown',
            method: req.method || 'unknown',
            rate_limit_key: violation.key,
            request_count: violation.count,
            window_start: new Date(violation.firstRequest).toISOString()
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });

    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Classify threats based on violation patterns
   */
  classifyThreats(violation) {
    const threats = ['rate_limit_violation'];

    if (violation.count > violation.limit * 3) {
      threats.push('potential_ddos_attack');
    }

    if (violation.count > violation.limit * 2) {
      threats.push('brute_force_attempt');
    }

    if (violation.count > violation.limit * 5) {
      threats.push('automated_attack');
    }

    return threats;
  }

  /**
   * Get store statistics
   */
  async getStoreStats() {
    if (this.store && typeof this.store.getStats === 'function') {
      return await this.store.getStats();
    }
    return { size: 0, type: 'unknown' };
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy() {
    if (this.store && typeof this.store.destroy === 'function') {
      this.store.destroy();
    }
  }
}

// Create singleton instance
const globalRateLimiter = new GlobalRateLimiter();

module.exports = {
  GlobalRateLimiter,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  RateLimitStore,
  globalRateLimiter
};
