/**
 * Unit Tests for Validation Library
 * Tests comprehensive input validation functions
 */

const {
  validators,
  sanitizers,
  fileValidators,
  validateObject,
  schema,
  BODY_SIZE_LIMITS,
  FILE_UPLOAD_CONFIG,
  PASSWORD_REQUIREMENTS
} = require('../../../lib/validation');

describe('Validation Library', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname+lastname@company.org',
        'test123@test-domain.com',
        'TEST@EXAMPLE.COM'
      ];

      validEmails.forEach(email => {
        const result = validators.email(email);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(email.trim().toLowerCase());
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        'user@domain..com',
        '.user@domain.com',
        'user.@domain.com',
        null,
        undefined,
        123
      ];

      invalidEmails.forEach(email => {
        const result = validators.email(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    it('should reject disposable email domains', () => {
      const disposableEmails = [
        'test@tempmail.com',
        'user@throwaway.email',
        'someone@10minutemail.com'
      ];

      disposableEmails.forEach(email => {
        const result = validators.email(email);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Disposable email addresses are not allowed');
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validators.email(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'StrongPass1@',
        'MySecure2024$',
        'Complex@Pass1',
        'VeryLong123!Password'
      ];

      validPasswords.forEach(password => {
        const result = validators.password(password);
        expect(result.valid).toBe(true);
        expect(['strong', 'medium']).toContain(result.strength);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        { password: '', error: 'required' },
        { password: 'weak', error: 'at least 12 characters' },
        { password: 'password123', error: 'uppercase' },
        { password: 'PASSWORD123', error: 'lowercase' },
        { password: 'Password', error: 'number' },
        { password: 'Password123', error: 'special character' },
        { password: 'Pass1!', error: 'at least 12 characters' },
        { password: null, error: 'required' },
        { password: undefined, error: 'required' }
      ];

      invalidPasswords.forEach(({ password, error }) => {
        const result = validators.password(password);
        expect(result.valid).toBe(false);
        expect(result.error.toLowerCase()).toContain(error);
      });
    });

    it('should reject common passwords', () => {
      const commonPasswords = [
        'Password123!',  // Contains 'password123'
        'Admin123!@#',   // Contains 'admin123'
        'Welcome123!',   // Contains 'welcome123'
      ];

      commonPasswords.forEach(password => {
        const result = validators.password(password);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too common');
      });
    });

    it('should reject passwords with repeated characters', () => {
      const result = validators.password('Passsword123!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('repeated characters');
    });

    it('should calculate password strength correctly', () => {
      expect(validators.password('ShortPass1!').strength).toBe('weak');
      expect(validators.password('MediumPass123!').strength).toBe('medium');
      expect(validators.password('VeryStrongPass123!@#').strength).toBe('strong');
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUID formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'A987FBC9-4BED-3078-CF07-9141BA07C9F3' // uppercase
      ];

      validUUIDs.forEach(uuid => {
        const result = validators.uuid(uuid);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(uuid.toLowerCase());
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567-e89b-12d3-g456-426614174000', // Invalid character
        null,
        undefined
      ];

      invalidUUIDs.forEach(uuid => {
        const result = validators.uuid(uuid);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone number formats', () => {
      const validPhones = [
        '+1234567890',
        '+31612345678',
        '1234567890',
        '+44 20 7946 0958',
        '+1 (555) 123-4567',
        '+1-555-123-4567'
      ];

      validPhones.forEach(phone => {
        const result = validators.phoneNumber(phone);
        expect(result.valid).toBe(true);
        expect(result.value).toMatch(/^\+?\d+$/);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        'abc',
        '123',
        '+',
        '++1234567890',
        'phone123',
        null,
        undefined
      ];

      invalidPhones.forEach(phone => {
        const result = validators.phoneNumber(phone);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      const validURLs = [
        'https://example.com',
        'http://subdomain.example.com',
        'https://example.com/path/to/resource',
        'https://example.com:8080',
        'https://example.com?query=param'
      ];

      validURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidURLs = [
        '',
        'not-a-url',
        'ftp://example.com', // Not in allowed protocols
        'javascript:alert(1)',
        '//example.com', // Protocol relative
        null,
        undefined
      ];

      invalidURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject URLs with private/local addresses', () => {
      const privateURLs = [
        'http://localhost',
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://0.0.0.0'
      ];

      privateURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('private or local');
      });
    });

    it('should reject URLs with suspicious ports', () => {
      const suspiciousURLs = [
        'http://example.com:22',   // SSH
        'http://example.com:3389', // RDP
        'http://example.com:5432', // PostgreSQL
      ];

      suspiciousURLs.forEach(url => {
        const result = validators.url(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('suspicious port');
      });
    });
  });

  describe('String Validation', () => {
    it('should validate strings with constraints', () => {
      const result = validators.string('Test String', {
        minLength: 5,
        maxLength: 20
      });
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Test String');
    });

    it('should trim whitespace', () => {
      const result = validators.string('  Test  ', {});
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Test');
    });

    it('should enforce length constraints', () => {
      const tooShort = validators.string('Hi', { minLength: 5 });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toContain('at least 5');

      const tooLong = validators.string('Very long string', { maxLength: 5 });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toContain('not exceed 5');
    });

    it('should validate patterns', () => {
      const result = validators.string('ABC123', {
        pattern: /^[A-Z]+\d+$/,
        patternError: 'Must be uppercase letters followed by numbers'
      });
      expect(result.valid).toBe(true);

      const invalid = validators.string('abc123', {
        pattern: /^[A-Z]+\d+$/,
        patternError: 'Must be uppercase letters followed by numbers'
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBe('Must be uppercase letters followed by numbers');
    });

    it('should validate alphanumeric strings', () => {
      const valid = validators.string('Test123', { alphanumeric: true });
      expect(valid.valid).toBe(true);

      const invalid = validators.string('Test-123', { alphanumeric: true });
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toContain('letters and numbers');
    });
  });

  describe('Sanitizers', () => {
    describe('HTML Sanitization', () => {
      it('should remove dangerous HTML', () => {
        const dangerous = '<script>alert("XSS")</script><p>Safe content</p>';
        const sanitized = sanitizers.html(dangerous);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('<p>Safe content</p>');
      });

      it('should allow specified tags', () => {
        const html = '<p>Paragraph</p><div>Div</div><strong>Bold</strong>';
        const sanitized = sanitizers.html(html);
        expect(sanitized).toContain('<p>');
        expect(sanitized).toContain('<strong>');
        expect(sanitized).not.toContain('<div>'); // div not in default allowed tags
      });

      it('should handle empty input', () => {
        expect(sanitizers.html(null)).toBe('');
        expect(sanitizers.html(undefined)).toBe('');
        expect(sanitizers.html('')).toBe('');
      });
    });

    describe('Filename Sanitization', () => {
      it('should sanitize dangerous filenames', () => {
        expect(sanitizers.filename('../../../etc/passwd')).toBe('passwd');
        expect(sanitizers.filename('file<script>.txt')).toBe('file_script_.txt');
        expect(sanitizers.filename('my file.txt')).toBe('my_file.txt');
      });

      it('should limit filename length', () => {
        const longName = 'a'.repeat(300) + '.txt';
        const sanitized = sanitizers.filename(longName);
        expect(sanitized.length).toBeLessThanOrEqual(255);
        expect(sanitized.endsWith('.txt')).toBe(true);
      });
    });

    describe('SQL Sanitization', () => {
      it('should escape SQL special characters', () => {
        expect(sanitizers.sql("'; DROP TABLE users; --")).toBe("''; DROP TABLE users; --");
        expect(sanitizers.sql("O'Brien")).toBe("O''Brien");
        expect(sanitizers.sql("backslash\\test")).toBe("backslash\\\\test");
      });
    });

    describe('Log Sanitization', () => {
      it('should remove control characters and newlines', () => {
        const malicious = "Normal log\nInjected line\rCarriage return\x00Null byte";
        const sanitized = sanitizers.log(malicious);
        expect(sanitized).toBe("Normal logInjected lineCarriage returnNull byte");
      });
    });

    describe('Text Sanitization', () => {
      it('should sanitize general text', () => {
        const text = '  <script>alert(1)</script>Hello\x00World  ';
        const sanitized = sanitizers.text(text);
        expect(sanitized).toBe('alert(1)HelloWorld');
      });

      it('should respect maxLength option', () => {
        const longText = 'a'.repeat(100);
        const sanitized = sanitizers.text(longText, { maxLength: 50 });
        expect(sanitized.length).toBe(50);
      });
    });
  });

  describe('Object Validation', () => {
    it('should validate complex objects', () => {
      const testSchema = {
        email: { required: true, type: 'email' },
        age: { required: true, type: 'number', options: { min: 18, max: 100 } },
        role: { required: true, type: 'enum', options: { allowedValues: ['admin', 'user'] } },
        website: { required: false, type: 'url' }
      };

      const validData = {
        email: 'test@example.com',
        age: 25,
        role: 'admin'
      };

      const errors = validateObject(validData, testSchema);
      expect(errors).toHaveLength(0);
    });

    it('should report multiple validation errors', () => {
      const testSchema = {
        email: { required: true, type: 'email' },
        age: { required: true, type: 'number', options: { min: 18 } }
      };

      const invalidData = {
        email: 'invalid-email',
        age: 15
      };

      const errors = validateObject(invalidData, testSchema);
      expect(errors).toHaveLength(2);
      expect(errors[0].field).toBe('email');
      expect(errors[1].field).toBe('age');
    });

    it('should handle custom validation functions', () => {
      const testSchema = {
        username: {
          required: true,
          type: 'string',
          custom: (value) => {
            if (value.length < 3) return 'Username too short';
            if (value.includes(' ')) return 'Username cannot contain spaces';
            return true;
          }
        }
      };

      const errors1 = validateObject({ username: 'ab' }, testSchema);
      expect(errors1[0].error).toBe('Username too short');

      const errors2 = validateObject({ username: 'user name' }, testSchema);
      expect(errors2[0].error).toBe('Username cannot contain spaces');

      const errors3 = validateObject({ username: 'validuser' }, testSchema);
      expect(errors3).toHaveLength(0);
    });

    it('should update object with sanitized values', () => {
      const testSchema = {
        email: { required: true, type: 'email' }
      };

      const data = { email: 'TEST@EXAMPLE.COM' };
      validateObject(data, testSchema);
      expect(data.email).toBe('test@example.com');
    });
  });

  describe('Schema Builder', () => {
    it('should create validation schemas', () => {
      const testSchema = {
        email: schema.email({ required: true }),
        age: schema.number({ required: true, options: { min: 18 } }),
        role: schema.enum(['admin', 'user'], { required: true }),
        bio: schema.string({ required: false, options: { maxLength: 500 } }),
        verified: schema.boolean({ required: false })
      };

      expect(testSchema.email.type).toBe('email');
      expect(testSchema.age.type).toBe('number');
      expect(testSchema.role.type).toBe('enum');
      expect(testSchema.bio.type).toBe('string');
      expect(testSchema.verified.type).toBe('boolean');
    });
  });

  describe('File Validation', () => {
    it('should validate file uploads', async () => {
      const validFile = {
        size: 5 * 1024 * 1024, // 5MB
        mimetype: 'image/jpeg',
        originalFilename: 'photo.jpg'
      };

      const result = await fileValidators.validateUpload(validFile, 'image');
      expect(result.valid).toBe(true);
    });

    it('should reject oversized files', async () => {
      const largeFile = {
        size: 20 * 1024 * 1024, // 20MB
        mimetype: 'image/jpeg',
        originalFilename: 'large.jpg'
      };

      const result = await fileValidators.validateUpload(largeFile, 'image');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should reject invalid mime types', async () => {
      const invalidFile = {
        size: 1024,
        mimetype: 'application/exe',
        originalFilename: 'malware.exe'
      };

      const result = await fileValidators.validateUpload(invalidFile, 'image');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid file type');
    });

    it('should validate file magic bytes', async () => {
      // JPEG magic bytes
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00, 0x00, 0x00]);
      const jpegResult = await fileValidators.validateFileType(jpegBuffer, 'image');
      expect(jpegResult.valid).toBe(true);
      expect(jpegResult.detectedType).toBe('jpg');

      // PNG magic bytes
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x00]);
      const pngResult = await fileValidators.validateFileType(pngBuffer, 'image');
      expect(pngResult.valid).toBe(true);
      expect(pngResult.detectedType).toBe('png');

      // Invalid magic bytes
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const invalidResult = await fileValidators.validateFileType(invalidBuffer, 'image');
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct body size limits', () => {
      expect(BODY_SIZE_LIMITS.default).toBe(1024 * 1024); // 1MB
      expect(BODY_SIZE_LIMITS.auth).toBe(10 * 1024); // 10KB
      expect(BODY_SIZE_LIMITS.upload).toBe(50 * 1024 * 1024); // 50MB
      expect(BODY_SIZE_LIMITS.content).toBe(5 * 1024 * 1024); // 5MB
      expect(BODY_SIZE_LIMITS.api).toBe(512 * 1024); // 512KB
    });

    it('should have correct file upload configurations', () => {
      expect(FILE_UPLOAD_CONFIG.image.maxSize).toBe(10 * 1024 * 1024);
      expect(FILE_UPLOAD_CONFIG.image.allowedMimeTypes).toContain('image/jpeg');
      expect(FILE_UPLOAD_CONFIG.image.allowedExtensions).toContain('.jpg');

      expect(FILE_UPLOAD_CONFIG.video.maxSize).toBe(100 * 1024 * 1024);
      expect(FILE_UPLOAD_CONFIG.document.maxSize).toBe(25 * 1024 * 1024);
    });

    it('should have correct password requirements', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(12);
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireNumbers).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireSpecialChars).toBe(true);
    });
  });
});