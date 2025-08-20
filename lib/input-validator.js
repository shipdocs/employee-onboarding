/**
 * Input Validation Middleware
 * Provides comprehensive input validation and sanitization
 */

const validator = require('validator');
const xss = require('xss');
const DOMPurify = require('isomorphic-dompurify');

class InputValidator {
  constructor() {
    // Common validation patterns
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
      username: /^[a-zA-Z0-9_-]{3,30}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/
    };

    // Field-specific validation rules
    this.fieldRules = {
      email: {
        required: true,
        type: 'email',
        maxLength: 255,
        transform: 'toLowerCase'
      },
      password: {
        required: true,
        type: 'password',
        minLength: 8,
        maxLength: 128
      },
      username: {
        required: true,
        type: 'username',
        minLength: 3,
        maxLength: 30,
        transform: 'toLowerCase'
      },
      firstName: {
        required: true,
        type: 'alpha',
        minLength: 1,
        maxLength: 50,
        transform: 'trim'
      },
      lastName: {
        required: true,
        type: 'alpha',
        minLength: 1,
        maxLength: 50,
        transform: 'trim'
      },
      phone: {
        required: false,
        type: 'phone',
        transform: 'normalizePhone'
      },
      dateOfBirth: {
        required: false,
        type: 'date',
        beforeToday: true
      },
      role: {
        required: true,
        enum: ['admin', 'manager', 'crew', 'guest']
      },
      status: {
        required: false,
        enum: ['active', 'inactive', 'pending', 'suspended']
      }
    };
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitize(input, options = {}) {
    if (typeof input !== 'string') {
      return input;
    }

    // Use DOMPurify for HTML content
    if (options.allowHtml) {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: options.allowedAttributes || ['href', 'target']
      });
    }

    // Use xss library for general sanitization
    return xss(input, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }

  /**
   * Validate a single field
   */
  validateField(value, rules) {
    const errors = [];

    // Check required
    if (rules.required && !value) {
      errors.push('This field is required');
      return errors;
    }

    // Skip validation if not required and empty
    if (!rules.required && !value) {
      return errors;
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          if (!this.patterns.email.test(value)) {
            errors.push('Invalid email address');
          }
          break;
        case 'password':
          if (!this.patterns.password.test(value)) {
            errors.push('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character');
          }
          break;
        case 'username':
          if (!this.patterns.username.test(value)) {
            errors.push('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens');
          }
          break;
        case 'phone':
          if (!this.patterns.phone.test(value)) {
            errors.push('Invalid phone number');
          }
          break;
        case 'url':
          if (!validator.isURL(value)) {
            errors.push('Invalid URL');
          }
          break;
        case 'uuid':
          if (!validator.isUUID(value)) {
            errors.push('Invalid UUID');
          }
          break;
        case 'date':
          if (!validator.isDate(value)) {
            errors.push('Invalid date format');
          }
          break;
        case 'alpha':
          if (!validator.isAlpha(value, 'en-US', { ignore: ' -' })) {
            errors.push('Must contain only letters');
          }
          break;
        case 'alphanumeric':
          if (!validator.isAlphanumeric(value, 'en-US', { ignore: ' -' })) {
            errors.push('Must contain only letters and numbers');
          }
          break;
        case 'numeric':
          if (!validator.isNumeric(value)) {
            errors.push('Must be a number');
          }
          break;
        case 'boolean':
          if (!validator.isBoolean(value.toString())) {
            errors.push('Must be true or false');
          }
          break;
      }
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters`);
    }

    // Numeric range validation
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors.push(`Must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && parseFloat(value) > rules.max) {
      errors.push(`Must be no more than ${rules.max}`);
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Must be one of: ${rules.enum.join(', ')}`);
    }

    // Pattern validation
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      errors.push(rules.patternMessage || 'Invalid format');
    }

    // Custom validation
    if (rules.custom && typeof rules.custom === 'function') {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    // Date validation
    if (rules.beforeToday) {
      const date = new Date(value);
      if (date >= new Date()) {
        errors.push('Date must be in the past');
      }
    }
    if (rules.afterToday) {
      const date = new Date(value);
      if (date <= new Date()) {
        errors.push('Date must be in the future');
      }
    }

    return errors;
  }

  /**
   * Transform field value
   */
  transformField(value, transform) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    switch (transform) {
      case 'toLowerCase':
        return value.toLowerCase();
      case 'toUpperCase':
        return value.toUpperCase();
      case 'trim':
        return value.trim();
      case 'normalizeEmail':
        return validator.normalizeEmail(value);
      case 'normalizePhone':
        return value.replace(/[^\d+]/g, '');
      case 'escape':
        return validator.escape(value);
      default:
        return value;
    }
  }

  /**
   * Validate request body
   */
  validateBody(body, schema) {
    const errors = {};
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = body[field];

      // Apply transformation
      if (rules.transform && value) {
        value = this.transformField(value, rules.transform);
      }

      // Sanitize
      if (value && typeof value === 'string') {
        value = this.sanitize(value, rules.sanitizeOptions || {});
      }

      // Validate
      const fieldErrors = this.validateField(value, rules);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }

      // Add to sanitized object
      if (value !== undefined) {
        sanitized[field] = value;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Express middleware for validation
   */
  validate(schema) {
    return (req, res, next) => {
      const result = this.validateBody(req.body, schema);

      if (!result.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          fields: result.errors
        });
      }

      // Replace body with sanitized data
      req.body = result.sanitized;
      next();
    };
  }

  /**
   * Validate query parameters
   */
  validateQuery(schema) {
    return (req, res, next) => {
      const result = this.validateBody(req.query, schema);

      if (!result.valid) {
        return res.status(400).json({
          error: 'Query validation failed',
          fields: result.errors
        });
      }

      // Replace query with sanitized data
      req.query = result.sanitized;
      next();
    };
  }

  /**
   * Validate parameters
   */
  validateParams(schema) {
    return (req, res, next) => {
      const result = this.validateBody(req.params, schema);

      if (!result.valid) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          fields: result.errors
        });
      }

      // Replace params with sanitized data
      req.params = result.sanitized;
      next();
    };
  }

  /**
   * Common validation schemas
   */
  schemas = {
    login: {
      email: this.fieldRules.email,
      password: {
        required: true,
        type: 'string',
        minLength: 1 // Don't validate password format on login
      }
    },
    register: {
      email: this.fieldRules.email,
      password: this.fieldRules.password,
      firstName: this.fieldRules.firstName,
      lastName: this.fieldRules.lastName,
      role: this.fieldRules.role
    },
    updateProfile: {
      firstName: { ...this.fieldRules.firstName, required: false },
      lastName: { ...this.fieldRules.lastName, required: false },
      phone: this.fieldRules.phone,
      dateOfBirth: this.fieldRules.dateOfBirth
    },
    changePassword: {
      currentPassword: {
        required: true,
        type: 'string',
        minLength: 1
      },
      newPassword: this.fieldRules.password,
      confirmPassword: {
        required: true,
        type: 'string',
        custom: (value, { newPassword }) => {
          return value === newPassword ? null : 'Passwords do not match';
        }
      }
    },
    resetPassword: {
      email: this.fieldRules.email
    },
    pagination: {
      page: {
        required: false,
        type: 'numeric',
        min: 1,
        transform: (v) => parseInt(v) || 1
      },
      limit: {
        required: false,
        type: 'numeric',
        min: 1,
        max: 100,
        transform: (v) => parseInt(v) || 20
      },
      sort: {
        required: false,
        enum: ['asc', 'desc'],
        transform: 'toLowerCase'
      },
      sortBy: {
        required: false,
        type: 'alphanumeric'
      }
    },
    idParam: {
      id: {
        required: true,
        type: 'uuid'
      }
    }
  };

  /**
   * Prevent SQL injection in string values
   */
  preventSQLInjection(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove or escape dangerous SQL characters
    return value
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/;/g, '')    // Remove semicolons
      .replace(/--/g, '')   // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '') // Remove xp_ commands
      .replace(/sp_/gi, '') // Remove sp_ commands
      .replace(/exec/gi, '') // Remove exec commands
      .replace(/execute/gi, '') // Remove execute commands
      .replace(/drop/gi, '') // Remove drop commands
      .replace(/alter/gi, '') // Remove alter commands
      .replace(/create/gi, '') // Remove create commands
      .replace(/delete/gi, '') // Remove delete commands
      .replace(/insert/gi, '') // Remove insert commands
      .replace(/update/gi, '') // Remove update commands
      .replace(/union/gi, ''); // Remove union commands
  }

  /**
   * Validate file upload
   */
  validateFile(file, rules = {}) {
    const errors = [];

    // Check if file exists
    if (rules.required && !file) {
      errors.push('File is required');
      return errors;
    }

    if (!file) {
      return errors;
    }

    // Check file size
    const maxSize = rules.maxSize || 10 * 1024 * 1024; // 10MB default
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (rules.allowedTypes) {
      const fileType = file.mimetype || file.type;
      if (!rules.allowedTypes.includes(fileType)) {
        errors.push(`File type must be one of: ${rules.allowedTypes.join(', ')}`);
      }
    }

    // Check file extension
    if (rules.allowedExtensions) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!rules.allowedExtensions.includes(ext)) {
        errors.push(`File extension must be one of: ${rules.allowedExtensions.join(', ')}`);
      }
    }

    return errors;
  }
}

// Export singleton instance
module.exports = new InputValidator();
