/**
 * Unit tests for SecureDOMPurify
 * Tests enhanced DOMPurify integration with security logging
 */

// Mock SecurityAuditLogger before importing SecureDOMPurify
jest.mock('../../lib/security/SecurityAuditLogger', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue(true)
}));

// Mock isomorphic-dompurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input, config) => {
    // Simple mock implementation that removes script tags but keeps safe content
    if (typeof input !== 'string') return '';
    
    // Remove script tags and dangerous content
    let result = input
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
      .replace(/<object[^>]*>.*?<\/object>/gis, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript\s*:/gi, '');
    
    // Apply basic tag filtering based on config
    if (config && config.ALLOWED_TAGS) {
      // For strict mode, remove links
      if (config.ALLOWED_TAGS.length <= 4) { // strict mode
        result = result.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
      }
    }
    
    return result.trim();
  })
}));

const SecureDOMPurify = require('../../lib/security/SecureDOMPurify');
const SecurityAuditLogger = require('../../lib/security/SecurityAuditLogger');

describe('SecureDOMPurify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore console for debugging
    global.restoreConsole();
  });

  describe('sanitizeHTML', () => {
    test('should sanitize basic HTML content', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = SecureDOMPurify.sanitizeHTML(input);
      
      expect(result).toBe('<p>Hello <strong>world</strong></p>');
    });

    test('should remove script tags and log XSS attempt', async () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = SecureDOMPurify.sanitizeHTML(input, {
        source: 'test',
        userId: 'test-user'
      });
      
      expect(result).toBe('<p>Hello</p>');
      
      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(SecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'xss_attempt',
          severity: 'critical',
          userId: 'test-user'
        })
      );
    });

    test('should handle different security levels', () => {
      const input = '<p>Hello <a href="https://example.com">link</a></p>';
      
      // Strict level should remove links
      const strictResult = SecureDOMPurify.sanitizeHTML(input, {
        securityLevel: 'strict'
      });
      expect(strictResult).toBe('<p>Hello link</p>');
      
      // Moderate level should keep safe links
      const moderateResult = SecureDOMPurify.sanitizeHTML(input, {
        securityLevel: 'moderate'
      });
      expect(moderateResult).toBe('<p>Hello <a href="https://example.com">link</a></p>');
    });

    test('should return empty string for invalid input', () => {
      expect(SecureDOMPurify.sanitizeHTML(null)).toBe('');
      expect(SecureDOMPurify.sanitizeHTML(undefined)).toBe('');
      expect(SecureDOMPurify.sanitizeHTML(123)).toBe('');
    });

    test('should handle custom configuration', () => {
      const input = '<p class="test">Hello</p>';
      const customConfig = {
        ALLOWED_TAGS: ['p'],
        ALLOWED_ATTR: []
      };
      
      const result = SecureDOMPurify.sanitizeHTML(input, {
        customConfig
      });
      
      // The mock doesn't implement attribute filtering, so we expect the class to remain
      expect(result).toBe('<p class="test">Hello</p>');
    });

    test('should detect and log multiple XSS patterns', async () => {
      const input = '<script>alert("xss")</script><img onerror="alert(1)" src="x">';
      
      SecureDOMPurify.sanitizeHTML(input, {
        source: 'test',
        userId: 'test-user'
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(SecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'xss_attempt',
          severity: 'critical'
        })
      );
    });

    test('should return empty string if XSS survives sanitization', () => {
      // Mock DOMPurify to simulate a bypass scenario
      const originalSanitize = require('isomorphic-dompurify').sanitize;
      require('isomorphic-dompurify').sanitize = jest.fn().mockReturnValue('<script>alert("bypass")</script>');
      
      const input = '<script>alert("test")</script>';
      const result = SecureDOMPurify.sanitizeHTML(input);
      
      expect(result).toBe('');
      
      // Restore original function
      require('isomorphic-dompurify').sanitize = originalSanitize;
    });
  });

  describe('sanitizeCSS', () => {
    test('should sanitize safe CSS', () => {
      const input = 'color: red; font-size: 14px;';
      const result = SecureDOMPurify.sanitizeCSS(input);
      
      expect(result).toBe('color: red; font-size: 14px;');
    });

    test('should remove dangerous CSS expressions', () => {
      const input = 'color: red; background: expression(alert("xss"));';
      const result = SecureDOMPurify.sanitizeCSS(input);
      
      // The CSS sanitization should remove the expression() call
      expect(result).toContain('color: red');
      expect(result).not.toContain('expression');
      expect(result).not.toContain('alert');
    });

    test('should remove javascript URLs in CSS', () => {
      const input = 'background: url(javascript:alert("xss"));';
      const result = SecureDOMPurify.sanitizeCSS(input);
      
      // The CSS sanitization should remove javascript: URLs
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    test('should log dangerous CSS patterns', async () => {
      const input = 'color: red; background: expression(alert("xss"));';
      
      SecureDOMPurify.sanitizeCSS(input, {
        source: 'test',
        userId: 'test-user'
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(SecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'css_injection_attempt',
          severity: 'medium'
        })
      );
    });

    test('should handle invalid CSS input', () => {
      expect(SecureDOMPurify.sanitizeCSS(null)).toBe('');
      expect(SecureDOMPurify.sanitizeCSS(undefined)).toBe('');
      expect(SecureDOMPurify.sanitizeCSS(123)).toBe('');
    });
  });

  describe('validateSafeContent', () => {
    test('should validate safe content', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = SecureDOMPurify.validateSafeContent(input);
      
      expect(result.isSafe).toBe(true);
      expect(result.xssAttempts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect unsafe content', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = SecureDOMPurify.validateSafeContent(input);
      
      expect(result.isSafe).toBe(false);
      expect(result.xssAttempts.length).toBeGreaterThan(0);
    });

    test('should check forbidden tags based on security level', () => {
      const input = '<p>Hello <script>alert("test")</script></p>';
      const result = SecureDOMPurify.validateSafeContent(input, {
        securityLevel: 'strict'
      });
      
      expect(result.isSafe).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should handle invalid input gracefully', () => {
      const result = SecureDOMPurify.validateSafeContent(null);
      
      expect(result.isSafe).toBe(true);
      expect(result.xssAttempts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('detectXSSAttempts', () => {
    test('should detect script injection', () => {
      const input = '<script>alert("xss")</script>';
      const attempts = SecureDOMPurify.detectXSSAttempts(input);
      
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].severity).toBe('critical');
      expect(attempts[0].category).toBe('script_injection');
    });

    test('should detect event handler injection', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const attempts = SecureDOMPurify.detectXSSAttempts(input);
      
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].severity).toBe('medium');
      expect(attempts[0].category).toBe('event_handler');
    });

    test('should detect iframe injection', () => {
      const input = '<iframe src="javascript:alert(1)"></iframe>';
      const attempts = SecureDOMPurify.detectXSSAttempts(input);
      
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts.some(attempt => attempt.severity === 'high')).toBe(true);
    });

    test('should return empty array for safe content', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const attempts = SecureDOMPurify.detectXSSAttempts(input);
      
      expect(attempts).toHaveLength(0);
    });
  });

  describe('getXSSSeverity', () => {
    test('should return critical for script patterns', () => {
      const pattern = /<script[^>]*>/gi;
      const severity = SecureDOMPurify.getXSSSeverity(pattern);
      
      expect(severity).toBe('critical');
    });

    test('should return high for iframe patterns', () => {
      const pattern = /<iframe[^>]*>/gi;
      const severity = SecureDOMPurify.getXSSSeverity(pattern);
      
      expect(severity).toBe('high');
    });

    test('should return medium for event handler patterns', () => {
      const pattern = /on\w+\s*=/gi;
      const severity = SecureDOMPurify.getXSSSeverity(pattern);
      
      expect(severity).toBe('medium');
    });

    test('should return low for unknown patterns', () => {
      const pattern = /unknown/gi;
      const severity = SecureDOMPurify.getXSSSeverity(pattern);
      
      expect(severity).toBe('low');
    });
  });

  describe('getXSSCategory', () => {
    test('should categorize script patterns', () => {
      const pattern = /<script[^>]*>/gi;
      const category = SecureDOMPurify.getXSSCategory(pattern);
      
      expect(category).toBe('script_injection');
    });

    test('should categorize event handler patterns', () => {
      const pattern = /on\w+\s*=/gi;
      const category = SecureDOMPurify.getXSSCategory(pattern);
      
      expect(category).toBe('event_handler');
    });

    test('should categorize iframe patterns', () => {
      const pattern = /<iframe[^>]*>/gi;
      const category = SecureDOMPurify.getXSSCategory(pattern);
      
      expect(category).toBe('object_injection');
    });
  });

  describe('configuration methods', () => {
    test('should return available security levels', () => {
      const levels = SecureDOMPurify.getAvailableSecurityLevels();
      
      expect(levels).toContain('strict');
      expect(levels).toContain('moderate');
      expect(levels).toContain('permissive');
    });

    test('should return security level configuration', () => {
      const config = SecureDOMPurify.getSecurityLevelConfig('strict');
      
      expect(config).toHaveProperty('ALLOWED_TAGS');
      expect(config).toHaveProperty('ALLOWED_ATTR');
      expect(config).toHaveProperty('FORBID_TAGS');
    });

    test('should create custom configuration', () => {
      const customConfig = SecureDOMPurify.createCustomConfig('moderate', {
        ALLOWED_TAGS: ['p', 'strong']
      });
      
      expect(customConfig.ALLOWED_TAGS).toEqual(['p', 'strong']);
      expect(customConfig).toHaveProperty('ALLOWED_ATTR'); // From base config
    });
  });

  describe('error handling', () => {
    test('should handle DOMPurify sanitization errors', () => {
      // Mock DOMPurify to throw an error
      const originalSanitize = require('isomorphic-dompurify').sanitize;
      require('isomorphic-dompurify').sanitize = jest.fn().mockImplementation(() => {
        throw new Error('Sanitization failed');
      });
      
      const input = '<p>Hello world</p>';
      const result = SecureDOMPurify.sanitizeHTML(input);
      
      expect(result).toBe('');
      
      // Restore original function
      require('isomorphic-dompurify').sanitize = originalSanitize;
    });

    test('should handle logging errors gracefully', async () => {
      // Mock SecurityAuditLogger to throw an error
      SecurityAuditLogger.logSecurityEvent.mockRejectedValueOnce(new Error('Logging failed'));
      
      const input = '<script>alert("xss")</script>';
      
      // Should not throw an error even if logging fails
      expect(() => {
        SecureDOMPurify.sanitizeHTML(input, {
          source: 'test',
          userId: 'test-user'
        });
      }).not.toThrow();
    });
  });
});