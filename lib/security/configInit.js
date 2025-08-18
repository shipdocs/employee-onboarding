/**
 * Configuration Initialization
 * Handles startup environment validation and configuration health checks
 */

const configManager = require('./SecureConfigManager');

/**
 * Initialize configuration at application startup
 */
async function initializeConfiguration() {
  console.log('🔧 [CONFIG] Starting configuration initialization...');
  
  try {
    // Initialize the configuration manager
    const result = await configManager.initialize();
    
    if (!result.success) {
      console.error('🔧 [CONFIG] ❌ Configuration initialization failed');
      console.error('🔧 [CONFIG] Error:', result.error);
      
      // In production, fail fast
      if (configManager.getEnvironment().isProduction) {
        console.error('🔧 [CONFIG] 🚨 Exiting due to configuration errors in production');
        process.exit(1);
      }
      
      return { success: false, error: result.error };
    }
    
    // Log warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.warn('🔧 [CONFIG] ⚠️ Configuration warnings:');
      result.warnings.forEach(warning => {
        console.warn(`🔧 [CONFIG]   - ${warning.key}: ${warning.error}`);
      });
    }
    
    // Perform runtime validation
    const runtimeValidation = configManager.validateRuntime();
    if (!runtimeValidation.valid) {
      console.error('🔧 [CONFIG] ❌ Runtime validation failed:');
      runtimeValidation.errors.forEach(error => {
        console.error(`🔧 [CONFIG]   - ${error}`);
      });
      
      // In production, fail fast for runtime validation errors
      if (configManager.getEnvironment().isProduction) {
        console.error('🔧 [CONFIG] 🚨 Exiting due to runtime validation errors in production');
        process.exit(1);
      }
      
      return { success: false, error: 'Runtime validation failed', errors: runtimeValidation.errors };
    }
    
    // Log successful initialization
    console.log('🔧 [CONFIG] ✅ Configuration initialized successfully');
    
    // Perform health check
    const healthCheck = configManager.healthCheck();
    if (healthCheck.status === 'unhealthy') {
      console.warn('🔧 [CONFIG] ⚠️ Configuration health check indicates issues');
    }
    
    return { success: true, healthCheck };
    
  } catch (error) {
    console.error('🔧 [CONFIG] ❌ Unexpected error during configuration initialization:', error);
    
    // In production, fail fast for unexpected errors
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.error('🔧 [CONFIG] 🚨 Exiting due to unexpected configuration error in production');
      process.exit(1);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Validate specific configuration requirements
 */
function validateConfigurationRequirements() {
  const errors = [];
  const warnings = [];
  
  // Check critical environment variables
  const criticalVars = [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MAILERSEND_API_KEY'
  ];
  
  for (const varName of criticalVars) {
    const value = configManager.get(varName);
    if (!value) {
      errors.push(`Missing critical environment variable: ${varName}`);
    }
  }
  
  // Environment-specific checks
  const env = configManager.getEnvironment();
  
  if (env.isProduction) {
    // Production-specific validations
    const jwtSecret = configManager.get('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    
    const supabaseUrl = configManager.get('SUPABASE_URL');
    if (supabaseUrl && supabaseUrl.includes('localhost')) {
      errors.push('SUPABASE_URL cannot be localhost in production');
    }
    
    // Check for development defaults
    if (jwtSecret && (jwtSecret.includes('dev') || jwtSecret === 'your-secret-key')) {
      errors.push('JWT_SECRET appears to be a development default in production');
    }
  }
  
  if (env.isDevelopment) {
    // Development-specific warnings
    if (!configManager.get('DEBUG_ENDPOINT_ENABLED')) {
      warnings.push('DEBUG_ENDPOINT_ENABLED not set - debug endpoints will be disabled');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create configuration health check endpoint data
 */
function getConfigurationHealth() {
  const healthCheck = configManager.healthCheck();
  const requirements = validateConfigurationRequirements();
  
  return {
    ...healthCheck,
    requirements: {
      valid: requirements.valid,
      errors: requirements.errors,
      warnings: requirements.warnings
    },
    maskedConfig: configManager.getMaskedConfig()
  };
}

/**
 * Validate configuration for specific features
 */
function validateFeatureConfiguration(feature) {
  const featureRequirements = {
    email: ['MAILERSEND_API_KEY'],
    mfa: ['MFA_ENCRYPTION_KEY'],
    cron: ['CRON_SECRET'],
    webhooks: ['PAGERDUTY_WEBHOOK_SECRET'],
    redis: ['REDIS_URL'],
    vercel: ['VERCEL_ACCESS_TOKEN', 'VERCEL_PROJECT_ID']
  };
  
  const required = featureRequirements[feature];
  if (!required) {
    return { valid: false, error: `Unknown feature: ${feature}` };
  }
  
  const missing = required.filter(key => !configManager.get(key));
  
  return {
    valid: missing.length === 0,
    missing,
    available: required.filter(key => configManager.get(key))
  };
}

/**
 * Generate configuration report
 */
function generateConfigurationReport() {
  const env = configManager.getEnvironment();
  const healthCheck = configManager.healthCheck();
  const requirements = validateConfigurationRequirements();
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: env,
    status: healthCheck.status,
    summary: {
      initialized: configManager.initialized,
      configCount: healthCheck.configCount,
      errorCount: healthCheck.validationErrors.length,
      warningCount: requirements.warnings.length
    },
    validation: {
      errors: [...healthCheck.validationErrors, ...requirements.errors],
      warnings: requirements.warnings,
      runtimeErrors: healthCheck.runtimeErrors
    },
    features: {
      email: validateFeatureConfiguration('email'),
      mfa: validateFeatureConfiguration('mfa'),
      cron: validateFeatureConfiguration('cron'),
      webhooks: validateFeatureConfiguration('webhooks'),
      redis: validateFeatureConfiguration('redis'),
      vercel: validateFeatureConfiguration('vercel')
    }
  };
  
  return report;
}

/**
 * Log configuration report
 */
function logConfigurationReport() {
  const report = generateConfigurationReport();
  
  console.log('\n🔧 [CONFIG] Configuration Report');
  console.log('🔧 [CONFIG] ==================');
  console.log(`🔧 [CONFIG] Environment: ${report.environment.node}${report.environment.vercel ? ` (${report.environment.vercel})` : ''}`);
  console.log(`🔧 [CONFIG] Status: ${report.status}`);
  console.log(`🔧 [CONFIG] Configurations: ${report.summary.configCount}`);
  console.log(`🔧 [CONFIG] Errors: ${report.summary.errorCount}`);
  console.log(`🔧 [CONFIG] Warnings: ${report.summary.warningCount}`);
  
  // Log feature availability
  console.log('\n🔧 [CONFIG] Feature Availability:');
  Object.entries(report.features).forEach(([feature, status]) => {
    const icon = status.valid ? '✅' : '❌';
    console.log(`🔧 [CONFIG]   ${icon} ${feature}: ${status.valid ? 'Available' : `Missing: ${status.missing?.join(', ')}`}`);
  });
  
  // Log errors
  if (report.validation.errors.length > 0) {
    console.log('\n🔧 [CONFIG] Errors:');
    report.validation.errors.forEach(error => {
      const errorMsg = typeof error === 'string' ? error : `${error.key}: ${error.error}`;
      console.error(`🔧 [CONFIG]   ❌ ${errorMsg}`);
    });
  }
  
  // Log warnings
  if (report.validation.warnings.length > 0) {
    console.log('\n🔧 [CONFIG] Warnings:');
    report.validation.warnings.forEach(warning => {
      console.warn(`🔧 [CONFIG]   ⚠️ ${warning}`);
    });
  }
  
  console.log('🔧 [CONFIG] ==================\n');
}

module.exports = {
  initializeConfiguration,
  validateConfigurationRequirements,
  getConfigurationHealth,
  validateFeatureConfiguration,
  generateConfigurationReport,
  logConfigurationReport
};