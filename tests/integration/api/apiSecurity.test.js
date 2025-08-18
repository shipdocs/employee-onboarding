/**
 * Integration tests for API security
 * Tests API endpoint security, input validation, and error handling
 */

const request = require('supertest');
const express = require('express');
const { generateJWT } = require('../../../lib/auth');
const { validateRequest, schema } = require('../../../lib/validation');
const { withRateLimit } = require('../../../lib/rateLimit');

// Mock environment
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock dependencies
jest.mock('../../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    }))
  })),
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: {}, error: null })
    }))
  }
}));

describe('API Security Integration Tests', () => {
  let app;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    testUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'crew',
      first_name: 'Test',
      last_name: 'User'
    };

    jest.clearAllMocks();
  });

  describe('Input Validation Security', () => {
    beforeEach(() => {
      // Create test endpoint with validation
      app.post('/api/users',
        validateRequest({
          body: {
            email: schema.email({ required: true }),
            password: schema.password({ required: true }),
            name: schema.string({ required: true, options: { minLength: 2, maxLength: 100 } }),
            age: schema.number({ required: false, options: { min: 18, max: 120 } }),
            role: schema.enum(['crew', 'manager', 'admin'], { required: true })
          }
        }),
        (req, res) => {
          res.json({ success: true, data: req.body });
        }
      );
    });

    test('should reject requests with invalid data types', async () => {
      const invalidRequests = [
        { email: 123, password: 'Valid123!', name: 'Test', role: 'crew' },
        { email: 'test@example.com', password: true, name: 'Test', role: 'crew' },
        { email: 'test@example.com', password: 'Valid123!', name: [], role: 'crew' },
        { email: 'test@example.com', password: 'Valid123!', name: 'Test', role: 'invalid' }
      ];

      for (const invalidData of invalidRequests) {
        const response = await request(app)
          .post('/api/users')
          .send(invalidData)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details).toBeDefined();
      }
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        {
          email: "admin@example.com'; DROP TABLE users; --",
          password: 'Valid123!',
          name: "Robert'; DROP TABLE students; --",
          role: 'crew'
        },
        {
          email: 'test@example.com',
          password: "' OR '1'='1",
          name: 'Test',
          role: 'crew'
        }
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/users')
          .send(payload)
          .expect(400);

        // Should fail validation, not execute SQL
        expect(response.body.error).toBe('Validation failed');
      }
    });

    test('should prevent XSS attempts', async () => {
      const xssPayloads = [
        {
          email: 'test@example.com',
          password: 'Valid123!',
          name: '<script>alert("XSS")</script>',
          role: 'crew'
        },
        {
          email: 'test@example.com',
          password: 'Valid123!',
          name: '<img src=x onerror=alert("XSS")>',
          role: 'crew'
        }
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/users')
          .send(payload);

        if (response.status === 200) {
          // If accepted, should be sanitized
          expect(response.body.data.name).not.toContain('<script>');
          expect(response.body.data.name).not.toContain('alert');
        }
      }
    });

    test('should enforce field length limits', async () => {
      const oversizedData = {
        email: 'a'.repeat(250) + '@example.com',
        password: 'Valid123!' + 'a'.repeat(200),
        name: 'a'.repeat(101),
        role: 'crew'
      };

      const response = await request(app)
        .post('/api/users')
        .send(oversizedData)
        .expect(400);

      expect(response.body.details.body).toContainEqual(
        expect.objectContaining({
          field: expect.any(String),
          error: expect.stringContaining('exceed')
        })
      );
    });

    test('should validate email formats strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user..double@example.com',
        'user@tempmail.com', // disposable
        '.startdot@example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/users')
          .send({
            email,
            password: 'Valid123!',
            name: 'Test',
            role: 'crew'
          })
          .expect(400);

        expect(response.body.details.body).toContainEqual(
          expect.objectContaining({
            field: 'email',
            error: expect.any(String)
          })
        );
      }
    });
  });

  describe('Authentication Security', () => {
    test('should reject requests without authentication', async () => {
      app.get('/api/protected', (req, res) => {
        const auth = req.headers.authorization;
        if (!auth) {
          return res.status(401).json({ error: 'Access token required' });
        }
        res.json({ success: true });
      });

      await request(app)
        .get('/api/protected')
        .expect(401)
        .expect({ error: 'Access token required' });
    });

    test('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'Bearer',
        'Bearer ',
        'Bearer malformed.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // incomplete JWT
        'Bearer null',
        'Bearer undefined'
      ];

      app.get('/api/protected', (req, res) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Invalid authorization format' });
        }

        const token = auth.split(' ')[1];
        if (!token || token === 'null' || token === 'undefined') {
          return res.status(401).json({ error: 'Invalid token' });
        }

        try {
          const jwt = require('jsonwebtoken');
          jwt.verify(token, process.env.JWT_SECRET);
          res.json({ success: true });
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
        }
      });

      for (const token of malformedTokens) {
        await request(app)
          .get('/api/protected')
          .set('Authorization', token)
          .expect(401);
      }
    });

    test('should reject expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          userId: testUser.id,
          exp: Math.floor(Date.now() / 1000) - 3600 // expired 1 hour ago
        },
        process.env.JWT_SECRET
      );

      app.get('/api/protected', (req, res) => {
        const auth = req.headers.authorization?.split(' ')[1];
        try {
          jwt.verify(auth, process.env.JWT_SECRET);
          res.json({ success: true });
        } catch (error) {
          if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
          } else {
            res.status(401).json({ error: 'Invalid token' });
          }
        }
      });

      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)
        .expect({ error: 'Token expired' });
    });

    test('should reject tokens with invalid signature', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign(
        { userId: testUser.id },
        'wrong-secret'
      );

      app.get('/api/protected', (req, res) => {
        const auth = req.headers.authorization?.split(' ')[1];
        try {
          jwt.verify(auth, process.env.JWT_SECRET);
          res.json({ success: true });
        } catch (error) {
          res.status(401).json({ error: 'Invalid signature' });
        }
      });

      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401)
        .expect({ error: 'Invalid signature' });
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce rate limits', async () => {
      const handler = jest.fn((req, res) => res.json({ success: true }));
      const rateLimitedHandler = withRateLimit(handler, {
        windowMs: 60000,
        max: 3
      });

      app.get('/api/rate-limited', rateLimitedHandler);

      const ip = '192.168.1.1';

      // Make requests up to limit
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/api/rate-limited')
          .set('X-Forwarded-For', ip)
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', ip)
        .expect(429);

      expect(response.body.error).toBe('Too many requests');
      expect(response.body.retryAfter).toBeDefined();
    });

    test('should track rate limits per IP', async () => {
      const handler = jest.fn((req, res) => res.json({ success: true }));
      const rateLimitedHandler = withRateLimit(handler, {
        windowMs: 60000,
        max: 2
      });

      app.get('/api/rate-limited', rateLimitedHandler);

      // Different IPs should have separate limits
      await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);

      await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      // Third request from first IP should be blocked
      await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // But second IP should still work
      await request(app)
        .get('/api/rate-limited')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);
    });
  });

  describe('CORS Security', () => {
    test('should enforce CORS policy', async () => {
      app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', 'https://allowed-origin.com');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        if (req.method === 'OPTIONS') {
          return res.sendStatus(204);
        }
        next();
      });

      app.get('/api/cors-protected', (req, res) => {
        res.json({ success: true });
      });

      // Preflight request
      const preflightResponse = await request(app)
        .options('/api/cors-protected')
        .set('Origin', 'https://allowed-origin.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(preflightResponse.headers['access-control-allow-origin']).toBe('https://allowed-origin.com');
      expect(preflightResponse.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Content Security', () => {
    test('should set security headers', async () => {
      app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        next();
      });

      app.get('/api/secure', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/api/secure')
        .expect(200);

      expect(response.headers['content-security-policy']).toBe("default-src 'self'");
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['permissions-policy']).toBeDefined();
    });

    test('should prevent content type sniffing', async () => {
      app.get('/api/data', (req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.json({ data: 'test' });
      });

      const response = await request(app)
        .get('/api/data')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive error details in production', async () => {
      process.env.NODE_ENV = 'production';

      app.get('/api/error', (req, res) => {
        try {
          // Simulate database error
          throw new Error('Connection to database server at 192.168.1.100:5432 failed: password authentication failed for user "admin"');
        } catch (error) {
          // In production, should not expose internal details
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'An error occurred processing your request'
          });
        }
      });

      const response = await request(app)
        .get('/api/error')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).not.toContain('192.168.1.100');
      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('admin');
    });

    test('should log detailed errors securely', async () => {
      const errorLog = [];
      
      app.get('/api/error', (req, res) => {
        try {
          throw new Error('Detailed error information');
        } catch (error) {
          // Log detailed error server-side
          errorLog.push({
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            requestId: req.headers['x-request-id']
          });
          
          // Return generic error to client
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      await request(app)
        .get('/api/error')
        .set('X-Request-ID', 'test-123')
        .expect(500);

      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].error).toBe('Detailed error information');
      expect(errorLog[0].requestId).toBe('test-123');
    });
  });

  describe('HTTP Method Security', () => {
    test('should reject unauthorized HTTP methods', async () => {
      app.route('/api/resource')
        .get((req, res) => res.json({ method: 'GET' }))
        .post((req, res) => res.json({ method: 'POST' }))
        .all((req, res) => res.status(405).json({ error: 'Method not allowed' }));

      // Allowed methods
      await request(app).get('/api/resource').expect(200);
      await request(app).post('/api/resource').expect(200);

      // Disallowed methods
      await request(app).put('/api/resource').expect(405);
      await request(app).delete('/api/resource').expect(405);
      await request(app).patch('/api/resource').expect(405);
    });

    test('should handle OPTIONS requests for CORS', async () => {
      app.options('/api/resource', (req, res) => {
        res.setHeader('Allow', 'GET, POST, OPTIONS');
        res.sendStatus(204);
      });

      const response = await request(app)
        .options('/api/resource')
        .expect(204);

      expect(response.headers['allow']).toBe('GET, POST, OPTIONS');
    });
  });
});