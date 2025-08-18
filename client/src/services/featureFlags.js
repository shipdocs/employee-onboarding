// Client-side feature flag service
// This service provides feature flag checking for the React application

class ClientFeatureFlags {
  constructor() {
    this.features = this.initializeFeatures();
  }

  initializeFeatures() {
    const isDev = process.env.NODE_ENV === 'development';
    const isStaging = process.env.REACT_APP_ENVIRONMENT === 'staging';
    const isProd = process.env.NODE_ENV === 'production';

    return {
      // Security Features - MFA
      MFA_ENABLED: {
        name: 'Multi-Factor Authentication',
        description: 'Enables MFA setup and verification for users',
        defaultValue: true,
        envVar: 'REACT_APP_MFA_ENABLED'
      },

      MFA_ENFORCEMENT: {
        name: 'MFA Enforcement',
        description: 'Requires MFA for privileged users (admin/manager)',
        defaultValue: isProd || isStaging,
        envVar: 'REACT_APP_MFA_ENFORCEMENT'
      },

      MFA_BACKUP_CODES: {
        name: 'MFA Backup Codes',
        description: 'Enables backup codes for MFA recovery',
        defaultValue: true,
        envVar: 'REACT_APP_MFA_BACKUP_CODES'
      },

      // UI Features
      DARK_MODE_ENABLED: {
        name: 'Dark Mode',
        description: 'Enables dark mode toggle for users',
        defaultValue: true,
        envVar: 'REACT_APP_DARK_MODE_ENABLED'
      },

      MAINTENANCE_MODE_ENABLED: {
        name: 'Maintenance Mode',
        description: 'Shows maintenance page to users',
        defaultValue: false,
        envVar: 'REACT_APP_MAINTENANCE_MODE_ENABLED'
      },

      BETA_FEATURES_ENABLED: {
        name: 'Beta Features',
        description: 'Enables experimental features',
        defaultValue: isDev || (isStaging && process.env.REACT_APP_BETA_FEATURES_ENABLED === 'true'),
        envVar: 'REACT_APP_BETA_FEATURES_ENABLED'
      },

      // Development Features
      DEV_MODE_BAR_ENABLED: {
        name: 'Development Mode Bar',
        description: 'Shows development helper bar in UI',
        defaultValue: isDev,
        envVar: 'REACT_APP_DEV_MODE_BAR_ENABLED'
      }
    };
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - The name of the feature to check
   * @returns {boolean} - Whether the feature is enabled
   */
  isEnabled(featureName) {
    const feature = this.features[featureName];
    if (!feature) {
      console.warn(`Unknown feature flag: ${featureName}`);
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
   * @returns {Object} - Object containing all feature states
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
}

// Create singleton instance
const clientFeatureFlags = new ClientFeatureFlags();

// Export convenience functions
export const isEnabled = (featureName) => clientFeatureFlags.isEnabled(featureName);
export const getAllFeatures = () => clientFeatureFlags.getAllFeatures();

// Export feature names as constants
export const FEATURES = Object.keys(clientFeatureFlags.features).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

export default clientFeatureFlags;
