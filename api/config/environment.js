// API endpoint to get environment configuration and feature flags
// This allows the frontend to know which features are enabled

const { environmentConfig } = require('../../config/environment');
const { getAllFeatures, getFeatureSummary } = require('../../config/features');
const { apiRateLimit } = require('../../lib/rateLimit');

module.exports = apiRateLimit(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current environment info
    const environment = environmentConfig.getEnvironment();
    const envSummary = environmentConfig.getSummary();

    // Get feature flags that are safe to expose to frontend
    const publicFeatures = {
      EMAIL_SENDING_ENABLED: envSummary.features.emailSending,
      QUIZ_SCORING_ENABLED: envSummary.features.quizScoring,
      CERTIFICATE_GENERATION_ENABLED: envSummary.features.certificateGeneration,
      TEST_DATA_ALLOWED: envSummary.features.testData,
      MAINTENANCE_MODE_ENABLED: getAllFeatures().MAINTENANCE_MODE_ENABLED?.enabled || false,
      BETA_FEATURES_ENABLED: getAllFeatures().BETA_FEATURES_ENABLED?.enabled || false,
      DEV_MODE_BAR_ENABLED: getAllFeatures().DEV_MODE_BAR_ENABLED?.enabled || false,
      API_DOCUMENTATION_ENABLED: getAllFeatures().API_DOCUMENTATION_ENABLED?.enabled || false
    };

    // Prepare response
    const response = {
      environment,
      features: publicFeatures,
      security: {
        httpsRequired: envSummary.security.httpsRequired,
        corsEnabled: envSummary.security.corsEnabled
      },
      // Add some useful flags for the frontend
      flags: {
        isDevelopment: environment === 'development',
        isStaging: environment === 'staging',
        isProduction: environment === 'production',
        debugMode: environment === 'development' || process.env.DEBUG === 'true'
      }
    };

    // Add email whitelist for staging environment
    if (environment === 'staging') {
      const emailConfig = environmentConfig.get('email');
      if (emailConfig.whitelist && emailConfig.whitelist.length > 0) {
        response.emailWhitelist = emailConfig.whitelist;
      }
    }

    // Cache for 5 minutes in production, 1 minute elsewhere
    const cacheTime = environment === 'production' ? 300 : 60;
    res.setHeader('Cache-Control', `public, max-age=${cacheTime}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting environment config:', error);
    return res.status(500).json({
      error: 'Failed to get environment configuration',
      // Fallback to safe defaults
      environment: 'production',
      features: {
        EMAIL_SENDING_ENABLED: true,
        QUIZ_SCORING_ENABLED: true,
        CERTIFICATE_GENERATION_ENABLED: true,
        TEST_DATA_ALLOWED: false,
        MAINTENANCE_MODE_ENABLED: false,
        BETA_FEATURES_ENABLED: false,
        DEV_MODE_BAR_ENABLED: false,
        API_DOCUMENTATION_ENABLED: false
      },
      flags: {
        isDevelopment: false,
        isStaging: false,
        isProduction: true,
        debugMode: false
      }
    });
  }
});
