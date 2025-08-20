/**
 * Secrets Manager
 *
 * Centralized secrets management for the Maritime Onboarding System
 * Handles encryption keys, passwords, and sensitive configuration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecretsManager {
  constructor() {
    this.secretsPath = path.join(process.cwd(), 'secrets');
    this.keysPath = path.join(this.secretsPath, 'keys');
    this.passwordsPath = path.join(this.secretsPath, 'passwords');

    // Cache for loaded secrets
    this.secretsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Initialize secrets directory
    this.initializeSecretsDirectory();
  }

  /**
   * Initialize secrets directory structure
   */
  initializeSecretsDirectory() {
    try {
      // Create directories if they don't exist
      if (!fs.existsSync(this.secretsPath)) {
        fs.mkdirSync(this.secretsPath, { mode: 0o700 });
      }
      if (!fs.existsSync(this.keysPath)) {
        fs.mkdirSync(this.keysPath, { mode: 0o700 });
      }
      if (!fs.existsSync(this.passwordsPath)) {
        fs.mkdirSync(this.passwordsPath, { mode: 0o700 });
      }

      // Set restrictive permissions
      fs.chmodSync(this.secretsPath, 0o700);
      fs.chmodSync(this.keysPath, 0o700);
      fs.chmodSync(this.passwordsPath, 0o700);
    } catch (error) {
      console.warn('⚠️  Could not initialize secrets directory:', error.message);
    }
  }

  /**
   * Load a secret from file or environment variable
   * @param {string} secretName - Name of the secret
   * @param {string} type - Type of secret ('key', 'password', 'config')
   * @param {boolean} required - Whether the secret is required
   * @returns {string|null} Secret value
   */
  getSecret(secretName, type = 'key', required = true) {
    const cacheKey = `${type}:${secretName}`;

    // Check cache first
    if (this.secretsCache.has(cacheKey)) {
      const cached = this.secretsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }
      this.secretsCache.delete(cacheKey);
    }

    let secret = null;

    try {
      // Try environment variable first
      const envVarName = this.getEnvironmentVariableName(secretName, type);
      if (process.env[envVarName]) {
        secret = process.env[envVarName];
      } else {
        // Try file
        const filePath = this.getSecretFilePath(secretName, type);
        if (fs.existsSync(filePath)) {
          secret = fs.readFileSync(filePath, 'utf8').trim();
        }
      }

      // Validate secret
      if (secret && this.validateSecret(secret, type)) {
        // Cache the secret
        this.secretsCache.set(cacheKey, {
          value: secret,
          timestamp: Date.now()
        });
        return secret;
      }

      if (required) {
        throw new Error(`Required secret '${secretName}' not found or invalid`);
      }

      return null;
    } catch (error) {
      if (required) {
        console.error(`❌ Failed to load secret '${secretName}':`, error.message);
        throw error;
      }
      console.warn(`⚠️  Optional secret '${secretName}' not available:`, error.message);
      return null;
    }
  }

  /**
   * Store a secret securely
   * @param {string} secretName - Name of the secret
   * @param {string} value - Secret value
   * @param {string} type - Type of secret
   */
  setSecret(secretName, value, type = 'key') {
    try {
      const filePath = this.getSecretFilePath(secretName, type);

      // Write secret to file with restrictive permissions
      fs.writeFileSync(filePath, value, { mode: 0o600 });

      // Update cache
      const cacheKey = `${type}:${secretName}`;
      this.secretsCache.set(cacheKey, {
        value: value,
        timestamp: Date.now()
      });

      console.log(`✅ Secret '${secretName}' stored successfully`);
    } catch (error) {
      console.error(`❌ Failed to store secret '${secretName}':`, error.message);
      throw error;
    }
  }

  /**
   * Generate a new secret
   * @param {string} secretName - Name of the secret
   * @param {string} type - Type of secret
   * @param {number} length - Length of the secret
   * @returns {string} Generated secret
   */
  generateSecret(secretName, type = 'key', length = 32) {
    let secret;

    switch (type) {
      case 'key':
        // Generate hex key
        secret = crypto.randomBytes(length).toString('hex');
        break;
      case 'password':
        // Generate base64 password
        secret = crypto.randomBytes(length).toString('base64')
          .replace(/[+/=]/g, '')
          .substring(0, length);
        break;
      case 'jwt':
        // Generate JWT secret (longer)
        secret = crypto.randomBytes(64).toString('hex');
        break;
      default:
        throw new Error(`Unknown secret type: ${type}`);
    }

    // Store the generated secret
    this.setSecret(secretName, secret, type);
    return secret;
  }

  /**
   * Get environment variable name for a secret
   * @param {string} secretName - Name of the secret
   * @param {string} type - Type of secret
   * @returns {string} Environment variable name
   */
  getEnvironmentVariableName(secretName, type) {
    const prefix = type.toUpperCase();
    const name = secretName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `${prefix}_${name}`;
  }

  /**
   * Get file path for a secret
   * @param {string} secretName - Name of the secret
   * @param {string} type - Type of secret
   * @returns {string} File path
   */
  getSecretFilePath(secretName, type) {
    const basePath = type === 'password' ? this.passwordsPath : this.keysPath;
    const extension = type === 'key' ? '.key' : '.txt';
    return path.join(basePath, `${secretName}${extension}`);
  }

  /**
   * Validate a secret based on its type
   * @param {string} secret - Secret to validate
   * @param {string} type - Type of secret
   * @returns {boolean} True if valid
   */
  validateSecret(secret, type) {
    if (!secret || typeof secret !== 'string') {
      return false;
    }

    switch (type) {
      case 'key':
        // Hex key should be even length and contain only hex characters
        return secret.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(secret);
      case 'password':
        // Password should be at least 8 characters
        return secret.length >= 8;
      case 'jwt':
        // JWT secret should be at least 32 characters
        return secret.length >= 32;
      default:
        return true;
    }
  }

  /**
   * Get all required secrets for the application
   * @returns {Object} Object containing all secrets
   */
  getAllSecrets() {
    const secrets = {};

    try {
      // Encryption keys
      secrets.fieldEncryptionKey = this.getSecret('field_encryption', 'key', true);
      secrets.volumeEncryptionKey = this.getSecret('volume_encryption', 'key', false);
      secrets.databaseEncryptionKey = this.getSecret('database_encryption', 'key', true);
      secrets.backupEncryptionKey = this.getSecret('backup_encryption', 'key', true);

      // JWT secrets
      secrets.jwtSecret = this.getSecret('jwt_secret', 'jwt', true);

      // Database passwords
      secrets.postgresPassword = this.getSecret('postgres_admin', 'password', true);
      secrets.appDatabasePassword = this.getSecret('app_database', 'password', true);

      return secrets;
    } catch (error) {
      console.error('❌ Failed to load all secrets:', error.message);
      throw error;
    }
  }

  /**
   * Generate all required secrets if they don't exist
   */
  generateAllSecrets() {
    console.log('🔑 Generating missing secrets...');

    const requiredSecrets = [
      { name: 'field_encryption', type: 'key', length: 32 },
      { name: 'database_encryption', type: 'key', length: 32 },
      { name: 'backup_encryption', type: 'key', length: 32 },
      { name: 'jwt_secret', type: 'jwt', length: 64 },
      { name: 'postgres_admin', type: 'password', length: 32 },
      { name: 'app_database', type: 'password', length: 32 }
    ];

    for (const secret of requiredSecrets) {
      try {
        // Check if secret already exists
        const existing = this.getSecret(secret.name, secret.type, false);
        if (!existing) {
          this.generateSecret(secret.name, secret.type, secret.length);
          console.log(`✅ Generated ${secret.type} '${secret.name}'`);
        } else {
          console.log(`✅ Secret '${secret.name}' already exists`);
        }
      } catch (error) {
        console.error(`❌ Failed to generate secret '${secret.name}':`, error.message);
      }
    }
  }

  /**
   * Rotate a secret (generate new value)
   * @param {string} secretName - Name of the secret to rotate
   * @param {string} type - Type of secret
   * @param {number} length - Length of new secret
   */
  rotateSecret(secretName, type = 'key', length = 32) {
    console.log(`🔄 Rotating secret '${secretName}'...`);

    try {
      // Backup old secret
      const oldSecret = this.getSecret(secretName, type, false);
      if (oldSecret) {
        const backupPath = path.join(this.secretsPath, 'backups',
          `${secretName}_${Date.now()}.backup`);
        fs.writeFileSync(backupPath, oldSecret, { mode: 0o600 });
      }

      // Generate new secret
      const newSecret = this.generateSecret(secretName, type, length);

      console.log(`✅ Secret '${secretName}' rotated successfully`);
      return newSecret;
    } catch (error) {
      console.error(`❌ Failed to rotate secret '${secretName}':`, error.message);
      throw error;
    }
  }

  /**
   * Clear secrets cache
   */
  clearCache() {
    this.secretsCache.clear();
    console.log('🧹 Secrets cache cleared');
  }

  /**
   * Get secrets manager status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      secretsPath: this.secretsPath,
      cacheSize: this.secretsCache.size,
      secretsDirectoryExists: fs.existsSync(this.secretsPath),
      keysDirectoryExists: fs.existsSync(this.keysPath),
      passwordsDirectoryExists: fs.existsSync(this.passwordsPath)
    };
  }
}

// Export singleton instance
module.exports = new SecretsManager();
