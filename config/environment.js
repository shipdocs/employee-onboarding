// config/environment.js - Comprehensive Environment Detection and Configuration

/**
 * Environment Configuration System
 * 
 * This module provides a centralized way to detect and configure
 * the application's environment (development, staging, production).
 * 
 * Environment detection is based on (in order of precedence):
 * 1. ENVIRONMENT variable
 * 2. NODE_ENV variable
 * 3. Domain/URL patterns
 * 4. Presence of certain environment variables
 * 5. Default to 'development'
 */

class EnvironmentConfiguration {
  constructor() {
    this.environment = null;
    this.config = null;
    this.detectEnvironment();
    this.loadConfiguration();
  }

  /**
   * Detect the current environment using multiple strategies
   */
  detectEnvironment() {
    // Strategy 1: Check ENVIRONMENT variable (highest priority)
    if (process.env.ENVIRONMENT) {
      this.environment = process.env.ENVIRONMENT.toLowerCase();
      return;
    }

    // Strategy 2: Check NODE_ENV variable
    if (process.env.NODE_ENV) {
      // Map NODE_ENV values to our environment names
      const nodeEnvMap = {
        'production': 'production',
        'prod': 'production',
        'development': 'development',
        'dev': 'development',
        'staging': 'staging',
        'test': 'development' // Test environments use development config
      };
      this.environment = nodeEnvMap[process.env.NODE_ENV.toLowerCase()] || 'development';
      return;
    }

    // Strategy 3: Check domain/URL patterns
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        this.environment = 'development';
        return;
      }
      if (hostname.includes('staging') || hostname.includes('stage')) {
        this.environment = 'staging';
        return;
      }
      if (hostname.includes('.vercel.app') && !hostname.includes('staging')) {
        this.environment = 'production';
        return;
      }
    }

    // Strategy 4: Check Vercel environment variables
    if (process.env.VERCEL_ENV) {
      const vercelEnvMap = {
        'production': 'production',
        'preview': 'staging',
        'development': 'development'
      };
      this.environment = vercelEnvMap[process.env.VERCEL_ENV] || 'development';
      return;
    }

    // Strategy 5: Check for production-specific environment variables
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('localhost')) {
      // If we have a real Supabase URL, assume at least staging
      if (process.env.EMAIL_SERVICE_PROVIDER === 'mailersend') {
        // Production typically uses MailerSend
        this.environment = 'production';
        return;
      }
      this.environment = 'staging';
      return;
    }

    // Default to development
    this.environment = 'development';
  }

  /**
   * Load configuration based on detected environment
   */
  loadConfiguration() {
    const baseConfig = {
      environment: this.environment,
      isDevelopment: this.environment === 'development',
      isStaging: this.environment === 'staging',
      isProduction: this.environment === 'production',
      
      // Logging configuration
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableRemote: false
      },
      
      // Email configuration
      email: {
        enabled: false,
        provider: 'smtp',
        whitelist: [],
        testMode: false
      },
      
      // Security configuration
      security: {
        rateLimiting: true,
        rateLimitProvider: 'memory',
        requireHttps: false,
        csrfProtection: true,
        corsEnabled: true
      },
      
      // Performance configuration
      performance: {
        caching: true,
        cacheTTL: 300, // 5 minutes
        compression: true,
        monitoring: false
      },
      
      // Data configuration
      data: {
        testDataAllowed: false,
        seedingEnabled: false,
        mockingEnabled: false
      }
    };

    // Environment-specific overrides
    switch (this.environment) {
      case 'development':
        this.config = {
          ...baseConfig,
          logging: {
            ...baseConfig.logging,
            level: 'debug',
            enableConsole: true
          },
          email: {
            ...baseConfig.email,
            enabled: process.env.EMAIL_SENDING_ENABLED === 'true',
            testMode: true
          },
          security: {
            ...baseConfig.security,
            rateLimitProvider: 'memory',
            requireHttps: false
          },
          performance: {
            ...baseConfig.performance,
            caching: false,
            monitoring: false
          },
          data: {
            ...baseConfig.data,
            testDataAllowed: true,
            seedingEnabled: true,
            mockingEnabled: true
          }
        };
        break;

      case 'staging':
        this.config = {
          ...baseConfig,
          logging: {
            ...baseConfig.logging,
            level: 'info',
            enableConsole: true,
            enableFile: true
          },
          email: {
            ...baseConfig.email,
            enabled: true,
            whitelist: this.parseEmailWhitelist(process.env.EMAIL_WHITELIST),
            testMode: false
          },
          security: {
            ...baseConfig.security,
            rateLimitProvider: 'memory',
            requireHttps: true
          },
          performance: {
            ...baseConfig.performance,
            caching: true,
            monitoring: true
          },
          data: {
            ...baseConfig.data,
            testDataAllowed: true,
            seedingEnabled: false,
            mockingEnabled: false
          }
        };
        break;

      case 'production':
        this.config = {
          ...baseConfig,
          logging: {
            ...baseConfig.logging,
            level: 'warn',
            enableConsole: false,
            enableFile: true,
            enableRemote: true
          },
          email: {
            ...baseConfig.email,
            enabled: true,
            provider: process.env.EMAIL_SERVICE_PROVIDER || 'mailersend',
            testMode: false
          },
          security: {
            ...baseConfig.security,
            rateLimitProvider: process.env.REDIS_URL ? 'redis' : 'memory',
            requireHttps: true
          },
          performance: {
            ...baseConfig.performance,
            caching: true,
            cacheTTL: 3600, // 1 hour
            monitoring: true
          },
          data: {
            ...baseConfig.data,
            testDataAllowed: false,
            seedingEnabled: false,
            mockingEnabled: false
          }
        };
        break;
    }

    // Apply any environment variable overrides
    this.applyEnvironmentOverrides();
  }

  /**
   * Parse email whitelist from environment variable
   */
  parseEmailWhitelist(whitelist) {
    if (!whitelist) return [];
    return whitelist.split(',').map(domain => domain.trim().toLowerCase());
  }

  /**
   * Apply specific environment variable overrides
   */
  applyEnvironmentOverrides() {
    // Override email settings
    if (process.env.EMAIL_SENDING_ENABLED !== undefined) {
      this.config.email.enabled = process.env.EMAIL_SENDING_ENABLED === 'true';
    }
    
    // Override logging level
    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL.toLowerCase();
    }
    
    // Override rate limiting
    if (process.env.RATE_LIMITING_ENABLED !== undefined) {
      this.config.security.rateLimiting = process.env.RATE_LIMITING_ENABLED === 'true';
    }
    
    // Override caching
    if (process.env.CACHING_ENABLED !== undefined) {
      this.config.performance.caching = process.env.CACHING_ENABLED === 'true';
    }
    
    // Override test data
    if (process.env.TEST_DATA_ALLOWED !== undefined) {
      this.config.data.testDataAllowed = process.env.TEST_DATA_ALLOWED === 'true';
    }
  }

  /**
   * Get the current environment
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Get the full configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get a specific configuration value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Check if in development environment
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Check if in staging environment
   */
  isStaging() {
    return this.environment === 'staging';
  }

  /**
   * Check if in production environment
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Get a human-readable summary of the configuration
   */
  getSummary() {
    return {
      environment: this.environment,
      features: {
        emailSending: this.config.email.enabled,
        rateLimiting: this.config.security.rateLimiting,
        caching: this.config.performance.caching,
        testData: this.config.data.testDataAllowed,
        monitoring: this.config.performance.monitoring
      },
      security: {
        httpsRequired: this.config.security.requireHttps,
        corsEnabled: this.config.security.corsEnabled,
        csrfProtection: this.config.security.csrfProtection
      }
    };
  }
}

// Create singleton instance
const environmentConfig = new EnvironmentConfiguration();

// Export both the instance and the class
module.exports = {
  environmentConfig,
  EnvironmentConfiguration,
  
  // Convenience exports
  environment: environmentConfig.getEnvironment(),
  config: environmentConfig.getConfig(),
  isDevelopment: environmentConfig.isDevelopment(),
  isStaging: environmentConfig.isStaging(),
  isProduction: environmentConfig.isProduction()
};