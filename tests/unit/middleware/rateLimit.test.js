/**
 * Unit tests for rate limiting middleware
 * Tests request throttling, IP-based limiting, and custom rate limiters
 */

const {
  withRateLimit,
  authRateLimit,
  uploadRateLimit,
  apiRateLimit,
  adminRateLimit,
  getClientIP,
  logRateLimitViolation,
  clearRateLimit,
  getRateLimitStatus
} = require('../../../lib/rateLimit');

// Mock the supabase client
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  }
}));

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    jest.clearAllMocks();
  });

  describe('getClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      };
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    test('should extract IP from x-real-ip header', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      };
      expect(getClientIP(req)).toBe('192.168.1.2');
    });

    test('should extract IP from connection.remoteAddress', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.3'
        }
      };
      expect(getClientIP(req)).toBe('192.168.1.3');
    });

    test('should extract IP from socket.remoteAddress', () => {
      const req = {
        headers: {},
        socket: {
          remoteAddress: '192.168.1.4'
        }
      };
      expect(getClientIP(req)).toBe('192.168.1.4');
    });

    test('should return unknown if no IP found', () => {
      const req = {
        headers: {}
      };
      expect(getClientIP(req)).toBe('unknown');
    });
  });

  describe('withRateLimit', () => {
    const mockHandler = jest.fn((req, res) => {
      res.status(200).json({ success: true });
    });

    test('should allow requests within rate limit', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 5
      });

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        await rateLimitedHandler(req, res);
      }

      expect(mockHandler).toHaveBeenCalledTimes(5);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });

    test('should block requests exceeding rate limit', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.2' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 2
      });

      // Make 2 requests (within limit)
      await rateLimitedHandler(req, res);
      await rateLimitedHandler(req, res);

      // Third request should be blocked
      res.headersSent = false; // Reset for third request
      await rateLimitedHandler(req, res);

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many requests',
        message: expect.stringContaining('Rate limit exceeded')
      }));
    });

    test('should use custom key generator', async () => {
      const req = {
        headers: { 
          'x-forwarded-for': '192.168.1.3',
          'user-id': 'user123'
        }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const customKeyGenerator = (req) => req.headers['user-id'];
      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 1,
        keyGenerator: customKeyGenerator
      });

      await rateLimitedHandler(req, res);

      // Different IP but same user ID should be rate limited
      const req2 = {
        headers: { 
          'x-forwarded-for': '192.168.1.4',
          'user-id': 'user123'
        }
      };
      const res2 = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await rateLimitedHandler(req2, res2);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(res2.status).toHaveBeenCalledWith(429);
    });

    test('should reset rate limit after window expires', async () => {
      jest.useFakeTimers();

      const req = {
        headers: { 'x-forwarded-for': '192.168.1.5' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000, // 1 minute
        max: 1
      });

      // First request
      await rateLimitedHandler(req, res);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      res.headersSent = false;
      await rateLimitedHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);

      // Fast forward past the window
      jest.advanceTimersByTime(61000);

      // Third request should be allowed (new window)
      res.headersSent = false;
      res.status.mockClear();
      await rateLimitedHandler(req, res);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Predefined Rate Limiters', () => {
    const mockHandler = jest.fn((req, res) => {
      res.status(200).json({ success: true });
    });

    test('authRateLimit should limit to 5 requests per minute', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.6' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const limitedHandler = authRateLimit(mockHandler);

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        res.headersSent = false;
        await limitedHandler(req, res);
      }

      // 6th request should be blocked
      res.headersSent = false;
      await limitedHandler(req, res);

      expect(mockHandler).toHaveBeenCalledTimes(5);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('uploadRateLimit should limit to 10 uploads per minute', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.7' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const limitedHandler = uploadRateLimit(mockHandler);

      // Make 10 requests (within limit)
      for (let i = 0; i < 10; i++) {
        res.headersSent = false;
        await limitedHandler(req, res);
      }

      expect(mockHandler).toHaveBeenCalledTimes(10);

      // 11th request should be blocked
      res.headersSent = false;
      await limitedHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('apiRateLimit should limit to 100 requests per 15 minutes', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.8' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const limitedHandler = apiRateLimit(mockHandler);

      // First request should succeed
      await limitedHandler(req, res);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
    });

    test('adminRateLimit should limit to 50 operations per 15 minutes', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.9' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const limitedHandler = adminRateLimit(mockHandler);

      // First request should succeed
      await limitedHandler(req, res);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 50);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 49);
    });
  });

  describe('Rate Limit Management', () => {
    test('should get rate limit status', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.10' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockHandler = jest.fn();
      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 5
      });

      // Make some requests
      await rateLimitedHandler(req, res);
      await rateLimitedHandler(req, res);

      const status = getRateLimitStatus('api:192.168.1.10');
      expect(status).toBeDefined();
      expect(status.count).toBe(2);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    test('should clear rate limit', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.11' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockHandler = jest.fn();
      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 1
      });

      // First request
      await rateLimitedHandler(req, res);

      // Second request should be blocked
      res.headersSent = false;
      await rateLimitedHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);

      // Clear rate limit
      clearRateLimit('api:192.168.1.11');

      // Third request should now succeed
      res.headersSent = false;
      res.status.mockClear();
      await rateLimitedHandler(req, res);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rate Limit Logging', () => {
    test('should log rate limit violations', async () => {
      const { supabase } = require('../../../lib/supabase');
      const req = {
        headers: { 
          'x-forwarded-for': '192.168.1.12',
          'user-agent': 'Test Browser'
        },
        url: '/api/test',
        method: 'POST'
      };
      
      const rateLimitData = {
        count: 10,
        firstRequest: Date.now() - 30000
      };

      await logRateLimitViolation(req, 'test-key', rateLimitData);

      expect(supabase.from).toHaveBeenCalledWith('audit_log');
      expect(supabase.from().insert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'rate_limit_violation',
        resource_type: 'security',
        details: expect.objectContaining({
          ip_address: '192.168.1.12',
          user_agent: 'Test Browser',
          endpoint: '/api/test',
          method: 'POST',
          rate_limit_key: 'test-key',
          request_count: 10
        })
      }));
    });

    test('should handle logging errors gracefully', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.from().insert.mockRejectedValueOnce(new Error('DB Error'));

      const req = {
        headers: { 'x-forwarded-for': '192.168.1.13' }
      };
      
      // Should not throw
      await expect(logRateLimitViolation(req, 'test-key', {})).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should not block requests if rate limiting fails', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.14' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(() => {
          throw new Error('Header error');
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockHandler = jest.fn();
      const rateLimitedHandler = withRateLimit(mockHandler);

      // Should not throw and should call handler
      await expect(rateLimitedHandler(req, res)).resolves.not.toThrow();
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Headers', () => {
    test('should set correct rate limit headers', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.15' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockHandler = jest.fn();
      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        max: 10
      });

      await rateLimitedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(Number)
      );
    });

    test('should include retry-after in rate limit response', async () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.16' }
      };
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockHandler = jest.fn();
      const rateLimitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000, // 60 seconds
        max: 1
      });

      // First request
      await rateLimitedHandler(req, res);

      // Second request (should be blocked)
      res.headersSent = false;
      await rateLimitedHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        retryAfter: expect.any(Number)
      }));

      const response = res.json.mock.calls[0][0];
      expect(response.retryAfter).toBeGreaterThan(0);
      expect(response.retryAfter).toBeLessThanOrEqual(60);
    });
  });
});