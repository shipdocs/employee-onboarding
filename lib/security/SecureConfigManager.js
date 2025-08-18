/**
 * Secure Configuration Manager
 * Provides centralized, validated, and secure access to environment variables
 */

const crypto = require('crypto');

class SecureConfigManager {
  constructor() {
    this.config = new Map();
    this.schema = this.defineSchema();
    this.initialized = false;
    this.validationErrors = [];
    this.sensitiveKeys = new Set([
      'JWT_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY',
      'MAILERSEND_API_KEY',
      'MFA_ENCRYPTION_KEY',
      'API_KEY_ENCRYPTION_SECRET',
      'CRON_SECRET',
      'PAGERDUTY_WEBHOOK_SECRET',
      'SMTP_PASS',
      'REDIS_URL'
    ]);
  }

  /**
   * Define configuration schema with validation rules
   */
  defineSchema() {
    return {
      // Authentication & Security
      JWT_SECRET: {
        required: true,
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret',
        sensitive: true
      },
      MFA_ENCRYPTION_KEY: {
        required: false,
        type: 'string',
        minLength: 32,
        description: 'MFA encryption key',
        sensitive: true,
        default: null
      },
      API_KEY_ENCRYPTION_SECRET: {
        required: false,
        type: 'string',
        minLength: 32,
        description: 'API key encryption secret',
        sensitive: true,
        fallback: 'JWT_SECRET'
      },
      CRON_SECRET: {
        required: false,
        type: 'string',
        minLength: 16,
        description: 'Cron job authentication secret',
        sensitive: true
      },

      // Database Configuration
      SUPABASE_URL: {
        required: true,
        type: 'url',
        description: 'Supabase project URL',
        validate: (value) => value.includes('supabase.co') || value.includes('localhost')
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        required: false,
        type: 'url',
        description: 'Public Supabase URL',
        fallback: 'SUPABASE_URL'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        required: true,
        type: 'string',
        minLength: 100,
        description: 'Supabase service role key',
        sensitive: true
      },
      SUPABASE_ANON_KEY: {
        required: false,
        type: 'string',
        minLength: 100,
        description: 'Supabase anonymous key',
        fallback: 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        required: false,
        type: 'string',
        minLength: 100,
        description: 'Public Supabase anonymous key'
      },

      // Email Configuration
      MAILERSEND_API_KEY: {
        required: true,
        type: 'string',
        minLength: 20,
        description: 'MailerSend API key',
        sensitive: true,
        validate: (value) => value.startsWith('mlsn.')
      },
      SMTP_PASS: {
        required: false,
        type: 'string',
        description: 'SMTP password',
        sensitive: true
      },
      HR_EMAIL: {
        required: false,
        type: 'email',
        description: 'HR notification email',
        default: 'hr@shipdocs.app'
      },

      // Application Configuration
      BASE_URL: {
        required: false,
        type: 'url',
        description: 'Base application URL',
        fallback: 'VERCEL_URL'
      },
      VERCEL_URL: {
        required: false,
        type: 'string',
        description: 'Vercel deployment URL'
      },
      NODE_ENV: {
        required: false,
        type: 'enum',
        values: ['development', 'test', 'production'],
        description: 'Node environment',
        default: 'development'
      },
      VERCEL_ENV: {
        required: false,
        type: 'enum',
        values: ['development', 'preview', 'production'],
        description: 'Vercel environment'
      },

      // Feature Flags
      DEBUG_ENDPOINT_ENABLED: {
        required: false,
        type: 'boolean',
        description: 'Enable debug endpoints',
        default: false
      },
      CSP_REPORT_ONLY: {
        required: false,
        type: 'boolean',
        description: 'CSP report-only mode',
        default: false
      },
      EMAIL_CLEANUP_ENABLED: {
        required: false,
        type: 'boolean',
        description: 'Enable email cleanup',
        default: true
      },
      EMAIL_CLEANUP_DRY_RUN: {
        required: false,
        type: 'boolean',
        description: 'Email cleanup dry run mode',
        default: false
      },
      ENFORCE_VERCEL_IPS: {
        required: false,
        type: 'boolean',
        description: 'Enforce Vercel IP restrictions',
        default: false
      },
      ALLOW_PRODUCTION_CHANGES: {
        required: false,
        type: 'boolean',
        description: 'Allow production database changes',
        default: false
      },

      // Numeric Configuration
      EMAIL_CLEANUP_BATCH_SIZE: {
        required: false,
        type: 'number',
        min: 100,
        max: 10000,
        description: 'Email cleanup batch size',
        default: 1000
      },
      EMAIL_CLEANUP_MAX_BATCHES: {
        required: false,
        type: 'number',
        min: 1,
        max: 100,
        description: 'Email cleanup max batches',
        default: 10
      },
      EMAIL_CLEANUP_INTERVAL_HOURS: {
        required: false,
        type: 'number',
        min: 1,
        max: 168,
        description: 'Email cleanup interval in hours',
        default: 24
      },
      MAGIC_LINK_EXPIRY: {
        required: false,
        type: 'number',
        min: 300,
        max: 86400,
        description: 'Magic link expiry in seconds',
        default: 3600
      },

      // External Services
      PAGERDUTY_WEBHOOK_SECRET: {
        required: false,
        type: 'string',
        minLength: 16,
        description: 'PagerDuty webhook secret',
        sensitive: true
      },
      VERCEL_ACCESS_TOKEN: {
        required: false,
        type: 'string',
        minLength: 20,
        description: 'Vercel API access token',
        sensitive: true
      },
      VERCEL_PROJECT_ID: {
        required: false,
        type: 'string',
        description: 'Vercel project ID'
      },
      VERCEL_TEAM_ID: {
        required: false,
        type: 'string',
        description: 'Vercel team ID'
      },
      REDIS_URL: {
        required: false,
        type: 'url',
        description: 'Redis connection URL',
        sensitive: true
      },

      // Reporting & Monitoring
      CSP_REPORT_URI: {
        required: false,
        type: 'url',
        description: 'CSP violation report URI'
      },

      // MFA Configuration
      MFA_ISSUER: {
        required: false,
        type: 'string',
        description: 'MFA issuer name',
        default: 'Burando Maritime Services'
      },
      MFA_SERVICE_NAME: {
        required: false,
        type: 'string',
        description: 'MFA service name',
        default: 'Maritime Onboarding'
      }
    };
  }

  /**
   * Initialize configuration with validation
   */
  async initialize() {
    if (this.initialized) {
      return { success: true };
    }

    try {
      this.validationErrors = [];
      
      // Load and validate all configuration
      for (const [key, schema] of Object.entries(this.schema)) {
        const result = this.loadAndValidateConfig(key, schema);
        if (!result.valid) {
          this.validationErrors.push({
            key,
            error: result.error,
            required: schema.required
          });
        } else {
          this.config.set(key, result.value);
        }
      }

      // Check for critical errors
      const criticalErrors = this.validationErrors.filter(e => e.required);
      if (criticalErrors.length > 0) {
        const errorMessage = criticalErrors
          .map(e => `${e.key}: ${e.error}`)
          .join(', ');
        
        throw new Error(`Critical configuration errors: ${errorMessage}`);
      }

      this.initialized = true;
      this.logInitialization();
      
      return { 
        success: true, 
        warnings: this.validationErrors.filter(e => !e.required)
      };
    } catch (error) {
      console.error('🔧 [CONFIG] Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load and validate a single configuration value
   */
  loadAndValidateConfig(key, schema) {
    let value = process.env[key];

    // Handle fallback
    if (!value && schema.fallback) {
      value = process.env[schema.fallback];
    }

    // Handle default
    if (!value && schema.default !== undefined) {
      value = schema.default;
    }

    // Check required
    if (schema.required && !value) {
      return { valid: false, error: 'Required configuration missing' };
    }

    // Skip validation if no value and not required
    if (!value && !schema.required) {
      return { valid: true, value: null };
    }

    // Type validation and transformation
    const typeResult = this.validateType(value, schema);
    if (!typeResult.valid) {
      return typeResult;
    }

    value = typeResult.value;

    // Custom validation
    if (schema.validate && typeof schema.validate === 'function') {
      try {
        const customValid = schema.validate(value);
        if (!customValid) {
          return { valid: false, error: 'Custom validation failed' };
        }
      } catch (error) {
        return { valid: false, error: `Custom validation error: ${error.message}` };
      }
    }

    return { valid: true, value };
  }

  /**
   * Validate and transform value based on type
   */
  validateType(value, schema) {
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        if (schema.minLength && value.length < schema.minLength) {
          return { valid: false, error: `Must be at least ${schema.minLength} characters` };
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          return { valid: false, error: `Must not exceed ${schema.maxLength} characters` };
        }
        return { valid: true, value };

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return { valid: false, error: 'Must be a valid number' };
        }
        if (schema.min !== undefined && num < schema.min) {
          return { valid: false, error: `Must be at least ${schema.min}` };
        }
        if (schema.max !== undefined && num > schema.max) {
          return { valid: false, error: `Must not exceed ${schema.max}` };
        }
        return { valid: true, value: num };

      case 'boolean':
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
        return { valid: false, error: 'Must be a boolean value (true/false)' };

      case 'url':
        try {
          // Handle relative URLs for Vercel
          if (value.startsWith('//')) {
            value = 'https:' + value;
          } else if (!value.startsWith('http')) {
            value = 'https://' + value;
          }
          new URL(value);
          return { valid: true, value };
        } catch {
          return { valid: false, error: 'Must be a valid URL' };
        }

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Must be a valid email address' };
        }
        return { valid: true, value: value.toLowerCase() };

      case 'enum':
        if (!schema.values || !schema.values.includes(value)) {
          return { 
            valid: false, 
            error: `Must be one of: ${schema.values?.join(', ') || 'undefined values'}` 
          };
        }
        return { valid: true, value };

      default:
        return { valid: true, value };
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    if (!this.initialized) {
      console.warn(`🔧 [CONFIG] Accessing ${key} before initialization`);
      // Fallback to direct process.env access with warning
      return process.env[key] || defaultValue;
    }

    if (this.config.has(key)) {
      return this.config.get(key);
    }

    return defaultValue;
  }

  /**
   * Get configuration value with type safety
   */
  getString(key, defaultValue = '') {
    const value = this.get(key, defaultValue);
    return typeof value === 'string' ? value : String(value || defaultValue);
  }

  getNumber(key, defaultValue = 0) {
    const value = this.get(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  getBoolean(key, defaultValue = false) {
    const value = this.get(key, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(lower);
    }
    return defaultValue;
  }

  getUrl(key, defaultValue = null) {
    const value = this.get(key, defaultValue);
    if (!value) return defaultValue;
    
    try {
      // Handle Vercel URLs
      if (typeof value === 'string' && !value.startsWith('http')) {
        return `https://${value}`;
      }
      return value;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Check if configuration is valid
   */
  isValid() {
    return this.initialized && this.validationErrors.filter(e => e.required).length === 0;
  }

  /**
   * Get validation errors
   */
  getValidationErrors() {
    return this.validationErrors;
  }

  /**
   * Get masked configuration for logging
   */
  getMaskedConfig() {
    const masked = {};
    
    for (const [key, value] of this.config.entries()) {
      if (this.sensitiveKeys.has(key)) {
        masked[key] = this.maskSensitiveValue(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  /**
   * Mask sensitive values for logging
   */
  maskSensitiveValue(value) {
    if (!value || typeof value !== 'string') {
      return '[EMPTY]';
    }
    
    if (value.length <= 8) {
      return '[MASKED]';
    }
    
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  /**
   * Get environment information
   */
  getEnvironment() {
    return {
      node: this.get('NODE_ENV', 'development'),
      vercel: this.get('VERCEL_ENV'),
      isDevelopment: this.get('NODE_ENV') === 'development',
      isProduction: this.get('NODE_ENV') === 'production' || this.get('VERCEL_ENV') === 'production',
      isTest: this.get('NODE_ENV') === 'test'
    };
  }

  /**
   * Validate runtime configuration
   */
  validateRuntime() {
    const errors = [];
    const env = this.getEnvironment();

    // Production-specific validations
    if (env.isProduction) {
      const requiredInProduction = [
        'JWT_SECRET',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'MAILERSEND_API_KEY'
      ];

      for (const key of requiredInProduction) {
        const value = this.get(key);
        if (!value) {
          errors.push(`${key} is required in production`);
        }
      }

      // Check for development defaults in production
      const jwtSecret = this.get('JWT_SECRET');
      if (jwtSecret && (jwtSecret.includes('dev') || jwtSecret.length < 32)) {
        errors.push('JWT_SECRET appears to be a development value');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Log initialization status
   */
  logInitialization() {
    const env = this.getEnvironment();
    const configCount = this.config.size;
    const warningCount = this.validationErrors.filter(e => !e.required).length;

    console.log(`🔧 [CONFIG] Initialized successfully`);
    console.log(`🔧 [CONFIG] Environment: ${env.node}${env.vercel ? ` (${env.vercel})` : ''}`);
    console.log(`🔧 [CONFIG] Loaded ${configCount} configuration values`);
    
    if (warningCount > 0) {
      console.warn(`🔧 [CONFIG] ${warningCount} non-critical warnings`);
      this.validationErrors
        .filter(e => !e.required)
        .forEach(e => console.warn(`🔧 [CONFIG] Warning: ${e.key} - ${e.error}`));
    }
  }

  /**
   * Create configuration health check
   */
  healthCheck() {
    const env = this.getEnvironment();
    const runtimeValidation = this.validateRuntime();
    
    return {
      status: this.isValid() && runtimeValidation.valid ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      environment: env,
      configCount: this.config.size,
      validationErrors: this.validationErrors,
      runtimeErrors: runtimeValidation.errors,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const configManager = new SecureConfigManager();

module.exports = configManager;