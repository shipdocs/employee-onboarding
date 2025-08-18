/**
 * Unit tests for validation middleware
 * Tests all validation functions and security measures
 */

const {
  validators,
  sanitizers,
  fileValidators,
  validateRequest,
  validateObject,
  checkBodySize,
  schema
} = require('../../../lib/validation');

describe('Validation Middleware', () => {
  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'first+last@company.org',
        'user123@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        const result = validators.email(email);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(email.toLowerCase());
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'notanemail',
        '@example.com',
        'user@',
        'user..double@example.com',
        '.startdot@example.com',
        'enddot.@example.com',
        'user@tempmail.com' // disposable email
      ];

      invalidEmails.forEach(email => {
        const result = validators.email(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should reject extremely long email addresses', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validators.email(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'SecureP@ssw0rd123',
        'MyStr0ng!Password',
        'Complex1ty$Here99',
        'V3ry$ecure&Long#Pass'
      ];

      strongPasswords.forEach(password => {
        const result = validators.password(password);
        expect(result.valid).toBe(true);
        expect(result.strength).toBeDefined();
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        'password123', // common password
        'NoSpecialChar1',
        'no-uppercase1!',
        'NO-LOWERCASE1!',
        'NoNumbers!',
        'aaaaaaaaaaaA1!' // repeated characters
      ];

      weakPasswords.forEach(password => {
        const result = validators.password(password);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should enforce custom password requirements', () => {
      const customOptions = {
        minLength: 16,
        requireSpecialChars: false
      };

      const result1 = validators.password('ShortPass1', customOptions);
      expect(result1.valid).toBe(false);

      const result2 = validators.password('LongEnoughPassword123', customOptions);
      expect(result2.valid).toBe(true);
    });
  });

  describe('UUID Validation', () => {
    test('should validate correct UUID formats', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        const result = validators.uuid(uuid);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(uuid.toLowerCase());
      });
    });

    test('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '550e8400-e29b-41d4-a716-44665544000', // too short
        '550e8400-e29b-41d4-a716-4466554400000', // too long
        'g50e8400-e29b-41d4-a716-446655440000' // invalid character
      ];

      invalidUUIDs.forEach(uuid => {
        const result = validators.uuid(uuid);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate international phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '+447911123456',
        '+33612345678',
        '1234567890'
      ];

      validPhones.forEach(phone => {
        const result = validators.phoneNumber(phone);
        expect(result.valid).toBe(true);
      });
    });

    test('should clean phone numbers', () => {
      const result = validators.phoneNumber('+1 (234) 567-8900');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('+12345678900');
    });
  });

  describe('URL Validation', () => {
    test('should validate correct URLs', () => {
      const validURLs = [
        'https://example.com',
        'http://subdomain.example.org',
        'https://example.com:8080/path',
        'https://example.com/path?query=value'
      ];

      validURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject private/local URLs', () => {
      const privateURLs = [
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1',
        'https://localhost/admin'
      ];

      privateURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('private');
      });
    });

    test('should reject URLs with suspicious ports', () => {
      const suspiciousURLs = [
        'http://example.com:22', // SSH
        'http://example.com:3306', // MySQL
        'http://example.com:5432' // PostgreSQL
      ];

      suspiciousURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('suspicious port');
      });
    });
  });

  describe('Date Validation', () => {
    test('should validate ISO 8601 dates', () => {
      const validDates = [
        '2024-01-15',
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15T10:30:00+02:00'
      ];

      validDates.forEach(date => {
        const result = validators.date(date);
        expect(result.valid).toBe(true);
        expect(result.value).toBeDefined();
      });
    });

    test('should enforce date ranges', () => {
      const options = {
        min: '2024-01-01',
        max: '2024-12-31'
      };

      const result1 = validators.date('2023-12-31', options);
      expect(result1.valid).toBe(false);

      const result2 = validators.date('2025-01-01', options);
      expect(result2.valid).toBe(false);

      const result3 = validators.date('2024-06-15', options);
      expect(result3.valid).toBe(true);
    });
  });

  describe('Number Validation', () => {
    test('should validate numbers with ranges', () => {
      const options = { min: 0, max: 100 };

      expect(validators.number(50, options).valid).toBe(true);
      expect(validators.number(-1, options).valid).toBe(false);
      expect(validators.number(101, options).valid).toBe(false);
    });

    test('should validate integer requirement', () => {
      const options = { integer: true };

      expect(validators.number(42, options).valid).toBe(true);
      expect(validators.number(42.5, options).valid).toBe(false);
    });
  });

  describe('String Validation', () => {
    test('should validate string length', () => {
      const options = { minLength: 3, maxLength: 10 };

      expect(validators.string('ab', options).valid).toBe(false);
      expect(validators.string('valid', options).valid).toBe(true);
      expect(validators.string('toolongstring', options).valid).toBe(false);
    });

    test('should validate alphanumeric strings', () => {
      const options = { alphanumeric: true };

      expect(validators.string('abc123', options).valid).toBe(true);
      expect(validators.string('abc-123', options).valid).toBe(false);
    });

    test('should validate with regex pattern', () => {
      const options = {
        pattern: /^[A-Z][a-z]+$/,
        patternError: 'Must start with uppercase letter'
      };

      expect(validators.string('John', options).valid).toBe(true);
      expect(validators.string('john', options).valid).toBe(false);
    });
  });

  describe('Enum Validation', () => {
    test('should validate enum values', () => {
      const allowedValues = ['admin', 'manager', 'crew'];

      expect(validators.enum('admin', allowedValues).valid).toBe(true);
      expect(validators.enum('guest', allowedValues).valid).toBe(false);
    });
  });

  describe('Boolean Validation', () => {
    test('should validate boolean values', () => {
      const validBooleans = [
        { value: true, expected: true },
        { value: false, expected: false },
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: '1', expected: true },
        { value: '0', expected: false },
        { value: 1, expected: true },
        { value: 0, expected: false }
      ];

      validBooleans.forEach(({ value, expected }) => {
        const result = validators.boolean(value);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(expected);
      });
    });
  });
});

describe('Sanitizers', () => {
  describe('HTML Sanitization', () => {
    test('should remove dangerous HTML', () => {
      const dangerous = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizers.html(dangerous);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    test('should allow safe HTML tags', () => {
      const safe = '<p>Paragraph with <strong>bold</strong> and <em>italic</em></p>';
      const sanitized = sanitizers.html(safe);
      expect(sanitized).toBe(safe);
    });

    test('should sanitize attributes', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const sanitized = sanitizers.html(input);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('SQL Sanitization', () => {
    test('should escape SQL special characters', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = sanitizers.sql(input);
      expect(sanitized).toBe("''; DROP TABLE users; --");
    });
  });

  describe('Filename Sanitization', () => {
    test('should sanitize filenames', () => {
      const dangerous = '../../../etc/passwd';
      const sanitized = sanitizers.filename(dangerous);
      expect(sanitized).toBe('passwd');
    });

    test('should remove special characters', () => {
      const input = 'file<>:"|?*name.txt';
      const sanitized = sanitizers.filename(input);
      expect(sanitized).toBe('file________name.txt');
    });

    test('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizers.filename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });
  });

  describe('Log Sanitization', () => {
    test('should remove control characters', () => {
      const input = 'User logged in\n\rInjected line\x00';
      const sanitized = sanitizers.log(input);
      expect(sanitized).toBe('User logged inInjected line');
    });
  });

  describe('Text Sanitization', () => {
    test('should remove HTML tags when not allowed', () => {
      const input = '<p>Text with <script>alert(1)</script> tags</p>';
      const sanitized = sanitizers.text(input);
      expect(sanitized).toBe('Text with alert(1) tags');
    });

    test('should enforce max length', () => {
      const input = 'a'.repeat(100);
      const sanitized = sanitizers.text(input, { maxLength: 50 });
      expect(sanitized.length).toBe(50);
    });
  });
});

describe('File Validators', () => {
  describe('validateFileType', () => {
    test('should validate image file signatures', async () => {
      // JPEG signature
      const jpegBuffer = Buffer.from('ffd8ffe0', 'hex');
      const result = await fileValidators.validateFileType(jpegBuffer, 'image');
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpg');
    });

    test('should reject invalid file signatures', async () => {
      const invalidBuffer = Buffer.from('00000000', 'hex');
      const result = await fileValidators.validateFileType(invalidBuffer, 'image');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUpload', () => {
    test('should validate file size', async () => {
      const file = {
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'image/jpeg',
        originalFilename: 'test.jpg'
      };

      const result = await fileValidators.validateUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('size exceeds'));
    });

    test('should validate MIME type', async () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalFilename: 'test.pdf'
      };

      const result = await fileValidators.validateUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid file type'));
    });

    test('should validate file extension', async () => {
      const file = {
        size: 1024,
        mimetype: 'image/jpeg',
        originalFilename: 'test.exe'
      };

      const result = await fileValidators.validateUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid file extension'));
    });
  });
});

describe('Request Validation', () => {
  test('should validate request with schema', () => {
    const mockReq = {
      body: {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        age: 25
      },
      query: {
        page: '1'
      }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const mockNext = jest.fn();

    const middleware = validateRequest({
      body: {
        email: { type: 'email', required: true },
        password: { type: 'password', required: true },
        age: { type: 'number', required: true, options: { min: 18 } }
      },
      query: {
        page: { type: 'number', required: false }
      }
    });

    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should reject invalid request data', () => {
    const mockReq = {
      body: {
        email: 'invalid-email',
        password: 'weak',
        age: 15
      }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const mockNext = jest.fn();

    const middleware = validateRequest({
      body: {
        email: { type: 'email', required: true },
        password: { type: 'password', required: true },
        age: { type: 'number', required: true, options: { min: 18 } }
      }
    });

    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Validation failed',
      details: expect.any(Object)
    }));
  });
});

describe('validateObject', () => {
  test('should validate object with multiple rules', () => {
    const obj = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin'
    };

    const schema = {
      name: { type: 'string', required: true, options: { minLength: 2 } },
      email: { type: 'email', required: true },
      role: { type: 'enum', required: true, options: { allowedValues: ['admin', 'user'] } }
    };

    const errors = validateObject(obj, schema);
    expect(errors).toHaveLength(0);
  });

  test('should use custom validation function', () => {
    const obj = {
      password: 'SecureP@ss123',
      confirmPassword: 'DifferentP@ss123'
    };

    const schema = {
      password: { type: 'password', required: true },
      confirmPassword: {
        type: 'password',
        required: true,
        custom: (value, obj) => value === obj.password || 'Passwords must match'
      }
    };

    const errors = validateObject(obj, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe('Passwords must match');
  });
});

describe('Body Size Validation', () => {
  test('should check request body size', (done) => {
    const mockReq = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate receiving data chunks
          callback(Buffer.alloc(1024)); // 1KB
          callback(Buffer.alloc(1024)); // Another 1KB
        }
        if (event === 'end') {
          setTimeout(callback, 0);
        }
      }),
      connection: { destroy: jest.fn() }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const mockNext = jest.fn();

    const middleware = checkBodySize('auth'); // 10KB limit

    middleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.bodySize).toBe(2048);
      done();
    }, 10);
  });

  test('should reject oversized body', (done) => {
    const mockReq = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate receiving large data
          for (let i = 0; i < 20; i++) {
            callback(Buffer.alloc(1024)); // 20KB total
          }
        }
      }),
      connection: { destroy: jest.fn() }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const mockNext = jest.fn();

    const middleware = checkBodySize('auth'); // 10KB limit

    middleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockReq.connection.destroy).toHaveBeenCalled();
      done();
    }, 10);
  });
});