/**
 * Comprehensive Input Validation Library
 * Provides secure input validation for all API endpoints
 */

const crypto = require('crypto');
const path = require('path');
const validator = require('validator');
const xss = require('xss');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Request body size limits by endpoint type
 */
const BODY_SIZE_LIMITS = {
  default: 1024 * 1024,           // 1MB default
  auth: 10 * 1024,                // 10KB for auth endpoints
  upload: 50 * 1024 * 1024,       // 50MB for file uploads
  content: 5 * 1024 * 1024,       // 5MB for content creation
  api: 512 * 1024                 // 512KB for general API calls
};

/**
 * File upload configurations
 */
const FILE_UPLOAD_CONFIG = {
  image: {
    maxSize: 10 * 1024 * 1024,    // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    // Magic bytes for file type validation
    signatures: {
      'ffd8ffe0': 'jpg',
      'ffd8ffe1': 'jpg',
      'ffd8ffe2': 'jpg',
      'ffd8ffe3': 'jpg',
      'ffd8ffdb': 'jpg',
      '89504e47': 'png',
      '47494638': 'gif',
      '52494646': 'webp'
    }
  },
  video: {
    maxSize: 100 * 1024 * 1024,   // 100MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedExtensions: ['.mp4', '.webm', '.ogg'],
    signatures: {
      '00000018': 'mp4',
      '00000020': 'mp4',
      '1a45dfa3': 'webm'
    }
  },
  document: {
    maxSize: 25 * 1024 * 1024,    // 25MB
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    signatures: {
      '25504446': 'pdf',
      'd0cf11e0': 'doc',
      '504b0304': 'docx'
    }
  }
};

/**
 * Password complexity requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '@$!%*?&#+=-_.,;:~`^()[]{}|\\/<>"\' ', // Expanded character set
  // Comprehensive list of common weak passwords to reject
  commonPasswords: [
    // Basic patterns
    'password', 'password123', 'password1', 'password12', 'password1234',
    'admin', 'admin123', 'admin1', 'administrator', 'root', 'user', 'guest',
    'letmein', 'letmein123', 'welcome', 'welcome123', 'welcome1',
    'qwerty', 'qwerty123', 'qwerty1', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
    'zxcvbn', 'zxcvbnm', 'poiuytrewq', 'mnbvcxz',
    
    // Number sequences
    '123456', '1234567', '12345678', '123456789', '1234567890',
    '987654321', '0987654321', '1111111111', '2222222222', '3333333333',
    
    // Keyboard patterns
    'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm',
    'asdzxc', 'zxccvb', 'cvbfgh', 'fghjkl', 'hjklnm', 'klmqwe',
    
    // Common words
    'login', 'signin', 'access', 'secret', 'private', 'confidential',
    'master', 'super', 'system', 'database', 'server', 'network',
    'security', 'firewall', 'backup', 'recovery', 'support', 'service',
    
    // Dates and years
    '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
    '01012024', '31122023', '01011900', '12345678', '87654321',
    
    // Names and common combinations
    'john', 'jane', 'mike', 'mary', 'david', 'sarah', 'chris', 'lisa',
    'test', 'testing', 'test123', 'demo', 'demo123', 'sample', 'example',
    'temp', 'temporary', 'default', 'changeme', 'newpassword',
    
    // Company/maritime related
    'maritime', 'shipping', 'vessel', 'captain', 'crew', 'sailor',
    'anchor', 'harbor', 'port', 'dock', 'ship', 'boat', 'ocean', 'sea',
    'navigation', 'compass', 'bridge', 'deck', 'cargo', 'container',
    
    // Weak patterns with numbers
    'abc123', 'xyz123', '123abc', '123xyz', 'pass123', 'user123',
    'login123', 'admin1234', 'root123', 'guest123', 'test1234',
    
    // Special character patterns
    'password!', 'password@', 'password#', 'password$', 'password%',
    'admin!', 'admin@', 'admin#', 'login!', 'login@', 'welcome!',
    
    // Reversed common passwords
    'drowssap', 'nimda', 'toor', 'resu', 'tseug', 'nietsem',
    'emoclew', 'ytrewq', 'hgfedcba', 'nmlkjihg',
    
    // Doubled patterns
    'passwordpassword', 'adminadmin', 'testtest', 'useruser',
    'loginlogin', 'welcomewelcome', 'qwertyqwerty',
    
    // Common substitutions
    'p@ssw0rd', 'p@ssword', 'passw0rd', '@dmin', '@dmin123',
    'l3tm31n', 'w3lc0m3', 'qu3rty', 'p4ssw0rd', '4dm1n',
    
    // Seasonal/temporal
    'spring', 'summer', 'autumn', 'winter', 'january', 'february',
    'march', 'april', 'may', 'june', 'july', 'august', 'september',
    'october', 'november', 'december', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'sunday',
    
    // Technology terms
    'windows', 'linux', 'apple', 'google', 'microsoft', 'oracle',
    'mysql', 'postgres', 'mongodb', 'redis', 'docker', 'kubernetes',
    'aws', 'azure', 'cloud', 'server', 'database', 'api', 'web',
    
    // Simple patterns
    'aaaaaa', 'bbbbbb', 'cccccc', 'dddddd', 'eeeeee', 'ffffff',
    'gggggg', 'hhhhhh', 'iiiiii', 'jjjjjj', 'kkkkkk', 'llllll',
    'mmmmmm', 'nnnnnn', 'oooooo', 'pppppp', 'qqqqqq', 'rrrrrr',
    'ssssss', 'tttttt', 'uuuuuu', 'vvvvvv', 'wwwwww', 'xxxxxx',
    'yyyyyy', 'zzzzzz'
  ]
};

/**
 * Validation functions
 */
const validators = {
  /**
   * Validate email with enhanced checks
   */
  email(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Length check first
    if (normalizedEmail.length > 254) {
      return { valid: false, error: 'Email is too long' };
    }

    // Basic format validation using validator.js
    if (!validator.isEmail(normalizedEmail, { 
      allow_display_name: false,
      require_tld: true,
      allow_underscores: false,
      domain_specific_validation: true
    })) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Additional checks
    if (normalizedEmail.includes('..')) {
      return { valid: false, error: 'Email cannot contain consecutive dots' };
    }

    if (normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
      return { valid: false, error: 'Email cannot start or end with a dot' };
    }

    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
    const domain = normalizedEmail.split('@')[1];
    if (disposableDomains.includes(domain)) {
      return { valid: false, error: 'Disposable email addresses are not allowed' };
    }

    return { valid: true, value: normalizedEmail };
  },

  /**
   * Validate password with complexity requirements
   */
  password(password, options = {}) {
    const requirements = { ...PASSWORD_REQUIREMENTS, ...options };

    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required', strength: 'weak' };
    }

    // Calculate password strength score first
    let strength = 0;
    if (password.length >= 16) strength++;
    if (/[A-Z].*[A-Z]/.test(password)) strength++;
    if (/[a-z].*[a-z]/.test(password)) strength++;
    if (/\d.*\d/.test(password)) strength++;
    if (/[@$!%*?&].*[@$!%*?&]/.test(password)) strength++;
    
    const strengthLabel = strength >= 3 ? 'strong' : strength >= 2 ? 'medium' : 'weak';

    // Length check
    if (password.length < requirements.minLength) {
      return { valid: false, error: `Password must be at least ${requirements.minLength} characters long`, strength: strengthLabel };
    }

    if (password.length > requirements.maxLength) {
      return { valid: false, error: `Password must not exceed ${requirements.maxLength} characters`, strength: strengthLabel };
    }

    // Complexity checks
    const checks = [];
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      checks.push('one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      checks.push('one lowercase letter');
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      checks.push('one number');
    }

    if (requirements.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      checks.push('one special character (@$!%*?&)');
    }

    if (checks.length > 0) {
      return { 
        valid: false, 
        error: `Password must contain at least ${checks.join(', ')}`,
        strength: strengthLabel
      };
    }

    // Check against common passwords
    const lowerPassword = password.toLowerCase();
    if (requirements.commonPasswords.some(common => lowerPassword.includes(common))) {
      return { valid: false, error: 'Password is too common. Please choose a stronger password', strength: strengthLabel };
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      return { valid: false, error: 'Password cannot contain more than 2 repeated characters', strength: strengthLabel };
    }

    return { 
      valid: true, 
      strength: strengthLabel
    };
  },,

  /**
   * Validate UUID
   */
  uuid(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return { valid: false, error: 'UUID is required' };
    }

    // Use validator.isUUID with version 'all' to accept all UUID versions
    if (!validator.isUUID(uuid, 'all')) {
      return { valid: false, error: 'Invalid UUID format' };
    }

    return { valid: true, value: uuid.toLowerCase() };
  },,

  /**
   * Validate phone number with international support
   */
  phoneNumber(phone, options = {}) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Phone number is required' };
    }

    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    // Basic validation
    if (!/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    // Use validator.js for more thorough validation
    if (options.locale && !validator.isMobilePhone(cleanPhone, options.locale)) {
      return { valid: false, error: 'Invalid phone number for specified region' };
    }

    return { valid: true, value: cleanPhone };
  },

  /**
   * Validate URL
   */
  url(url, options = {}) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    // Additional security checks first
    try {
      const urlObj = new URL(url);
      
      // Check for local/private addresses
      const hostname = urlObj.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^0\.0\.0\.0$/
      ];

      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        return { valid: false, error: 'URL cannot point to private or local addresses' };
      }

      // Check for suspicious ports
      const suspiciousPorts = ['22', '23', '3389', '5432', '3306', '27017'];
      if (urlObj.port && suspiciousPorts.includes(urlObj.port)) {
        return { valid: false, error: 'URL contains suspicious port' };
      }

    } catch (error) {
      // If URL constructor fails, fall back to validator.isURL
    }

    const validationOptions = {
      protocols: options.protocols || ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      require_host: true,
      require_tld: options.requireTld !== false,
      allow_underscores: false,
      allow_protocol_relative_urls: false
    };

    if (!validator.isURL(url, validationOptions)) {
      return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true, value: url };
  },,

  /**
   * Validate date
   */
  date(date, options = {}) {
    if (!date) {
      return { valid: false, error: 'Date is required' };
    }

    let dateObj;
    if (typeof date === 'string') {
      if (!validator.isISO8601(date)) {
        return { valid: false, error: 'Invalid date format. Use ISO 8601 format' };
      }
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return { valid: false, error: 'Invalid date type' };
    }

    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }

    // Check date ranges if specified
    if (options.min) {
      const minDate = new Date(options.min);
      if (dateObj < minDate) {
        return { valid: false, error: `Date must be after ${minDate.toISOString()}` };
      }
    }

    if (options.max) {
      const maxDate = new Date(options.max);
      if (dateObj > maxDate) {
        return { valid: false, error: `Date must be before ${maxDate.toISOString()}` };
      }
    }

    return { valid: true, value: dateObj.toISOString() };
  },

  /**
   * Validate enum/choice field
   */
  enum(value, options = {}) {
    if (!value) {
      return { valid: false, error: 'Value is required' };
    }

    const allowedValues = options.allowedValues || options;
    
    if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
      return { valid: false, error: 'Invalid enum configuration' };
    }

    if (!allowedValues.includes(value)) {
      return { 
        valid: false, 
        error: `Invalid value. Must be one of: ${allowedValues.join(', ')}` 
      };
    }

    return { valid: true, value };
  },,

  /**
   * Validate number with range
   */
  number(value, options = {}) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid number' };
    }

    if (options.min !== undefined && num < options.min) {
      return { valid: false, error: `Number must be at least ${options.min}` };
    }

    if (options.max !== undefined && num > options.max) {
      return { valid: false, error: `Number must not exceed ${options.max}` };
    }

    if (options.integer && !Number.isInteger(num)) {
      return { valid: false, error: 'Number must be an integer' };
    }

    return { valid: true, value: num };
  },

  /**
   * Validate string with length and pattern
   */
  string(value, options = {}) {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'String value is required' };
    }

    const trimmed = value.trim();

    if (options.minLength && trimmed.length < options.minLength) {
      return { valid: false, error: `Must be at least ${options.minLength} characters` };
    }

    if (options.maxLength && trimmed.length > options.maxLength) {
      return { valid: false, error: `Must not exceed ${options.maxLength} characters` };
    }

    if (options.pattern && !options.pattern.test(trimmed)) {
      return { valid: false, error: options.patternError || 'Invalid format' };
    }

    if (options.alphanumeric && !validator.isAlphanumeric(trimmed)) {
      return { valid: false, error: 'Must contain only letters and numbers' };
    }

    return { valid: true, value: trimmed };
  },

  /**
   * Validate boolean
   */
  boolean(value) {
    if (typeof value === 'boolean') {
      return { valid: true, value };
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lower)) {
        return { valid: true, value: true };
      }
      if (['false', '0', 'no', 'off'].includes(lower)) {
        return { valid: true, value: false };
      }
    }

    if (typeof value === 'number') {
      return { valid: true, value: value !== 0 };
    }

    return { valid: false, error: 'Invalid boolean value' };
  }
};

/**
 * Sanitization functions
 */
const sanitizers = {
  /**
   * Sanitize HTML content
   */
  html(input, options = {}) {
    if (!input || typeof input !== 'string') return '';

    const config = {
      ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: options.allowedAttrs || ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ...options.config
    };

    return DOMPurify.sanitize(input, config);
  },

  /**
   * Sanitize for SQL (escape quotes)
   */
  sql(input) {
    if (!input || typeof input !== 'string') return '';
    // Note: This is basic escaping. Always use parameterized queries!
    return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
  },

  /**
   * Sanitize filename
   */
  filename(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove path traversal attempts
    let safe = path.basename(input);
    
    // Remove dangerous characters
    safe = safe.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // Limit length
    if (safe.length > 255) {
      const ext = path.extname(safe);
      const base = path.basename(safe, ext);
      safe = base.substring(0, 255 - ext.length) + ext;
    }
    
    return safe;
  },

  /**
   * Sanitize for log output (prevent log injection)
   */
  log(input) {
    if (!input || typeof input !== 'string') return '';
    // Remove newlines and control characters
    return input.replace(/[\r\n\x00-\x1F\x7F-\x9F]/g, '');
  },

  /**
   * General text sanitization
   */
  text(input, options = {}) {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Strip HTML tags if not allowed
    if (!options.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Limit length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
  }
};

/**
 * File validation functions
 */
const fileValidators = {
  /**
   * Validate file type by magic bytes
   */
  async validateFileType(buffer, expectedType) {
    if (!buffer || buffer.length < 4) {
      return { valid: false, error: 'Invalid file buffer' };
    }

    if (!config) {
      return { valid: false, error: `Unknown file type: ${expectedType}` };
    }

    // Check magic bytes
    const header = buffer.slice(0, 8).toString('hex');
    let detectedType = null;

    for (const [signature, type] of Object.entries(config.signatures)) {
      if (header.startsWith(signature)) {
        detectedType = type;
        break;
      }
    }

    if (!detectedType) {
      return { valid: false, error: 'File type could not be verified' };
    }

    return { valid: true, detectedType };
  },

  /**
   * Validate file upload
   */
  async validateUpload(file, type, options = {}) {
    const errors = [];

    // Check file existence
    if (!file) {
      return { valid: false, errors: ['No file provided'] };
    }

    // Check file size
    if (file.size > config.maxSize) {
      errors.push(`File size exceeds maximum of ${config.maxSize / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (config.allowedMimeTypes && !config.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`);
    }

    // Check file extension
    if (file.originalFilename) {
      if (config.allowedExtensions && !config.allowedExtensions.includes(ext)) {
        errors.push(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }
};

/**
 * Request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {

    // Validate body
    if (schema.body) {
      const bodyErrors = validateObject(req.body, schema.body);
      if (bodyErrors.length > 0) {
        errors.body = bodyErrors;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const queryErrors = validateObject(req.query, schema.query);
      if (queryErrors.length > 0) {
        errors.query = queryErrors;
      }
    }

    // Validate URL parameters
    if (schema.params) {
      const paramsErrors = validateObject(req.params, schema.params);
      if (paramsErrors.length > 0) {
        errors.params = paramsErrors;
      }
    }

    // Validate headers
    if (schema.headers) {
      const headerErrors = validateObject(req.headers, schema.headers);
      if (headerErrors.length > 0) {
        errors.headers = headerErrors;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Validate object against schema
 */
function validateObject(obj, schema) {

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        error: `${field} is required`
      });
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Validate based on type
    if (rules.type) {
      if (validator) {
        const result = validator(value, rules.options || {});
        if (!result.valid) {
          errors.push({
            field,
            error: result.error
          });
        } else if (result.value !== undefined) {
          // Update the object with sanitized value
          obj[field] = result.value;
        }
      }
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value, obj);
      if (customResult !== true) {
        errors.push({
          field,
          error: typeof customResult === 'string' ? customResult : 'Custom validation failed'
        });
      }
    }
  }

  return errors;
}

/**
 * Check request body size
 */
function checkBodySize(type = 'default') {
  const limit = BODY_SIZE_LIMITS[type] || BODY_SIZE_LIMITS.default;
  
  return (req, res, next) => {
    let size = 0;
    
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        res.status(413).json({
          error: 'Request body too large',
          maxSize: limit,
          sizeReceived: size
        });
        req.connection.destroy();
      }
    });
    
    req.on('end', () => {
      req.bodySize = size;
      next();
    });
  };
}

/**
 * Create validation schema builder
 */
const schema = {
  string: (options = {}) => ({ type: 'string', ...options }),
  number: (options = {}) => ({ type: 'number', ...options }),
  boolean: (options = {}) => ({ type: 'boolean', ...options }),
  email: (options = {}) => ({ type: 'email', ...options }),
  password: (options = {}) => ({ type: 'password', ...options }),
  uuid: (options = {}) => ({ type: 'uuid', ...options }),
  phone: (options = {}) => ({ type: 'phoneNumber', ...options }),
  url: (options = {}) => ({ type: 'url', ...options }),
  date: (options = {}) => ({ type: 'date', ...options }),
  enum: (values, options = {}) => ({ type: 'enum', options: { allowedValues: values }, ...options }),
  custom: (fn, options = {}) => ({ custom: fn, ...options })
};

module.exports = {
  validators,
  sanitizers,
  fileValidators,
  validateRequest,
  validateObject,
  checkBodySize,
  schema,
  BODY_SIZE_LIMITS,
  FILE_UPLOAD_CONFIG,
  PASSWORD_REQUIREMENTS
};