/**
 * Environment Variable Validator
 * Ensures all required environment variables are set with valid values
 */

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate required environment variables
   */
  validateRequired() {
    const required = {
      // Database
      DB_HOST: 'Database host',
      DB_PORT: 'Database port',
      DB_NAME: 'Database name',
      DB_USER: 'Database user',
      DB_PASSWORD: 'Database password',

      // Storage
      MINIO_ENDPOINT: 'MinIO endpoint',
      MINIO_PORT: 'MinIO port',
      MINIO_ACCESS_KEY: 'MinIO access key',
      MINIO_SECRET_KEY: 'MinIO secret key',

      // Security
      JWT_SECRET: 'JWT secret key',

      // Application
      NODE_ENV: 'Node environment',
      PORT: 'Application port'
    };

    for (const [key, description] of Object.entries(required)) {
      if (!process.env[key]) {
        this.errors.push(`Missing required environment variable: ${key} (${description})`);
      }
    }

    return this;
  }

  /**
   * Validate environment variable formats
   */
  validateFormats() {
    // Validate port numbers
    const ports = ['DB_PORT', 'MINIO_PORT', 'PORT', 'REDIS_PORT'];
    for (const portVar of ports) {
      if (process.env[portVar]) {
        const port = parseInt(process.env[portVar]);
        if (isNaN(port) || port < 1 || port > 65535) {
          this.errors.push(`Invalid port number for ${portVar}: ${process.env[portVar]}`);
        }
      }
    }

    // Validate boolean flags
    const booleans = ['MINIO_USE_SSL', 'REDIS_USE_SSL'];
    for (const boolVar of booleans) {
      if (process.env[boolVar] && !['true', 'false'].includes(process.env[boolVar])) {
        this.warnings.push(`Invalid boolean value for ${boolVar}: ${process.env[boolVar]} (should be 'true' or 'false')`);
      }
    }

    // Validate URLs
    const urls = ['POSTGREST_URL', 'REACT_APP_API_URL', 'FRONTEND_URL'];
    for (const urlVar of urls) {
      if (process.env[urlVar]) {
        try {
          new URL(process.env[urlVar]);
        } catch (error) {
          this.warnings.push(`Invalid URL format for ${urlVar}: ${process.env[urlVar]}`);
        }
      }
    }

    return this;
  }

  /**
   * Validate security requirements
   */
  validateSecurity() {
    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.errors.push('JWT_SECRET must be at least 32 characters long');
    }

    // Check for default/weak passwords
    const passwordVars = ['DB_PASSWORD', 'MINIO_SECRET_KEY', 'REDIS_PASSWORD'];
    const weakPasswords = ['password', 'admin', '123456', 'postgres', 'minioadmin', 'redis'];

    for (const passVar of passwordVars) {
      if (process.env[passVar]) {
        if (weakPasswords.includes(process.env[passVar].toLowerCase())) {
          this.errors.push(`Weak password detected for ${passVar}. Please use a strong password.`);
        }
        if (process.env[passVar].length < 8) {
          this.errors.push(`${passVar} must be at least 8 characters long`);
        }
      }
    }

    // Production environment checks
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.HTTPS_ENABLED || process.env.HTTPS_ENABLED !== 'true') {
        this.warnings.push('HTTPS should be enabled in production');
      }
      if (process.env.DEBUG === 'true') {
        this.warnings.push('DEBUG should be disabled in production');
      }
    }

    return this;
  }

  /**
   * Check for deprecated environment variables
   */
  checkDeprecated() {
    const deprecated = {
      'SUPABASE_URL': 'Use POSTGREST_URL instead',
      'SUPABASE_ANON_KEY': 'No longer needed',
      'SUPABASE_SERVICE_ROLE_KEY': 'No longer needed',
      'VERCEL_URL': 'Use FRONTEND_URL instead'
    };

    for (const [key, message] of Object.entries(deprecated)) {
      if (process.env[key]) {
        this.warnings.push(`Deprecated environment variable ${key}: ${message}`);
      }
    }

    return this;
  }

  /**
   * Get validation results
   */
  getResults() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Perform all validations
   */
  validate() {
    this.validateRequired();
    this.validateFormats();
    this.validateSecurity();
    this.checkDeprecated();

    const results = this.getResults();

    if (!results.valid) {
      console.error('❌ Environment validation failed:');
      results.errors.forEach(error => console.error(`  - ${error}`));

      if (results.warnings.length > 0) {
        console.warn('⚠️  Environment warnings:');
        results.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      // Exit if critical errors in production
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else if (results.warnings.length > 0) {
      console.warn('⚠️  Environment warnings:');
      results.warnings.forEach(warning => console.warn(`  - ${warning}`));
    } else {
      console.log('✅ Environment validation passed');
    }

    return results;
  }
}

// Export singleton instance
module.exports = new EnvironmentValidator();
