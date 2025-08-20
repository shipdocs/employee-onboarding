// Security Improvements Test Suite
const { detectAttackPatterns, checkCORSViolation, ATTACK_PATTERNS } = require('../../lib/middleware/securityMonitoring');

describe('Security Improvements', () => {
  describe('Attack Pattern Detection', () => {
    test('should detect SQL injection attempts', () => {
      const sqlInjectionInputs = [
        "admin@test.com' OR 1=1--",
        "test'; DROP TABLE users;--",
        "' UNION SELECT * FROM users--",
        "admin@test.com' AND 1=1--"
      ];

      sqlInjectionInputs.forEach(input => {
        const detected = detectAttackPatterns(input, ATTACK_PATTERNS.SQL_INJECTION);
        expect(detected.length).toBeGreaterThan(0);
      });
    });

    test('should detect XSS attempts', () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "<svg onload=alert(1)>",
        "<iframe src=javascript:alert(1)></iframe>"
      ];

      xssInputs.forEach(input => {
        const detected = detectAttackPatterns(input, ATTACK_PATTERNS.XSS_ATTEMPTS);
        expect(detected.length).toBeGreaterThan(0);
      });
    });

    test('should detect directory traversal attempts', () => {
      const traversalInputs = [
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2f",
        "/proc/self/environ"
      ];

      traversalInputs.forEach(input => {
        const detected = detectAttackPatterns(input, ATTACK_PATTERNS.DIRECTORY_TRAVERSAL);
        expect(detected.length).toBeGreaterThan(0);
      });
    });

    test('should detect command injection attempts', () => {
      const commandInputs = [
        "; cat /etc/passwd",
        "| whoami",
        "`id`",
        "$(uname -a)",
        "&& ls -la"
      ];

      commandInputs.forEach(input => {
        const detected = detectAttackPatterns(input, ATTACK_PATTERNS.COMMAND_INJECTION);
        expect(detected.length).toBeGreaterThan(0);
      });
    });

    test('should detect suspicious user agents', () => {
      const suspiciousUAs = [
        "sqlmap/1.0",
        "Nikto/2.1.6", 
        "Nmap Scripting Engine",
        "Burp Suite Professional",
        "OWASP ZAP"
      ];

      suspiciousUAs.forEach(ua => {
        const detected = detectAttackPatterns(ua, ATTACK_PATTERNS.SUSPICIOUS_USER_AGENTS);
        expect(detected.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CORS Violation Detection', () => {
    test('should detect CORS violations from unauthorized origins', () => {
      const req = {
        headers: {
          origin: 'https://evil.com'
        }
      };

      const violation = checkCORSViolation(req);
      expect(violation).not.toBeNull();
      expect(violation.type).toBe('cors_violation');
      expect(violation.origin).toBe('https://evil.com');
    });

    test('should allow legitimate origins', () => {
      const legitimateOrigins = [
        'https://maritime-onboarding.example.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ];

      legitimateOrigins.forEach(origin => {
        const req = {
          headers: { origin }
        };

        const violation = checkCORSViolation(req);
        expect(violation).toBeNull();
      });
    });

    test('should handle requests without origin header', () => {
      const req = {
        headers: {}
      };

      const violation = checkCORSViolation(req);
      expect(violation).toBeNull();
    });
  });
});

describe('Error Message Sanitization', () => {
  const ErrorHandler = require('../../lib/errorHandler');

  test('should remove documentation URLs in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const url = ErrorHandler.getDocumentationUrl('AUTH_INVALID_CREDENTIALS');
    expect(url).toBeNull();

    process.env.NODE_ENV = originalEnv;
  });

  test('should include documentation URLs in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const url = ErrorHandler.getDocumentationUrl('AUTH_INVALID_CREDENTIALS');
    expect(url).toContain('AUTH_INVALID_CREDENTIALS');

    process.env.NODE_ENV = originalEnv;
  });

  test('should sanitize error details in production', () => {
    const error = {
      details: {
        stack: 'Error stack trace',
        originalMessage: 'Internal error message',
        query: 'SELECT * FROM users',
        safeField: 'This is safe'
      }
    };

    const sanitized = ErrorHandler.getErrorDetails(error, true);
    expect(sanitized.stack).toBeUndefined();
    expect(sanitized.originalMessage).toBeUndefined();
    expect(sanitized.query).toBeUndefined();
    expect(sanitized.safeField).toBe('This is safe');
  });
});
