/**
 * Field Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive database fields
 * with proper key management and error handling.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class FieldEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits

    // Initialize encryption key
    this.encryptionKey = this.loadEncryptionKey();

    // Cache for performance
    this.encryptionCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load encryption key from secure location
   */
  loadEncryptionKey() {
    try {
      // Try environment variable first
      if (process.env.FIELD_ENCRYPTION_KEY) {
        const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex');
        if (key.length === this.keyLength) {
          return key;
        }
        console.warn('⚠️  FIELD_ENCRYPTION_KEY has invalid length, falling back to file');
      }

      // Try secrets file
      const keyPath = path.join(process.cwd(), 'secrets', 'keys', 'field_encryption.key');
      if (fs.existsSync(keyPath)) {
        const keyHex = fs.readFileSync(keyPath, 'utf8').trim();
        const key = Buffer.from(keyHex, 'hex');
        if (key.length === this.keyLength) {
          return key;
        }
        console.warn('⚠️  Field encryption key file has invalid length');
      }

      // Generate temporary key for development (NOT for production)
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Using temporary encryption key for development');
        return crypto.randomBytes(this.keyLength);
      }

      throw new Error('No valid field encryption key found');
    } catch (error) {
      console.error('❌ Failed to load field encryption key:', error.message);
      throw error;
    }
  }

  /**
   * Encrypt a plaintext value
   * @param {string} plaintext - The value to encrypt
   * @param {string} context - Optional context for additional security
   * @returns {string} Encrypted value in format: iv:tag:ciphertext
   */
  encrypt(plaintext, context = '') {
    if (!plaintext || typeof plaintext !== 'string') {
      return null;
    }

    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      cipher.setAAD(Buffer.from(context, 'utf8'));

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Return formatted result
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('❌ Encryption failed:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted value
   * @param {string} encryptedData - The encrypted value to decrypt
   * @param {string} context - Optional context used during encryption
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData, context = '') {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return null;
    }

    try {
      // Parse encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Validate lengths
      if (iv.length !== this.ivLength || tag.length !== this.tagLength) {
        throw new Error('Invalid IV or tag length');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAAD(Buffer.from(context, 'utf8'));
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an object's sensitive fields
   * @param {Object} obj - Object containing fields to encrypt
   * @param {Array} fields - Array of field names to encrypt
   * @returns {Object} Object with encrypted fields
   */
  encryptFields(obj, fields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = this.encrypt(String(result[field]), field);
      }
    }

    return result;
  }

  /**
   * Decrypt an object's encrypted fields
   * @param {Object} obj - Object containing encrypted fields
   * @param {Array} fields - Array of field names to decrypt
   * @returns {Object} Object with decrypted fields
   */
  decryptFields(obj, fields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = this.decrypt(result[field], field);
        } catch (error) {
          console.error(`❌ Failed to decrypt field '${field}':`, error.message);
          result[field] = null; // Set to null if decryption fails
        }
      }
    }

    return result;
  }

  /**
   * Generate a secure hash for indexing encrypted data
   * @param {string} plaintext - The value to hash
   * @param {string} salt - Optional salt for the hash
   * @returns {string} SHA-256 hash
   */
  generateSearchHash(plaintext, salt = '') {
    if (!plaintext) {
      return null;
    }

    const hash = crypto.createHash('sha256');
    hash.update(plaintext + salt);
    return hash.digest('hex');
  }

  /**
   * Encrypt data for backup purposes with additional key derivation
   * @param {string} data - Data to encrypt for backup
   * @param {string} backupPassword - Additional password for backup encryption
   * @returns {string} Backup-encrypted data
   */
  encryptForBackup(data, backupPassword) {
    if (!data || !backupPassword) {
      throw new Error('Data and backup password are required');
    }

    try {
      // Derive key from backup password
      const salt = crypto.randomBytes(16);
      const backupKey = crypto.pbkdf2Sync(backupPassword, salt, 100000, 32, 'sha256');

      // Encrypt with backup key
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, backupKey, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Return salt:iv:tag:ciphertext
      return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('❌ Backup encryption failed:', error.message);
      throw new Error('Failed to encrypt data for backup');
    }
  }

  /**
   * Decrypt backup data
   * @param {string} encryptedData - Backup-encrypted data
   * @param {string} backupPassword - Backup password
   * @returns {string} Decrypted data
   */
  decryptFromBackup(encryptedData, backupPassword) {
    if (!encryptedData || !backupPassword) {
      throw new Error('Encrypted data and backup password are required');
    }

    try {
      // Parse backup data
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid backup data format');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];

      // Derive key from backup password
      const backupKey = crypto.pbkdf2Sync(backupPassword, salt, 100000, 32, 'sha256');

      // Decrypt
      const decipher = crypto.createDecipheriv(this.algorithm, backupKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Backup decryption failed:', error.message);
      throw new Error('Failed to decrypt backup data');
    }
  }

  /**
   * Validate encryption key strength
   * @returns {boolean} True if key is valid
   */
  validateKey() {
    try {
      // Test encryption/decryption
      const testData = 'test-encryption-validation';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);

      return decrypted === testData;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get encryption status and statistics
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      keyValid: this.validateKey(),
      cacheSize: this.encryptionCache.size,
      cacheMaxSize: this.cacheMaxSize,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

// Export singleton instance
module.exports = new FieldEncryption();
