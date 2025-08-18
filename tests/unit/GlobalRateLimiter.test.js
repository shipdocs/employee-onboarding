// tests/unit/GlobalRateLimiter.test.js - Tests for GlobalRateLimiter
const { GlobalRateLimiter, MemoryRateLimitStore } = require('../../lib/security/GlobalRateLimiter');

// Mock the features module to enable rate limiting for tests
jest.mock('../../config/features', () => ({
  isEnabled: jest.fn((feature) => {
    if (feature === 'RATE_LIMITING_ENABLED') return true;
    return false;
  }),
  FEATURES: {
    RATE_LIMITING_ENABLED: 'RATE_LIMITING_ENABLED'
  }
}));

// Mock supabase to prevent database calls during tests
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

describe('GlobalRateLimiter', () => {
  let rateLimiter;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    rateLimiter = new GlobalRateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3,
      enableLogging: false // Disable logging for tests
    });

    mockReq = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-agent'
      },
      url: '/test',
      method: 'GET'
    };

    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.destroy();
    }
  });

  describe('MemoryRateLimitStore', () => {
    let store;

    beforeEach(() => {
      store = new MemoryRateLimitStore();
    });

    afterEach(() => {
      store.destroy();
    });

    test('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { count: 1, resetTime: Date.now() + 1000 };

      await store.set(key, data, 1000);
      const retrieved = await store.get(key);

      expect(retrieved).toEqual(data);
    });

    test('should return null for non-existent key', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });

    test('should delete data', async () => {
      const key = 'test-key';
      const data = { count: 1, resetTime: Date.now() + 1000 };

      await store.set(key, data, 1000);
      const deleted = await store.delete(key);
      const retrieved = await store.get(key);

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    test('should clear all data', async () => {
      await store.set('key1', { count: 1 }, 1000);
      await store.set('key2', { count: 2 }, 1000);

      await store.clear();

      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();
    });

    test('should expire old entries', async () => {
      const key = 'test-key';
      const expiredData = { count: 1, resetTime: Date.now() - 1000 }; // Already expired

      await store.set(key, expiredData, 1000);
      const retrieved = await store.get(key);

      expect(retrieved).toBeNull();
    });
  });

  describe('checkRateLimit', () => {
    test('should allow requests within limit', async () => {
      const options = {
        windowMs: 1000,
        maxRequests: 3,
        keyGenerator: () => 'test-key',
        skipConditions: [],
        violationHandler: jest.fn()
      };

      const result1 = await rateLimiter.checkRateLimit(mockReq, options);
      const result2 = await rateLimiter.checkRateLimit(mockReq, options);

      expect(result1.allowed).toBe(true);
      expect(result1.count).toBe(1);
      expect(result1.remaining).toBe(2);

      expect(result2.allowed).toBe(true);
      expect(result2.count).toBe(2);
      expect(result2.remaining).toBe(1);
    });

    test('should block requests exceeding limit', async () => {
      const options = {
        windowMs: 1000,
        maxRequests: 2,
        keyGenerator: () => 'test-key',
        skipConditions: [],
        violationHandler: jest.fn()
      };

      // Make requests up to limit
      await rateLimiter.checkRateLimit(mockReq, options);
      await rateLimiter.checkRateLimit(mockReq, options);

      // This should be blocked
      const result = await rateLimiter.checkRateLimit(mockReq, options);

      expect(result.allowed).toBe(false);
      expect(result.violation).toBeDefined();
      expect(result.violation.count).toBe(2);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should reset after window expires', async () => {
      const options = {
        windowMs: 100, // 100ms window
        maxRequests: 1,
        keyGenerator: () => 'test-key',
        skipConditions: [],
        violationHandler: jest.fn()
      };

      // Use up the limit
      const result1 = await rateLimiter.checkRateLimit(mockReq, options);
      expect(result1.allowed).toBe(true);

      // Should be blocked
      const result2 = await rateLimiter.checkRateLimit(mockReq, options);
      expect(result2.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const result3 = await rateLimiter.checkRateLimit(mockReq, options);
      expect(result3.allowed).toBe(true);
      expect(result3.count).toBe(1);
    });

    test('should skip when skip condition is met', async () => {
      const options = {
        windowMs: 1000,
        maxRequests: 1,
        keyGenerator: () => 'test-key',
        skipConditions: [
          async (req) => req.skipRateLimit === true
        ],
        violationHandler: jest.fn()
      };

      mockReq.skipRateLimit = true;

      const result = await rateLimiter.checkRateLimit(mockReq, options);

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe('middleware', () => {
    test('should call next() when request is allowed', (done) => {
      const middleware = rateLimiter.middleware({
        windowMs: 1000,
        maxRequests: 5,
        enableLogging: false
      });

      const next = jest.fn(() => {
        expect(next).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        done();
      });

      middleware(mockReq, mockRes, next);
    });

    test('should return 429 when rate limit exceeded', async () => {
      const middleware = rateLimiter.middleware({
        windowMs: 1000,
        maxRequests: 1,
        enableLogging: false
      });

      // First request should pass
      await new Promise((resolve) => {
        middleware(mockReq, mockRes, resolve);
      });

      // Second request should be blocked
      await new Promise((resolve) => {
        const next = jest.fn();
        middleware(mockReq, mockRes, next);
        
        setTimeout(() => {
          expect(mockRes.status).toHaveBeenCalledWith(429);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: 'Too many requests'
            })
          );
          expect(next).not.toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    test('should add rate limit headers', (done) => {
      const middleware = rateLimiter.middleware({
        windowMs: 1000,
        maxRequests: 5,
        enableHeaders: true,
        enableLogging: false
      });

      const next = jest.fn(() => {
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
        done();
      });

      middleware(mockReq, mockRes, next);
    });
  });

  describe('getClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      };

      const ip = rateLimiter.getClientIP(req);
      expect(ip).toBe('192.168.1.1');
    });

    test('should extract IP from x-real-ip header', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      };

      const ip = rateLimiter.getClientIP(req);
      expect(ip).toBe('192.168.1.2');
    });

    test('should return unknown for missing IP', () => {
      const req = { headers: {} };

      const ip = rateLimiter.getClientIP(req);
      expect(ip).toBe('unknown');
    });
  });

  describe('rate limit management', () => {
    test('should clear rate limit for key', async () => {
      const key = 'test-key';
      
      // Set up a rate limit
      await rateLimiter.checkRateLimit(mockReq, {
        windowMs: 1000,
        maxRequests: 1,
        keyGenerator: () => key,
        skipConditions: [],
        violationHandler: jest.fn()
      });

      // Clear the rate limit
      const cleared = await rateLimiter.clearRateLimit(key);
      expect(cleared).toBe(true);

      // Should be able to make request again
      const result = await rateLimiter.checkRateLimit(mockReq, {
        windowMs: 1000,
        maxRequests: 1,
        keyGenerator: () => key,
        skipConditions: [],
        violationHandler: jest.fn()
      });

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    test('should get rate limit status', async () => {
      const key = 'test-key';
      
      // Make a request to create rate limit data
      await rateLimiter.checkRateLimit(mockReq, {
        windowMs: 1000,
        maxRequests: 5,
        keyGenerator: () => key,
        skipConditions: [],
        violationHandler: jest.fn()
      });

      const status = await rateLimiter.getRateLimitStatus(key);
      
      expect(status).toBeDefined();
      expect(status.key).toBe(key);
      expect(status.count).toBe(1);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });
  });
});