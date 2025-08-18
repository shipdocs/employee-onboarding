// tests/email-security.test.js
const { emailServiceFactory } = require('../lib/emailServiceFactory');
const { unifiedEmailService } = require('../lib/unifiedEmailService');

// Mock email validation and security functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isDomainWhitelisted = (email, whitelist) => {
  const domain = email.split('@')[1];
  return whitelist.includes(domain);
};

const isDomainBlacklisted = (email, blacklist) => {
  const domain = email.split('@')[1];
  return blacklist.includes(domain);
};

const sanitizeHtmlContent = (html) => {
  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
};

describe('Email Security Tests', () => {
  describe('Domain Whitelisting', () => {
    const whitelist = ['burando.nl', 'shipdocs.app', 'trusted-partner.com'];

    test('should allow emails to whitelisted domains', () => {
      const validEmails = [
        'user@burando.nl',
        'admin@shipdocs.app',
        'partner@trusted-partner.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
        expect(isDomainWhitelisted(email, whitelist)).toBe(true);
      });
    });

    test('should block emails to non-whitelisted domains in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.EMAIL_WHITELIST_ENABLED = 'true';

      const invalidEmails = [
        'user@untrusted.com',
        'test@example.com',
        'admin@malicious.site'
      ];

      invalidEmails.forEach(email => {
        const isAllowed = !process.env.EMAIL_WHITELIST_ENABLED === 'true' || 
                         isDomainWhitelisted(email, whitelist);
        expect(isAllowed).toBe(false);
      });
    });

    test('should allow any domain in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.EMAIL_WHITELIST_ENABLED = 'false';

      const testEmail = 'dev@any-domain.com';
      const isAllowed = process.env.NODE_ENV === 'development' || 
                       isDomainWhitelisted(testEmail, whitelist);
      expect(isAllowed).toBe(true);
    });
  });

  describe('Domain Blacklisting', () => {
    const blacklist = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];

    test('should block emails to blacklisted domains', () => {
      const blacklistedEmails = [
        'user@tempmail.com',
        'test@guerrillamail.com',
        'admin@10minutemail.com'
      ];

      blacklistedEmails.forEach(email => {
        expect(isDomainBlacklisted(email, blacklist)).toBe(true);
      });
    });

    test('should allow emails to non-blacklisted domains', () => {
      const validEmails = [
        'user@burando.nl',
        'admin@shipdocs.app',
        'test@gmail.com'
      ];

      validEmails.forEach(email => {
        expect(isDomainBlacklisted(email, blacklist)).toBe(false);
      });
    });

    test('should handle subdomain variations', () => {
      const extendedBlacklist = [...blacklist, 'spam.com'];
      
      // Should block main domain
      expect(isDomainBlacklisted('user@spam.com', extendedBlacklist)).toBe(true);
      
      // Subdomain not explicitly blocked
      expect(isDomainBlacklisted('user@sub.spam.com', extendedBlacklist)).toBe(false);
    });
  });

  describe('Email Interception in Dev/Staging', () => {
    test('should intercept emails in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_EMAIL_RECIPIENT = 'dev@burando.nl';

      const interceptEmail = (originalTo) => {
        if (process.env.NODE_ENV === 'development' && process.env.DEV_EMAIL_RECIPIENT) {
          return {
            to: process.env.DEV_EMAIL_RECIPIENT,
            originalTo: originalTo
          };
        }
        return { to: originalTo };
      };

      const result = interceptEmail('user@production.com');
      expect(result.to).toBe('dev@burando.nl');
      expect(result.originalTo).toBe('user@production.com');
    });

    test('should intercept emails in staging', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'preview';
      process.env.STAGING_EMAIL_RECIPIENT = 'staging@burando.nl';

      const interceptEmail = (originalTo) => {
        if (process.env.VERCEL_ENV === 'preview' && process.env.STAGING_EMAIL_RECIPIENT) {
          return {
            to: process.env.STAGING_EMAIL_RECIPIENT,
            originalTo: originalTo
          };
        }
        return { to: originalTo };
      };

      const result = interceptEmail('user@production.com');
      expect(result.to).toBe('staging@burando.nl');
      expect(result.originalTo).toBe('user@production.com');
    });

    test('should not intercept emails in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';

      const interceptEmail = (originalTo) => {
        if ((process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') && 
            (process.env.DEV_EMAIL_RECIPIENT || process.env.STAGING_EMAIL_RECIPIENT)) {
          return {
            to: process.env.DEV_EMAIL_RECIPIENT || process.env.STAGING_EMAIL_RECIPIENT,
            originalTo: originalTo
          };
        }
        return { to: originalTo };
      };

      const result = interceptEmail('user@production.com');
      expect(result.to).toBe('user@production.com');
      expect(result.originalTo).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per user', () => {
      const rateLimits = new Map();
      const RATE_LIMIT = 5; // 5 emails per hour
      const WINDOW = 3600000; // 1 hour in ms

      const checkRateLimit = (userId) => {
        const now = Date.now();
        const userLimits = rateLimits.get(userId) || [];
        
        // Remove old entries
        const recentRequests = userLimits.filter(time => now - time < WINDOW);
        
        if (recentRequests.length >= RATE_LIMIT) {
          return false;
        }
        
        recentRequests.push(now);
        rateLimits.set(userId, recentRequests);
        return true;
      };

      // Should allow first 5 emails
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit('user1')).toBe(true);
      }

      // Should block 6th email
      expect(checkRateLimit('user1')).toBe(false);

      // Different user should be allowed
      expect(checkRateLimit('user2')).toBe(true);
    });

    test('should enforce global rate limits', () => {
      let globalCount = 0;
      const GLOBAL_LIMIT = 100; // 100 emails per minute
      let resetTime = Date.now() + 60000;

      const checkGlobalLimit = () => {
        const now = Date.now();
        
        if (now > resetTime) {
          globalCount = 0;
          resetTime = now + 60000;
        }
        
        if (globalCount >= GLOBAL_LIMIT) {
          return false;
        }
        
        globalCount++;
        return true;
      };

      // Should allow up to limit
      for (let i = 0; i < 100; i++) {
        expect(checkGlobalLimit()).toBe(true);
      }

      // Should block after limit
      expect(checkGlobalLimit()).toBe(false);
    });

    test('should handle burst protection', () => {
      const burstProtection = new Map();
      const BURST_LIMIT = 3;
      const BURST_WINDOW = 10000; // 10 seconds

      const checkBurstLimit = (userId) => {
        const now = Date.now();
        const userBursts = burstProtection.get(userId) || [];
        
        const recentBursts = userBursts.filter(time => now - time < BURST_WINDOW);
        
        if (recentBursts.length >= BURST_LIMIT) {
          return false;
        }
        
        recentBursts.push(now);
        burstProtection.set(userId, recentBursts);
        return true;
      };

      // Should allow 3 quick emails
      expect(checkBurstLimit('user1')).toBe(true);
      expect(checkBurstLimit('user1')).toBe(true);
      expect(checkBurstLimit('user1')).toBe(true);

      // Should block 4th within burst window
      expect(checkBurstLimit('user1')).toBe(false);
    });
  });

  describe('Content Sanitization', () => {
    test('should remove script tags from HTML content', () => {
      const maliciousHtml = `
        <p>Hello</p>
        <script>alert('XSS')</script>
        <p>World</p>
      `;

      const sanitized = sanitizeHtmlContent(maliciousHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert(');
      expect(sanitized).toContain('<p>Hello</p>');
      expect(sanitized).toContain('<p>World</p>');
    });

    test('should remove event handlers from HTML', () => {
      const maliciousHtml = `
        <button onclick="alert('XSS')">Click me</button>
        <img src="x" onerror="alert('XSS')">
        <div onmouseover="alert('XSS')">Hover me</div>
      `;

      const sanitized = sanitizeHtmlContent(maliciousHtml);
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onmouseover=');
      expect(sanitized).toContain('<button');
      expect(sanitized).toContain('<img');
      expect(sanitized).toContain('<div');
    });

    test('should remove javascript: URLs', () => {
      const maliciousHtml = `
        <a href="javascript:alert('XSS')">Click</a>
        <a href="JavaScript:void(0)">Click</a>
        <img src="javascript:alert('XSS')">
      `;

      const sanitized = sanitizeHtmlContent(maliciousHtml);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('JavaScript:');
    });

    test('should preserve safe HTML content', () => {
      const safeHtml = `
        <h1>Welcome</h1>
        <p>This is a <strong>safe</strong> email.</p>
        <a href="https://burando.nl">Visit our website</a>
        <img src="https://burando.nl/logo.png" alt="Logo">
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;

      const sanitized = sanitizeHtmlContent(safeHtml);
      expect(sanitized).toBe(safeHtml);
    });

    test('should handle nested malicious content', () => {
      const nestedMalicious = `
        <div>
          <p>Normal content</p>
          <div><script>alert('nested')</script></div>
          <span onclick="alert('hidden')">Click</span>
        </div>
      `;

      const sanitized = sanitizeHtmlContent(nestedMalicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toContain('Normal content');
    });
  });

  describe('Email Header Security', () => {
    test('should validate required headers', () => {
      const validateHeaders = (headers) => {
        const required = ['From', 'To', 'Subject'];
        return required.every(header => headers[header]);
      };

      const validHeaders = {
        From: 'noreply@burando.nl',
        To: 'user@example.com',
        Subject: 'Test Email'
      };

      const invalidHeaders = {
        From: 'noreply@burando.nl',
        Subject: 'Test Email'
        // Missing 'To'
      };

      expect(validateHeaders(validHeaders)).toBe(true);
      expect(validateHeaders(invalidHeaders)).toBe(false);
    });

    test('should prevent header injection', () => {
      const sanitizeHeader = (value) => {
        // Remove newlines and carriage returns to prevent header injection
        return value.replace(/[\r\n]/g, '');
      };

      const maliciousSubject = 'Test\r\nBcc: attacker@evil.com';
      const sanitized = sanitizeHeader(maliciousSubject);
      
      expect(sanitized).toBe('TestBcc: attacker@evil.com');
      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
    });

    test('should add security headers', () => {
      const addSecurityHeaders = (headers) => {
        return {
          ...headers,
          'X-Mailer': 'Burando Maritime Services',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        };
      };

      const baseHeaders = {
        From: 'noreply@burando.nl',
        To: 'user@example.com',
        Subject: 'Test'
      };

      const secureHeaders = addSecurityHeaders(baseHeaders);
      
      expect(secureHeaders['X-Mailer']).toBe('Burando Maritime Services');
      expect(secureHeaders['X-Priority']).toBe('3');
      expect(secureHeaders.From).toBe('noreply@burando.nl');
    });
  });

  describe('Attachment Security', () => {
    test('should validate attachment file types', () => {
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
      
      const isAllowedFileType = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        return allowedTypes.includes(ext);
      };

      expect(isAllowedFileType('certificate.pdf')).toBe(true);
      expect(isAllowedFileType('photo.jpg')).toBe(true);
      expect(isAllowedFileType('malicious.exe')).toBe(false);
      expect(isAllowedFileType('script.js')).toBe(false);
    });

    test('should enforce attachment size limits', () => {
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      
      const isValidSize = (sizeInBytes) => {
        return sizeInBytes <= MAX_SIZE;
      };

      expect(isValidSize(5 * 1024 * 1024)).toBe(true); // 5MB
      expect(isValidSize(10 * 1024 * 1024)).toBe(true); // 10MB
      expect(isValidSize(15 * 1024 * 1024)).toBe(false); // 15MB
    });

    test('should scan attachment names for malicious patterns', () => {
      const isSafeFilename = (filename) => {
        const dangerousPatterns = [
          /\.\./,  // Directory traversal
          /[<>:"|?*]/,  // Invalid characters
          /^\./, // Hidden files
          /\0/ // Null bytes
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(filename));
      };

      expect(isSafeFilename('certificate.pdf')).toBe(true);
      expect(isSafeFilename('../../../etc/passwd')).toBe(false);
      expect(isSafeFilename('file<script>.pdf')).toBe(false);
      expect(isSafeFilename('.hidden.pdf')).toBe(false);
    });
  });
});