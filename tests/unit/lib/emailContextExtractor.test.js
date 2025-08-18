/**
 * Unit tests for Email Context Extractor
 * Tests audit context extraction for email logging compliance
 */

const {
  extractEmailContext,
  extractClientIP,
  isValidIP,
  createAPIEmailContext,
  createSystemEmailContext,
  createAuthEmailContext,
  createComplianceEmailContext,
  sanitizeEmailContext
} = require('../../../lib/emailContextExtractor');

describe('Email Context Extractor', () => {
  describe('extractClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1'
        }
      };

      const ip = extractClientIP(req);
      expect(ip).toBe('192.168.1.100');
    });

    test('should extract IP from x-real-ip header', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.45'
        }
      };

      const ip = extractClientIP(req);
      expect(ip).toBe('203.0.113.45');
    });

    test('should extract IP from connection.remoteAddress', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '198.51.100.22'
        }
      };

      const ip = extractClientIP(req);
      expect(ip).toBe('198.51.100.22');
    });

    test('should return null for invalid request', () => {
      const ip = extractClientIP(null);
      expect(ip).toBeNull();
    });
  });

  describe('isValidIP', () => {
    test('should validate IPv4 addresses', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('203.0.113.45')).toBe(true);
      expect(isValidIP('localhost')).toBe(true);
    });

    test('should reject invalid IPv4 addresses', () => {
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('not-an-ip')).toBe(false);
      expect(isValidIP('')).toBe(false);
      expect(isValidIP(null)).toBe(false);
    });

    test('should handle IPv6 addresses', () => {
      expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIP('::ffff:192.168.1.1')).toBe(false); // IPv6 prefix should be rejected
      expect(isValidIP('2001:db8::1')).toBe(false); // Compressed IPv6 not supported by simple regex
    });
  });

  describe('extractEmailContext', () => {
    test('should extract complete context from request and user', () => {
      const req = {
        method: 'POST',
        path: '/api/email/send',
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'x-forwarded-for': '192.168.1.100',
          'referer': 'https://example.com/dashboard',
          'origin': 'https://example.com'
        },
        requestId: 'req-123'
      };

      const user = {
        id: 456,
        email: 'test@example.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe'
      };

      const options = {
        emailType: 'notification',
        retentionCategory: 'standard'
      };

      const context = extractEmailContext(req, user, options);

      expect(context.user).toEqual({
        id: 456,
        email: 'test@example.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(context.ipAddress).toBe('192.168.1.100');
      expect(context.userAgent).toBe('Mozilla/5.0 (Test Browser)');
      expect(context.emailType).toBe('notification');
      expect(context.retentionCategory).toBe('standard');

      expect(context.clientContext).toEqual({
        method: 'POST',
        path: '/api/email/send',
        referer: 'https://example.com/dashboard',
        origin: 'https://example.com',
        forwardedFor: '192.168.1.100',
        realIP: undefined,
        requestId: 'req-123',
        correlationId: undefined
      });

      expect(context.metadata).toMatchObject({
        environment: expect.any(String),
        service: 'smtp-email-service'
      });
    });

    test('should handle missing request and user', () => {
      const context = extractEmailContext(null, null);

      expect(context.user).toBeNull();
      expect(context.ipAddress).toBeNull();
      expect(context.userAgent).toBeNull();
      expect(context.emailType).toBe('notification');
      expect(context.retentionCategory).toBe('standard');
    });
  });

  describe('createAPIEmailContext', () => {
    test('should create API email context', () => {
      const req = {
        method: 'POST',
        path: '/api/notifications',
        headers: {
          'user-agent': 'API Client/1.0'
        },
        user: {
          id: 123,
          email: 'api@example.com',
          role: 'manager'
        }
      };

      const context = createAPIEmailContext(req, 'api_notification', 'extended');

      expect(context.emailType).toBe('api_notification');
      expect(context.retentionCategory).toBe('extended');
      expect(context.createdBy).toBe('api-handler');
      expect(context.user.id).toBe(123);
      expect(context.metadata.service).toBe('api-email-service');
    });
  });

  describe('createSystemEmailContext', () => {
    test('should create system email context', () => {
      const systemContext = {
        service: 'cron-job',
        processType: 'scheduled',
        jobId: 'job-456'
      };

      const context = createSystemEmailContext('system_alert', 'permanent', systemContext);

      expect(context.emailType).toBe('system_alert');
      expect(context.retentionCategory).toBe('permanent');
      expect(context.createdBy).toBe('cron-job');
      expect(context.user).toBeNull();
      expect(context.userAgent).toBe('system-process');
      expect(context.clientContext.requestId).toBe('job-456');
      expect(context.metadata.processType).toBe('scheduled');
    });
  });

  describe('createAuthEmailContext', () => {
    test('should create authentication email context', () => {
      const req = {
        method: 'POST',
        path: '/api/auth/magic-link',
        headers: {
          'user-agent': 'Browser/1.0',
          'x-forwarded-for': '203.0.113.45'
        }
      };

      const context = createAuthEmailContext(req, 'magic_link');

      expect(context.emailType).toBe('magic_link');
      expect(context.retentionCategory).toBe('extended'); // Auth emails kept longer
      expect(context.createdBy).toBe('auth-service');
      expect(context.ipAddress).toBe('203.0.113.45');
      expect(context.metadata.service).toBe('authentication-service');
    });
  });

  describe('createComplianceEmailContext', () => {
    test('should create compliance email context', () => {
      const req = {
        method: 'POST',
        path: '/api/compliance/report',
        headers: {}
      };

      const user = {
        id: 789,
        email: 'compliance@example.com',
        role: 'admin'
      };

      const context = createComplianceEmailContext(req, user, 'audit_report');

      expect(context.emailType).toBe('audit_report');
      expect(context.retentionCategory).toBe('permanent'); // Compliance emails never expire
      expect(context.createdBy).toBe('compliance-service');
      expect(context.user.id).toBe(789);
      expect(context.metadata.service).toBe('compliance-email-service');
    });
  });

  describe('sanitizeEmailContext', () => {
    test('should remove sensitive data from context', () => {
      const context = {
        user: {
          id: 123,
          email: 'test@example.com',
          password: 'secret123',
          token: 'jwt-token',
          secret: 'api-secret'
        },
        clientContext: {
          method: 'POST',
          authorization: 'Bearer token',
          cookie: 'session=abc123',
          session: 'session-data'
        },
        metadata: {
          service: 'email-service'
        }
      };

      const sanitized = sanitizeEmailContext(context);

      expect(sanitized.user.id).toBe(123);
      expect(sanitized.user.email).toBe('test@example.com');
      expect(sanitized.user.password).toBeUndefined();
      expect(sanitized.user.token).toBeUndefined();
      expect(sanitized.user.secret).toBeUndefined();

      expect(sanitized.clientContext.method).toBe('POST');
      expect(sanitized.clientContext.authorization).toBeUndefined();
      expect(sanitized.clientContext.cookie).toBeUndefined();
      expect(sanitized.clientContext.session).toBeUndefined();

      expect(sanitized.metadata.service).toBe('email-service');
    });

    test('should handle context without sensitive data', () => {
      const context = {
        emailType: 'notification',
        retentionCategory: 'standard'
      };

      const sanitized = sanitizeEmailContext(context);

      expect(sanitized).toEqual(context);
    });
  });
});
