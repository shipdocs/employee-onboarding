// config/features.js - Feature Toggle System

const { environmentConfig } = require('./environment');

/**
 * Feature Toggle System
 * 
 * Provides centralized feature flags that can be controlled
 * per environment and overridden via environment variables.
 * 
 * All feature flags follow the naming convention:
 * - Variable name: FEATURE_NAME_ENABLED
 * - Environment variable: FEATURE_NAME_ENABLED
 */

class FeatureToggleSystem {
  constructor() {
    this.features = this.initializeFeatures();
  }

  /**
   * Initialize all feature toggles with environment-specific defaults
   */
  initializeFeatures() {
    const env = environmentConfig.getEnvironment();
    const isDev = env === 'development';
    const isStaging = env === 'staging';
    const isProd = env === 'production';

    return {
      // Email System Features
      EMAIL_SENDING_ENABLED: {
        name: 'Email Sending',
        description: 'Controls whether emails are actually sent',
        defaultValue: isProd || (isStaging || isDev && process.env.EMAIL_SENDING_ENABLED === 'true'),
        envVar: 'EMAIL_SENDING_ENABLED',
        requiresRestart: false
      },

      // Quiz System Features
      QUIZ_SCORING_ENABLED: {
        name: 'Quiz Scoring',
        description: 'Controls real quiz scoring vs fake scoring for development',
        defaultValue: isProd || isStaging,
        envVar: 'QUIZ_SCORING_ENABLED',
        requiresRestart: false
      },

      // Certificate Features
      CERTIFICATE_GENERATION_ENABLED: {
        name: 'Certificate Generation',
        description: 'Controls whether certificates can be generated',
        defaultValue: isProd || isStaging,
        envVar: 'CERTIFICATE_GENERATION_ENABLED',
        requiresRestart: false
      },

      // Security Features
      RATE_LIMITING_ENABLED: {
        name: 'Rate Limiting',
        description: 'Controls API rate limiting',
        defaultValue: isProd || isStaging,
        envVar: 'RATE_LIMITING_ENABLED',
        requiresRestart: true
      },

      // Logging Features
      DEBUG_LOGGING_ENABLED: {
        name: 'Debug Logging',
        description: 'Controls verbose debug logging',
        defaultValue: isDev,
        envVar: 'DEBUG_LOGGING_ENABLED',
        requiresRestart: false
      },

      // Data Features
      TEST_DATA_ALLOWED: {
        name: 'Test Data',
        description: 'Allows creation and use of test data',
        defaultValue: isDev || isStaging,
        envVar: 'TEST_DATA_ALLOWED',
        requiresRestart: false
      },

      // Performance Features
      CACHING_ENABLED: {
        name: 'Caching',
        description: 'Controls response and query caching',
        defaultValue: isProd || isStaging,
        envVar: 'CACHING_ENABLED',
        requiresRestart: true
      },

      PERFORMANCE_MONITORING_ENABLED: {
        name: 'Performance Monitoring',
        description: 'Controls performance metrics collection',
        defaultValue: isProd || isStaging,
        envVar: 'PERFORMANCE_MONITORING_ENABLED',
        requiresRestart: true
      },

      // Authentication Features
      MAGIC_LINK_ENABLED: {
        name: 'Magic Link Authentication',
        description: 'Allows passwordless authentication via email',
        defaultValue: true,
        envVar: 'MAGIC_LINK_ENABLED',
        requiresRestart: false
      },

      SESSION_TIMEOUT_ENABLED: {
        name: 'Session Timeout',
        description: 'Controls automatic session expiration',
        defaultValue: isProd,
        envVar: 'SESSION_TIMEOUT_ENABLED',
        requiresRestart: false
      },

      // Development Features
      DEV_MODE_BAR_ENABLED: {
        name: 'Development Mode Bar',
        description: 'Shows development helper bar in UI',
        defaultValue: isDev,
        envVar: 'DEV_MODE_BAR_ENABLED',
        requiresRestart: false
      },

      HOT_RELOAD_ENABLED: {
        name: 'Hot Reload',
        description: 'Enables hot module replacement',
        defaultValue: isDev,
        envVar: 'HOT_RELOAD_ENABLED',
        requiresRestart: true
      },

      // API Features
      API_DOCUMENTATION_ENABLED: {
        name: 'API Documentation',
        description: 'Exposes API documentation endpoints',
        defaultValue: isDev || isStaging,
        envVar: 'API_DOCUMENTATION_ENABLED',
        requiresRestart: true
      },

      CORS_ENABLED: {
        name: 'CORS',
        description: 'Controls Cross-Origin Resource Sharing',
        defaultValue: true,
        envVar: 'CORS_ENABLED',
        requiresRestart: true
      },

      // Database Features
      DATABASE_MIGRATIONS_ENABLED: {
        name: 'Database Migrations',
        description: 'Allows automatic database migrations',
        defaultValue: isDev,
        envVar: 'DATABASE_MIGRATIONS_ENABLED',
        requiresRestart: true
      },

      DATABASE_SEEDING_ENABLED: {
        name: 'Database Seeding',
        description: 'Allows database seeding with test data',
        defaultValue: isDev,
        envVar: 'DATABASE_SEEDING_ENABLED',
        requiresRestart: false
      },

      // Error Handling Features
      ERROR_DETAILS_ENABLED: {
        name: 'Error Details',
        description: 'Shows detailed error messages',
        defaultValue: isDev,
        envVar: 'ERROR_DETAILS_ENABLED',
        requiresRestart: false
      },

      ERROR_REPORTING_ENABLED: {
        name: 'Error Reporting',
        description: 'Sends errors to external monitoring service',
        defaultValue: isProd,
        envVar: 'ERROR_REPORTING_ENABLED',
        requiresRestart: true
      },

      // Integration Features
      WEBHOOK_PROCESSING_ENABLED: {
        name: 'Webhook Processing',
        description: 'Processes incoming webhooks',
        defaultValue: isProd || isStaging,
        envVar: 'WEBHOOK_PROCESSING_ENABLED',
        requiresRestart: false
      },

      EXTERNAL_API_CALLS_ENABLED: {
        name: 'External API Calls',
        description: 'Allows calls to external APIs',
        defaultValue: true,
        envVar: 'EXTERNAL_API_CALLS_ENABLED',
        requiresRestart: false
      },

      // Security Features - MFA
      MFA_ENABLED: {
        name: 'Multi-Factor Authentication',
        description: 'Enables MFA setup and verification for users',
        defaultValue: true,
        envVar: 'MFA_ENABLED',
        requiresRestart: false
      },

      MFA_ENFORCEMENT: {
        name: 'MFA Enforcement',
        description: 'Requires MFA for privileged users (admin/manager)',
        defaultValue: isProd || isStaging,
        envVar: 'MFA_ENFORCEMENT',
        requiresRestart: false
      },

      MFA_BACKUP_CODES: {
        name: 'MFA Backup Codes',
        description: 'Enables backup codes for MFA recovery',
        defaultValue: true,
        envVar: 'MFA_BACKUP_CODES',
        requiresRestart: false
      },

      // UI Features
      DARK_MODE_ENABLED: {
        name: 'Dark Mode',
        description: 'Enables dark mode toggle for users',
        defaultValue: true,
        envVar: 'DARK_MODE_ENABLED',
        requiresRestart: false
      },

      MAINTENANCE_MODE_ENABLED: {
        name: 'Maintenance Mode',
        description: 'Shows maintenance page to users',
        defaultValue: false,
        envVar: 'MAINTENANCE_MODE_ENABLED',
        requiresRestart: false
      },

      BETA_FEATURES_ENABLED: {
        name: 'Beta Features',
        description: 'Enables experimental features',
        defaultValue: isDev || (isStaging && process.env.BETA_FEATURES_ENABLED === 'true'),
        envVar: 'BETA_FEATURES_ENABLED',
        requiresRestart: false
      }
    };
  }

  /**
   * Get the value of a feature toggle
   */
  isEnabled(featureName) {
    const feature = this.features[featureName];
    if (!feature) {
      console.warn(`Unknown feature toggle: ${featureName}`);
      return false;
    }

    // Check for environment variable override
    if (process.env[feature.envVar] !== undefined) {
      return process.env[feature.envVar] === 'true';
    }

    return feature.defaultValue;
  }

  /**
   * Get all feature states
   */
  getAllFeatures() {
    const result = {};
    for (const [key, feature] of Object.entries(this.features)) {
      result[key] = {
        enabled: this.isEnabled(key),
        name: feature.name,
        description: feature.description,
        source: process.env[feature.envVar] !== undefined ? 'environment' : 'default'
      };
    }
    return result;
  }

  /**
   * Get features that require restart when changed
   */
  getFeaturesRequiringRestart() {
    return Object.entries(this.features)
      .filter(([_, feature]) => feature.requiresRestart)
      .map(([key, feature]) => ({
        key,
        name: feature.name,
        enabled: this.isEnabled(key)
      }));
  }

  /**
   * Validate feature configuration
   */
  validateConfiguration() {
    const warnings = [];
    const env = environmentConfig.getEnvironment();

    // Production validations
    if (env === 'production') {
      if (this.isEnabled('TEST_DATA_ALLOWED')) {
        warnings.push('TEST_DATA_ALLOWED is enabled in production!');
      }
      if (this.isEnabled('DEBUG_LOGGING_ENABLED')) {
        warnings.push('DEBUG_LOGGING_ENABLED is enabled in production!');
      }
      if (this.isEnabled('ERROR_DETAILS_ENABLED')) {
        warnings.push('ERROR_DETAILS_ENABLED is enabled in production!');
      }
      if (!this.isEnabled('RATE_LIMITING_ENABLED')) {
        warnings.push('RATE_LIMITING_ENABLED is disabled in production!');
      }
    }

    // Development validations
    if (env === 'development') {
      if (this.isEnabled('ERROR_REPORTING_ENABLED')) {
        warnings.push('ERROR_REPORTING_ENABLED is enabled in development - this may send test errors to monitoring.');
      }
    }

    return warnings;
  }

  /**
   * Get a summary of enabled features by category
   */
  getFeatureSummary() {
    const categories = {
      email: ['EMAIL_SENDING_ENABLED'],
      quiz: ['QUIZ_SCORING_ENABLED'],
      certificate: ['CERTIFICATE_GENERATION_ENABLED'],
      security: ['RATE_LIMITING_ENABLED', 'SESSION_TIMEOUT_ENABLED', 'MFA_ENABLED', 'MFA_ENFORCEMENT', 'MFA_BACKUP_CODES'],
      logging: ['DEBUG_LOGGING_ENABLED', 'ERROR_DETAILS_ENABLED', 'ERROR_REPORTING_ENABLED'],
      data: ['TEST_DATA_ALLOWED', 'DATABASE_SEEDING_ENABLED'],
      performance: ['CACHING_ENABLED', 'PERFORMANCE_MONITORING_ENABLED'],
      development: ['DEV_MODE_BAR_ENABLED', 'HOT_RELOAD_ENABLED', 'API_DOCUMENTATION_ENABLED'],
      ui: ['DARK_MODE_ENABLED', 'MAINTENANCE_MODE_ENABLED', 'BETA_FEATURES_ENABLED']
    };

    const summary = {};
    for (const [category, features] of Object.entries(categories)) {
      summary[category] = features.reduce((acc, feature) => {
        acc[feature] = this.isEnabled(feature);
        return acc;
      }, {});
    }

    return summary;
  }
}

// Create singleton instance
const featureToggles = new FeatureToggleSystem();

// Validate configuration on startup
const warnings = featureToggles.validateConfiguration();
if (warnings.length > 0 && environmentConfig.isDevelopment()) {
  console.warn('⚠️  Feature configuration warnings:');
  warnings.forEach(warning => console.warn(`   - ${warning}`));
}

// Export the instance and convenience methods
module.exports = {
  featureToggles,
  isEnabled: (feature) => featureToggles.isEnabled(feature),
  getAllFeatures: () => featureToggles.getAllFeatures(),
  getFeatureSummary: () => featureToggles.getFeatureSummary(),
  
  // Export feature names as constants for easy reference
  FEATURES: Object.keys(featureToggles.features).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {})
};