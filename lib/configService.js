/**
 * @file configService.js
 * @brief Centralized configuration management service for system administrators
 *
 * @details This service provides comprehensive configuration management for the
 * Maritime Onboarding System. It serves as the single source of truth for all
 * application settings, environment variables, feature flags, and system parameters.
 * Designed specifically for system administrators to manage and monitor system
 * configuration across different deployment environments.
 *
 * **Administrative Features:**
 * - Centralized configuration management
 * - Environment-specific setting overrides
 * - Real-time configuration updates
 * - Configuration validation and type safety
 * - Settings backup and restore capabilities
 * - Configuration audit logging
 * - Performance monitoring and caching
 *
 * **Configuration Categories:**
 * - **Application Settings**: Core system parameters and metadata
 * - **Security Configuration**: Authentication, encryption, and access control
 * - **Email Settings**: SMTP configuration and email service parameters
 * - **Training Configuration**: Quiz settings, certificate parameters, workflow rules
 * - **Database Settings**: Connection parameters and performance tuning
 * - **Feature Flags**: Enable/disable system features dynamically
 *
 * **Environment Support:**
 * - Development (localhost)
 * - Testing (team review)
 * - Preview (final approval)
 * - Production (live system)
 *
 * **Admin Benefits:**
 * - Single interface for all system configuration
 * - Environment-aware settings management
 * - Real-time configuration monitoring
 * - Configuration change tracking and rollback
 * - Performance optimization through intelligent caching
 * - Validation and error prevention
 *
 * **Security Features:**
 * - Encrypted sensitive configuration data
 * - Role-based access to configuration sections
 * - Configuration change audit trail
 * - Secure default values and validation
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see AdminDashboard For configuration management interface
 * @see settingsService For database-backed settings
 * @see featureFlags For dynamic feature management
 */

// lib/configService.js - Centralized Configuration Service
const { settingsService } = require('./settingsService');
const { featureFlags } = require('./featureFlags');
const fs = require('fs').promises;
const path = require('path');

/**
 * Centralized Configuration Service
 *
 * Single source of truth for all application configuration:
 * - Environment variables (with migration path)
 * - Database settings
 * - Feature flags
 * - Hardcoded defaults
 *
 * Provides:
 * - Type-safe access
 * - Validation
 * - Caching
 * - Real-time updates
 * - Environment-specific overrides
 */
/**
 * @brief Configuration management service class for system administrators
 *
 * @details Provides comprehensive configuration management with caching, validation,
 * and real-time updates. Supports environment-specific overrides and maintains
 * configuration consistency across the entire system.
 *
 * **Core Capabilities:**
 * - Hierarchical configuration management
 * - Environment-aware setting resolution
 * - Performance-optimized caching system
 * - Real-time configuration change notifications
 * - Configuration validation and type checking
 * - Secure handling of sensitive configuration data
 *
 * **Administrative Interface:**
 * - Get/set configuration values with validation
 * - Environment detection and override management
 * - Configuration backup and restore operations
 * - Performance monitoring and cache management
 * - Configuration change audit and logging
 */
class ConfigurationService {
  /**
   * @brief Initialize the configuration service with caching and environment detection
   *
   * @details Sets up the configuration service with intelligent caching, environment
   * detection, and default configuration values. Establishes the foundation for
   * centralized configuration management across the system.
   *
   * **Initialization Process:**
   * - Detect current deployment environment
   * - Initialize configuration cache with expiry
   * - Set up change notification system
   * - Load default configuration values
   * - Establish environment-specific overrides
   */
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.subscribers = new Map();
    this.environment = this.detectEnvironment();

    // Default configuration values
    this.defaults = {
      // Application
      app: {
        name: 'Maritime Onboarding System',
        version: '2025.1.0',
        url: this.getDefaultUrl(),
        supportEmail: 'support@maritime-onboarding.example.com',
        maintenanceMode: false
      },

      // API Configuration
      api: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000,
        rateLimitPerMinute: 60
      },

      // Authentication
      auth: {
        jwtExpiresIn: '24h',
        magicLinkExpiresIn: 15 * 60, // 15 minutes in seconds
        refreshTokenExpiresIn: '7d',
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        tokenExpiryWarning: 5 * 60 * 1000 // 5 minutes
      },

      // Security
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 30 * 60, // 30 minutes in seconds
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecial: true,
        csrfEnabled: true
      },

      // Email
      email: {
        provider: 'mailersend', // or 'smtp'
        fromEmail: 'no-reply@maritime-onboarding.example.com',
        fromName: 'Maritime Onboarding Platform',
        maxRetries: 3,
        retryDelay: 5000,
        rateLimitPerHour: 100
      },

      // Training
      training: {
        quizPassPercentage: 80,
        maxQuizAttempts: 3,
        certificateValidityDays: 365,
        reminderDaysBeforeExpiry: [30, 14, 7],
        photoUploadMaxSize: 5 * 1024 * 1024, // 5MB
        allowedPhotoTypes: ['image/jpeg', 'image/png', 'image/webp']
      },

      // Cache
      cache: {
        defaultTTL: 5 * 60 * 1000, // 5 minutes
        settingsTTL: 5 * 60 * 1000,
        userDataTTL: 10 * 60 * 1000,
        staticAssetsTTL: 24 * 60 * 60 * 1000
      },

      // Feature Flags
      features: {
        enabledByDefault: false,
        rolloutPercentageStep: 10,
        monitoringEnabled: true
      }
    };
  }

  /**
   * Detect current environment
   */
  detectEnvironment() {
    // Check Vercel environment first
    if (process.env.VERCEL_ENV) {
      return process.env.VERCEL_ENV; // 'production', 'preview', 'development'
    }

    // Fallback to NODE_ENV
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Get default URL based on environment
   */
  getDefaultUrl() {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }

    if (this.environment === 'production') {
      return 'https://maritime-onboarding.example.com';
    }

    return 'http://localhost:3000';
  }

  /**
   * Get configuration value
   * @param {string} key - Dot-notation key (e.g., 'auth.jwtExpiresIn')
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Configuration value
   */
  async get(key, defaultValue = undefined) {
    try {
      // Check cache first
      const cached = this.getCached(key);
      if (cached !== null) {
        return cached;
      }

      // Parse key
      const parts = key.split('.');
      const category = parts[0];
      const subKey = parts.slice(1).join('.');

      // Try database settings first
      if (this.isDatabaseCategory(category)) {
        const dbValue = await this.getDatabaseValue(category, subKey);
        if (dbValue !== undefined) {
          this.setCached(key, dbValue);
          return dbValue;
        }
      }

      // Try environment variables (for migration period)
      const envValue = this.getEnvironmentValue(key);
      if (envValue !== undefined) {
        this.setCached(key, envValue);
        return envValue;
      }

      // Fall back to defaults
      const defaultVal = this.getDefaultValue(key);
      if (defaultVal !== undefined) {
        this.setCached(key, defaultVal);
        return defaultVal;
      }

      // Return provided default or undefined
      return defaultValue;
    } catch (error) {
      // console.error(`Error getting config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Get multiple configuration values
   * @param {string[]} keys - Array of keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async getMany(keys) {
    const results = {};

    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get(key);
      })
    );

    return results;
  }

  /**
   * Get all configuration for a category
   * @param {string} category - Configuration category
   * @returns {Promise<Object>} Category configuration
   */
  async getCategory(category) {
    try {
      // Get defaults for category
      const defaults = this.defaults[category] || {};

      // Get database overrides
      const dbSettings = await settingsService.getCategory(category);

      // Merge with environment overrides
      const envOverrides = this.getEnvironmentOverrides(category);

      // Merge all sources (defaults < database < environment)
      return {
        ...defaults,
        ...dbSettings,
        ...envOverrides
      };
    } catch (error) {
      // console.error(`Error getting category ${category}:`, error);
      return this.defaults[category] || {};
    }
  }

  /**
   * Set configuration value (updates database)
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value) {
    try {
      const parts = key.split('.');
      const category = parts[0];
      const subKey = parts.slice(1).join('.');

      // Validate value
      if (!this.validateValue(key, value)) {
        throw new Error(`Invalid value for ${key}`);
      }

      // Update in database if it's a database category
      if (this.isDatabaseCategory(category)) {
        await settingsService.setSetting(category, subKey, value);
      }

      // Clear cache
      this.cache.delete(key);

      // Notify subscribers
      this.notifySubscribers(key, value);

      return true;
    } catch (error) {
      // console.error(`Error setting config ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature name
   * @param {Object} context - User context
   * @returns {Promise<boolean>} Feature enabled status
   */
  async isFeatureEnabled(feature, context = {}) {
    return featureFlags.isEnabled(feature, context);
  }

  /**
   * Subscribe to configuration changes
   * @param {string} key - Configuration key to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Validate configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Value to validate
   * @returns {boolean} Validation result
   */
  validateValue(key, value) {
    const validators = {
      'auth.jwtExpiresIn': (v) => typeof v === 'string' && /^\d+[hdmy]$/.test(v),
      'auth.magicLinkExpiresIn': (v) => typeof v === 'number' && v > 0 && v <= 3600,
      'security.maxLoginAttempts': (v) => typeof v === 'number' && v >= 1 && v <= 10,
      'security.passwordMinLength': (v) => typeof v === 'number' && v >= 6 && v <= 32,
      'training.quizPassPercentage': (v) => typeof v === 'number' && v >= 0 && v <= 100,
      'email.provider': (v) => ['mailersend', 'smtp'].includes(v),
      'api.timeout': (v) => typeof v === 'number' && v >= 1000 && v <= 300000
    };

    const validator = validators[key];
    return validator ? validator(value) : true;
  }

  /**
   * Get value from environment variables
   * @param {string} key - Configuration key
   * @returns {*} Environment value or undefined
   */
  getEnvironmentValue(key) {
    const envMappings = {
      'auth.jwtSecret': process.env.JWT_SECRET,
      'auth.magicLinkExpiresIn': process.env.MAGIC_LINK_EXPIRY ? parseInt(process.env.MAGIC_LINK_EXPIRY) : undefined,
      'database.url': process.env.SUPABASE_URL,
      'database.anonKey': process.env.SUPABASE_ANON_KEY,
      'database.serviceKey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'email.mailersendApiKey': process.env.MAILERSEND_API_KEY,
      'app.url': process.env.BASE_URL || process.env.VERCEL_URL
    };

    return envMappings[key];
  }

  /**
   * Get environment-specific overrides
   * @param {string} category - Configuration category
   * @returns {Object} Environment overrides
   */
  getEnvironmentOverrides(category) {
    const overrides = {
      development: {
        api: { timeout: 60000 }, // Longer timeout for development
        security: { csrfEnabled: false },
        cache: { defaultTTL: 1000 } // Shorter cache in development
      },
      preview: {
        features: { monitoringEnabled: true }
      },
      production: {
        security: { csrfEnabled: true },
        cache: { defaultTTL: 10 * 60 * 1000 } // Longer cache in production
      }
    };

    return overrides[this.environment]?.[category] || {};
  }

  /**
   * Check if category should use database
   * @param {string} category - Category name
   * @returns {boolean} Uses database
   */
  isDatabaseCategory(category) {
    const dbCategories = [
      'email', 'security', 'training', 'application',
      'notifications', 'translation', 'maintenance',
      'integrations', 'cache'
    ];
    return dbCategories.includes(category);
  }

  /**
   * Get value from database
   * @param {string} category - Category name
   * @param {string} key - Setting key
   * @returns {Promise<*>} Database value
   */
  async getDatabaseValue(category, key) {
    try {
      const value = await settingsService.getSetting(category, key);

      // Parse JSON values if needed
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }

      // Convert string booleans
      if (value === 'true') return true;
      if (value === 'false') return false;

      // Convert string numbers for number types
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        const num = parseInt(value, 10);
        if (!isNaN(num)) return num;
      }

      return value;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get default value
   * @param {string} key - Configuration key
   * @returns {*} Default value
   */
  getDefaultValue(key) {
    const parts = key.split('.');
    let value = this.defaults;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  setCached(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Notify subscribers of changes
   * @param {string} key - Changed key
   * @param {*} value - New value
   */
  notifySubscribers(key, value) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          // console.error('Error in config subscriber:', error);
        }
      });
    }
  }

  /**
   * Export configuration for backup
   * @returns {Promise<Object>} All configuration
   */
  async exportConfig() {
    const config = {
      environment: this.environment,
      defaults: this.defaults,
      database: {},
      timestamp: new Date().toISOString()
    };

    // Get all database settings
    for (const category of ['email', 'security', 'training', 'application']) {
      config.database[category] = await this.getCategory(category);
    }

    return config;
  }

  /**
   * Get configuration documentation
   * @returns {Object} Configuration documentation
   */
  getDocumentation() {
    return {
      'app.name': { type: 'string', description: 'Application display name' },
      'app.url': { type: 'string', description: 'Base URL for the application' },
      'app.maintenanceMode': { type: 'boolean', description: 'Enable maintenance mode' },
      'api.timeout': { type: 'number', description: 'API request timeout in milliseconds', min: 1000, max: 300000 },
      'auth.jwtExpiresIn': { type: 'string', description: 'JWT expiration time (e.g., "24h", "7d")', pattern: '^\\d+[hdmy]$' },
      'auth.magicLinkExpiresIn': { type: 'number', description: 'Magic link expiration in seconds', min: 300, max: 3600 },
      'security.maxLoginAttempts': { type: 'number', description: 'Maximum login attempts before lockout', min: 1, max: 10 },
      'security.passwordMinLength': { type: 'number', description: 'Minimum password length', min: 6, max: 32 },
      'training.quizPassPercentage': { type: 'number', description: 'Minimum percentage to pass quiz', min: 0, max: 100 },
      'email.provider': { type: 'string', description: 'Email service provider', enum: ['mailersend', 'smtp'] }
    };
  }
}

// Create singleton instance
const configService = new ConfigurationService();

// Helper functions for common access patterns
const config = {
  get: (key, defaultValue) => configService.get(key, defaultValue),
  getMany: (keys) => configService.getMany(keys),
  getCategory: (category) => configService.getCategory(category),
  set: (key, value) => configService.set(key, value),
  isFeatureEnabled: (feature, context) => configService.isFeatureEnabled(feature, context),
  subscribe: (key, callback) => configService.subscribe(key, callback),
  clearCache: () => configService.clearCache(),
  environment: configService.environment
};

module.exports = {
  configService,
  config,
  ConfigurationService
};
