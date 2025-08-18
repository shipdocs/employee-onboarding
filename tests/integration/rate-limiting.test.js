// tests/integration/rate-limiting.test.js - Integration tests for rate limiting
const request = require('supertest');
const { createServer } = require('http');
const { parse } = require('url');

// Mock Next.js API handler
const mockApp = (req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname } = parsedUrl;
  
  // Simple mock handler that just returns success
  if (pathname === '/api/test-rate-limit') {
    const { authRateLimit } = require('../../lib/rateLimit');
    const handler = async (req, res) => {
      res.status(200).json({ success: true, timestamp: Date.now() });
    };
    
    return authRateLimit(handler)(req, res);
  }
  
  res.status(404).json({ error: 'Not found' });
};

describe('Rate Limiting Integration', () => {
  let server;
  
  beforeAll(() => {
    server = createServer(mockApp);
  });
  
  afterAll(() => {
    if (server) {
      server.close();
    }
  });
  
  test('should allow requests within rate limit', async () => {
    const response1 = await request(server)
      .get('/api/test-rate-limit')
      .expect(200);
    
    expect(response1.body.success).toBe(true);
    expect(response1.headers['x-ratelimit-limit']).toBeDefined();
    expect(response1.headers['x-ratelimit-remaining']).toBeDefined();
  });
  
  test('should block requests exceeding rate limit', async () => {
    // Make multiple requests quickly to exceed the limit
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        request(server)
          .get('/api/test-rate-limit')
          .set('x-forwarded-for', '192.168.1.100') // Use consistent IP
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Some requests should be blocked (429)
    const blockedResponses = responses.filter(r => r.status === 429);
    expect(blockedResponses.length).toBeGreaterThan(0);
    
    // Blocked responses should have retry-after header
    if (blockedResponses.length > 0) {
      expect(blockedResponses[0].headers['retry-after']).toBeDefined();
    }
  }, 10000);
  
  test('should include proper rate limit headers', async () => {
    const response = await request(server)
      .get('/api/test-rate-limit')
      .set('x-forwarded-for', '192.168.1.101') // Use different IP
      .expect(200);
    
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
    
    const limit = parseInt(response.headers['x-ratelimit-limit']);
    const remaining = parseInt(response.headers['x-ratelimit-remaining']);
    
    expect(limit).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(limit);
  });
});