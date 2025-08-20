/**
 * Redis-based Rate Limiter
 * Provides persistent rate limiting across server restarts and multiple instances
 */

const Redis = require('redis');

class RateLimiter {
  constructor() {
    this.client = null;
    this.fallbackToMemory = false;
    this.memoryStore = new Map();
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    if (!process.env.REDIS_HOST) {
      console.warn('⚠️  REDIS_HOST not configured. Using in-memory rate limiting (not recommended for production)');
      this.fallbackToMemory = true;
      return;
    }

    try {
      this.client = Redis.createClient({
        socket: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis connection failed after 10 retries');
              this.fallbackToMemory = true;
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB || '0'),
        // Security: Use TLS in production
        ...(process.env.NODE_ENV === 'production' && process.env.REDIS_USE_SSL === 'true'
          ? { socket: { tls: true } }
          : {})
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        this.fallbackToMemory = true;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis for rate limiting');
        this.fallbackToMemory = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.fallbackToMemory = true;
    }
  }

  /**
   * Create rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {number} options.max - Maximum requests per window
   * @param {string} options.keyPrefix - Prefix for Redis keys
   * @param {Function} options.keyGenerator - Custom key generator function
   * @param {Function} options.handler - Custom handler for rate limit exceeded
   * @param {boolean} options.skipSuccessfulRequests - Skip successful requests
   * @param {boolean} options.skipFailedRequests - Skip failed requests
   */
  middleware(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100,
      keyPrefix = 'rate-limit',
      keyGenerator = (req) => req.ip || 'unknown',
      handler = null,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      const key = `${keyPrefix}:${keyGenerator(req)}`;

      try {
        let count = 0;
        let ttl = windowMs;

        if (this.fallbackToMemory) {
          // Use in-memory fallback
          count = await this.getMemoryCount(key, windowMs);
        } else {
          // Use Redis
          count = await this.getRedisCount(key, windowMs);
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl).toISOString());

        if (count > max) {
          // Rate limit exceeded
          res.setHeader('Retry-After', Math.ceil(ttl / 1000));

          if (handler) {
            return handler(req, res, next);
          }

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Please try again in ${Math.ceil(ttl / 1000)} seconds.`,
            retryAfter: Math.ceil(ttl / 1000)
          });
        }

        // Track response status for conditional counting
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalEnd = res.end;
          res.end = function(...args) {
            const shouldSkip = (skipSuccessfulRequests && res.statusCode < 400) ||
                              (skipFailedRequests && res.statusCode >= 400);

            if (shouldSkip) {
              // Decrement the count
              if (this.fallbackToMemory) {
                this.decrementMemoryCount(key);
              } else {
                this.decrementRedisCount(key);
              }
            }

            originalEnd.apply(res, args);
          }.bind(this);
        }

        next();
      } catch (error) {
        console.error('❌ Rate limiting error:', error);
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  }

  /**
   * Get count from Redis
   */
  async getRedisCount(key, windowMs) {
    const multi = this.client.multi();
    const now = Date.now();
    const window = now - windowMs;

    // Use sorted set for sliding window
    multi.zRemRangeByScore(key, '-inf', window);
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    multi.zCard(key);
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();
    return results[2]; // zCard result
  }

  /**
   * Decrement count in Redis
   */
  async decrementRedisCount(key) {
    const now = Date.now();
    await this.client.zRemRangeByScore(key, now - 1, now + 1);
  }

  /**
   * Get count from memory
   */
  async getMemoryCount(key, windowMs) {
    const now = Date.now();
    const window = now - windowMs;

    if (!this.memoryStore.has(key)) {
      this.memoryStore.set(key, []);
    }

    // Clean old entries
    const requests = this.memoryStore.get(key).filter(time => time > window);

    // Add new request
    requests.push(now);
    this.memoryStore.set(key, requests);

    // Clean up old keys periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanMemoryStore(windowMs);
    }

    return requests.length;
  }

  /**
   * Decrement count in memory
   */
  decrementMemoryCount(key) {
    if (this.memoryStore.has(key)) {
      const requests = this.memoryStore.get(key);
      requests.pop(); // Remove last request
    }
  }

  /**
   * Clean old entries from memory store
   */
  cleanMemoryStore(windowMs) {
    const now = Date.now();
    const window = now - windowMs;

    for (const [key, requests] of this.memoryStore.entries()) {
      const filtered = requests.filter(time => time > window);
      if (filtered.length === 0) {
        this.memoryStore.delete(key);
      } else {
        this.memoryStore.set(key, filtered);
      }
    }
  }

  /**
   * Create specialized rate limiters
   */
  createLimiters() {
    return {
      // General API rate limiting
      api: this.middleware({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        keyPrefix: 'api',
        skipSuccessfulRequests: false,
        skipFailedRequests: true
      }),

      // Strict rate limiting for authentication endpoints
      auth: this.middleware({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        keyPrefix: 'auth',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      }),

      // Admin endpoints
      admin: this.middleware({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50,
        keyPrefix: 'admin',
        keyGenerator: (req) => req.user?.id || req.ip || 'unknown'
      }),

      // File upload limiting
      upload: this.middleware({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20,
        keyPrefix: 'upload',
        keyGenerator: (req) => req.user?.id || req.ip || 'unknown'
      }),

      // Password reset limiting
      passwordReset: this.middleware({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        keyPrefix: 'password-reset',
        keyGenerator: (req) => req.body?.email || req.ip || 'unknown'
      }),

      // Email sending limiting
      email: this.middleware({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        keyPrefix: 'email',
        keyGenerator: (req) => req.user?.id || req.ip || 'unknown'
      })
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(keyPrefix, identifier) {
    const key = `${keyPrefix}:${identifier}`;

    if (this.fallbackToMemory) {
      this.memoryStore.delete(key);
    } else {
      await this.client.del(key);
    }
  }

  /**
   * Get current count for a key
   */
  async getCount(keyPrefix, identifier) {
    const key = `${keyPrefix}:${identifier}`;

    if (this.fallbackToMemory) {
      const requests = this.memoryStore.get(key) || [];
      return requests.length;
    } else {
      return await this.client.zCard(key);
    }
  }

  /**
   * Cleanup and close connections
   */
  async close() {
    if (this.client) {
      await this.client.quit();
    }
    this.memoryStore.clear();
  }
}

// Export singleton instance
module.exports = new RateLimiter();
