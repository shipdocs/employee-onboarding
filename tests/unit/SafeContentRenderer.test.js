/**
 * Unit tests for SafeContentRenderer
 * Tests XSS prevention, content sanitization, and security logging
 */

const SafeContentRenderer = require('../../lib/security/SafeContentRenderer');

// Mock the SecurityAuditLogger to avoid database calls in tests
jest.mock('../../lib/security/SecurityAuditLogger', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue(true)
}));

describe('SafeContentRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeAndRender', () => {
    test('should sanitize basic HTML content', () => {
      const content = '<p>Hello <strong>world</strong>!</p>';
      const result = SafeContentRenderer.sanitizeAndRender(content);
      
      console.log('Test result:', JSON.stringify(result, null, 2));
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('<p>Hello <strong>world</strong>!</p>');
      expect(result.xssAttempts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should remove script tags and detect XSS attempts', async () => {
      const content = '<p>Hello</p><script>alert("xss")</script>';
      const result = await SafeContentRenderer.sanitizeAndRender(content, {
        source: 'test',
        userId: 'test-user'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('<p>Hello</p>');
      expect(result.xssAttempts).toHaveLength(1);
      expect(result.xssAttempts[0].severity).toBe('critical');
    });

    test('should remove dangerous event handlers', () => {
      const content = '<p onclick="alert(\'xss\')">Click me</p>';
      const result = SafeContentRenderer.sanitizeAndRender(content);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('<p>Click me</p>');
      expect(result.xssAttempts).toHaveLength(1);
    });

    test('should handle javascript: URLs', () => {
      const content = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = SafeContentRenderer.sanitizeAndRender(content);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).not.toContain('javascript:');
      expect(result.xssAttempts).toHaveLength(1);
    });

    test('should remove iframe tags', () => {
      const content = '<p>Content</p><iframe src="http://evil.com"></iframe>';
      const result = SafeContentRenderer.sanitizeAndRender(content);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('<p>Content</p>');
      expect(result.xssAttempts).toHaveLength(1);
      expect(result.xssAttempts[0].severity).toBe('high');
    });

    test('should handle empty or invalid input', () => {
      expect(SafeContentRenderer.sanitizeAndRender('').isValid).toBe(true);
      expect(SafeContentRenderer.sanitizeAndRender(null).isValid).toBe(true);
      expect(SafeContentRenderer.sanitizeAndRender(undefined).isValid).toBe(true);
      expect(SafeContentRenderer.sanitizeAndRender(123).isValid).toBe(true);
    });

    test('should enforce maximum length', () => {
      const longContent = 'a'.repeat(1000);
      const result = SafeContentRenderer.sanitizeAndRender(longContent, {
        maxLength: 500
      });
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Content exceeds maximum length of 500 characters');
    });

    test('should use different content type configurations', () => {
      const content = '<img src="test.jpg" alt="test"><script>alert("xss")</script>';
      
      // Default config should allow img tags
      const defaultResult = SafeContentRenderer.sanitizeAndRender(content, {
        contentType: 'rich_text'
      });
      expect(defaultResult.sanitizedContent).toContain('<img');
      
      // Minimal config should remove img tags
      const minimalResult = SafeContentRenderer.sanitizeAndRender(content, {
        contentType: 'minimal'
      });
      expect(minimalResult.sanitizedContent).not.toContain('<img');
    });

    test('should detect multiple XSS patterns', () => {
      const content = `
        <script>alert('xss1')</script>
        <p onclick="alert('xss2')">Text</p>
        <iframe src="javascript:alert('xss3')"></iframe>
      `;
      
      const result = SafeContentRenderer.sanitizeAndRender(content);
      
      expect(result.xssAttempts.length).toBeGreaterThan(1);
      expect(result.isValid).toBe(true); // Should still be valid after sanitization
    });
  });

  describe('validateContent', () => {
    test('should validate clean content', () => {
      const content = '<p>Clean content</p>';
      const result = SafeContentRenderer.validateContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.xssAttempts).toHaveLength(0);
    });

    test('should detect XSS in content without sanitizing', () => {
      const content = '<script>alert("xss")</script>';
      const result = SafeContentRenderer.validateContent(content);
      
      expect(result.isValid).toBe(false);
      expect(result.xssAttempts).toHaveLength(1);
      expect(result.warnings).toContain('Content contains potential XSS patterns');
    });
  });

  describe('detectXSSAttempts', () => {
    test('should detect script tags', () => {
      const attempts = SafeContentRenderer.detectXSSAttempts('<script>alert("xss")</script>');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].severity).toBe('critical');
    });

    test('should detect event handlers', () => {
      const attempts = SafeContentRenderer.detectXSSAttempts('<div onclick="alert()">Test</div>');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].severity).toBe('medium');
    });

    test('should detect javascript: URLs', () => {
      const attempts = SafeContentRenderer.detectXSSAttempts('<a href="javascript:alert()">Link</a>');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].severity).toBe('critical');
    });

    test('should detect iframe tags', () => {
      const attempts = SafeContentRenderer.detectXSSAttempts('<iframe src="evil.com"></iframe>');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].severity).toBe('high');
    });
  });

  describe('createSafeHTML', () => {
    test('should create safe HTML object for React', () => {
      const content = '<p>Safe content</p>';
      const result = SafeContentRenderer.createSafeHTML(content);
      
      expect(result).toHaveProperty('__html');
      expect(result.__html).toBe('<p>Safe content</p>');
    });

    test('should return empty HTML for invalid content', () => {
      const content = '<script>alert("xss")</script>';
      // Mock sanitizeAndRender to return invalid result
      jest.spyOn(SafeContentRenderer, 'sanitizeAndRender').mockReturnValue({
        isValid: false,
        sanitizedContent: '',
        warnings: ['Invalid content'],
        xssAttempts: []
      });
      
      const result = SafeContentRenderer.createSafeHTML(content);
      
      expect(result.__html).toBe('');
      
      // Restore original method
      SafeContentRenderer.sanitizeAndRender.mockRestore();
    });
  });

  describe('sanitizeText', () => {
    test('should strip all HTML tags', () => {
      const content = '<p>Hello <strong>world</strong>!</p>';
      const result = SafeContentRenderer.sanitizeText(content);
      
      expect(result).toBe('Hello world!');
    });

    test('should decode HTML entities', () => {
      const content = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      const result = SafeContentRenderer.sanitizeText(content);
      
      expect(result).toBe('<script>alert("xss")</script>');
    });

    test('should handle empty input', () => {
      expect(SafeContentRenderer.sanitizeText('')).toBe('');
      expect(SafeContentRenderer.sanitizeText(null)).toBe('');
      expect(SafeContentRenderer.sanitizeText(undefined)).toBe('');
    });
  });

  describe('utility methods', () => {
    test('should return available content types', () => {
      const types = SafeContentRenderer.getAvailableContentTypes();
      
      expect(types).toContain('default');
      expect(types).toContain('rich_text');
      expect(types).toContain('minimal');
    });

    test('should return content type configuration', () => {
      const config = SafeContentRenderer.getContentTypeConfig('default');
      
      expect(config).toHaveProperty('ALLOWED_TAGS');
      expect(config).toHaveProperty('ALLOWED_ATTR');
      expect(config).toHaveProperty('FORBID_TAGS');
    });

    test('should return default config for unknown content type', () => {
      const config = SafeContentRenderer.getContentTypeConfig('unknown');
      const defaultConfig = SafeContentRenderer.getContentTypeConfig('default');
      
      expect(config).toEqual(defaultConfig);
    });
  });

  describe('XSS severity classification', () => {
    test('should classify script patterns as critical', () => {
      const severity = SafeContentRenderer.getXSSSeverity(/<script[^>]*>/gi);
      expect(severity).toBe('critical');
    });

    test('should classify iframe patterns as high', () => {
      const severity = SafeContentRenderer.getXSSSeverity(/<iframe[^>]*>/gi);
      expect(severity).toBe('high');
    });

    test('should classify event handlers as medium', () => {
      const severity = SafeContentRenderer.getXSSSeverity(/on\w+\s*=/gi);
      expect(severity).toBe('medium');
    });
  });
});