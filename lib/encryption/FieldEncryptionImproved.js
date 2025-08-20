/**
 * Improved Field Encryption Service
 *
 * Addresses critical issues:
 * - Async I/O operations
 * - Proper LRU cache management
 * - Key rotation with versioning
 * - Secure memory handling
 * - Comprehensive error handling
 *
 * @module FieldEncryptionImproved
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { LRUCache } = require('lru-cache');

/**
 * Custom error class for encryption failures
 */
class EncryptionError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'EncryptionError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Secure memory utilities
 */
class SecureMemory {
  /**
   * Securely clear sensitive buffer data
   * @param {Buffer} buffer - Buffer to clear
   */
  static clear(buffer) {
    if (!Buffer.isBuffer(buffer)) return;

    // Overwrite with random data first
    crypto.randomFillSync(buffer);
    // Then with zeros
    buffer.fill(0);
    // Force garbage collection hint
    if (global.gc) {
      setImmediate(() => global.gc());
    }
  }

  /**
   * Create a secure buffer that auto-clears
   * @param {number} size - Buffer size
   * @returns {Object} Secure buffer wrapper
   */
  static createSecureBuffer(size) {
    const buffer = Buffer.allocUnsafe(size);
    const wrapper = {
      buffer,
      clear: () => SecureMemory.clear(buffer),
      // Auto-clear on process exit
      _cleanup: () => {
        process.removeListener('exit', wrapper._cleanup);
        process.removeListener('SIGINT', wrapper._cleanup);
        process.removeListener('SIGTERM', wrapper._cleanup);
        wrapper.clear();
      }
    };

    // Register cleanup handlers
    process.once('exit', wrapper._cleanup);
    process.once('SIGINT', wrapper._cleanup);
    process.once('SIGTERM', wrapper._cleanup);

    return wrapper;
  }
}

/**
 * Key versioning and rotation manager
 */
class KeyManager {
  constructor() {
    this.currentVersion = 1;
    this.keys = new Map();
    // Allow test environment to override secrets path
    const secretsPath = process.env.SECRETS_PATH || path.join(process.cwd(), 'secrets');
    this.keyPath = path.join(secretsPath, 'keys');
    this.rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
  }

  /**
   * Load all key versions asynchronously
   */
  async loadKeys() {
    try {
      const metadataPath = path.join(this.keyPath, 'key_metadata.json');

      // Check if metadata exists
      try {
        await fs.access(metadataPath);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        this.currentVersion = metadata.currentVersion;

        // Load all key versions
        for (const version of metadata.versions) {
          const keyPath = path.join(this.keyPath, `field_encryption_v${version.id}.key`);
          const keyData = await fs.readFile(keyPath, 'utf8');
          const secureBuffer = SecureMemory.createSecureBuffer(32);
          secureBuffer.buffer.write(keyData.trim(), 'hex');

          this.keys.set(version.id, {
            key: secureBuffer,
            createdAt: new Date(version.createdAt),
            status: version.status
          });
        }
      } catch (error) {
        // No metadata, load default key
        await this.loadDefaultKey();
      }
    } catch (error) {
      throw new EncryptionError(
        'Failed to load encryption keys',
        'KEY_LOAD_FAILED',
        error
      );
    }
  }

  /**
   * Load default key for backward compatibility
   */
  async loadDefaultKey() {
    const defaultKeyPath = path.join(this.keyPath, 'field_encryption.key');

    try {
      const keyData = await fs.readFile(defaultKeyPath, 'utf8');
      const secureBuffer = SecureMemory.createSecureBuffer(32);
      secureBuffer.buffer.write(keyData.trim(), 'hex');

      this.keys.set(1, {
        key: secureBuffer,
        createdAt: new Date(),
        status: 'active'
      });

      // Create metadata for future use
      await this.saveMetadata();
    } catch (error) {
      // Try environment variable as last resort
      if (process.env.FIELD_ENCRYPTION_KEY) {
        const secureBuffer = SecureMemory.createSecureBuffer(32);
        secureBuffer.buffer.write(process.env.FIELD_ENCRYPTION_KEY, 'hex');

        this.keys.set(1, {
          key: secureBuffer,
          createdAt: new Date(),
          status: 'active'
        });
      } else {
        throw new EncryptionError(
          'No encryption key available',
          'NO_KEY_AVAILABLE',
          error
        );
      }
    }
  }

  /**
   * Save key metadata
   */
  async saveMetadata() {
    const metadata = {
      currentVersion: this.currentVersion,
      versions: Array.from(this.keys.entries()).map(([id, data]) => ({
        id,
        createdAt: data.createdAt.toISOString(),
        status: data.status
      }))
    };

    const metadataPath = path.join(this.keyPath, 'key_metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    await fs.chmod(metadataPath, 0o600);
  }

  /**
   * Get key by version
   * @param {number} version - Key version
   * @returns {Buffer} Encryption key
   */
  getKey(version = null) {
    const v = version || this.currentVersion;
    const keyData = this.keys.get(v);

    if (!keyData) {
      throw new EncryptionError(
        `Key version ${v} not found`,
        'KEY_VERSION_NOT_FOUND'
      );
    }

    return keyData.key.buffer;
  }

  /**
   * Rotate to a new key version
   */
  async rotateKey() {
    const newVersion = this.currentVersion + 1;
    const newKey = crypto.randomBytes(32);
    const secureBuffer = SecureMemory.createSecureBuffer(32);
    newKey.copy(secureBuffer.buffer);

    // Save new key to file
    const keyPath = path.join(this.keyPath, `field_encryption_v${newVersion}.key`);
    await fs.writeFile(keyPath, secureBuffer.buffer.toString('hex'));
    await fs.chmod(keyPath, 0o600);

    // Update in-memory keys
    this.keys.set(newVersion, {
      key: secureBuffer,
      createdAt: new Date(),
      status: 'active'
    });

    // Mark old version as rotated
    const oldKey = this.keys.get(this.currentVersion);
    if (oldKey) {
      oldKey.status = 'rotated';
    }

    this.currentVersion = newVersion;
    await this.saveMetadata();

    return newVersion;
  }

  /**
   * Clean up all keys from memory
   */
  cleanup() {
    for (const [, keyData] of this.keys) {
      keyData.key.clear();
    }
    this.keys.clear();
  }
}

/**
 * Improved Field Encryption Service
 */
class FieldEncryptionImproved {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;

    // Key manager for versioning and rotation
    this.keyManager = new KeyManager();

    // LRU cache with proper size management
    this.cache = new LRUCache({
      max: 500, // Maximum number of items
      maxSize: 50 * 1024 * 1024, // 50MB max size
      sizeCalculation: (value) => {
        // Calculate size of cached item
        return Buffer.byteLength(JSON.stringify(value));
      },
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      // Secure disposal of cached items
      dispose: (value, key, reason) => {
        if (reason === 'delete' || reason === 'evict') {
          // Clear sensitive data from cache
          if (value && value.decrypted) {
            if (Buffer.isBuffer(value.decrypted)) {
              SecureMemory.clear(value.decrypted);
            }
            delete value.decrypted;
          }
        }
      }
    });

    // Metrics for monitoring
    this.metrics = {
      encryptionCount: 0,
      decryptionCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      keyRotations: 0
    };

    // Initialize asynchronously
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the encryption service
   */
  async initialize() {
    try {
      await this.keyManager.loadKeys();
      this.initialized = true;

      // Set up automatic key rotation check
      this.rotationCheckInterval = setInterval(async () => {
        await this.checkKeyRotation();
      }, 24 * 60 * 60 * 1000); // Daily check

      return true;
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Check if key rotation is needed
   */
  async checkKeyRotation() {
    try {
      const currentKey = this.keyManager.keys.get(this.keyManager.currentVersion);
      if (!currentKey) return;

      const age = Date.now() - currentKey.createdAt.getTime();
      if (age > this.keyManager.rotationInterval) {
        console.log('🔄 Rotating encryption key...');
        const newVersion = await this.keyManager.rotateKey();
        this.metrics.keyRotations++;
        console.log(`✅ Key rotated to version ${newVersion}`);

        // Clear cache after rotation
        this.cache.clear();
      }
    } catch (error) {
      console.error('Key rotation check failed:', error);
    }
  }

  /**
   * Encrypt a value with versioning
   * @param {string|Buffer|Object} value - Value to encrypt
   * @param {string} context - Encryption context (e.g., field name)
   * @returns {Promise<Object>} Encrypted data with metadata
   */
  async encrypt(value, context = '') {
    await this.ensureInitialized();

    try {
      if (value === null || value === undefined) {
        return null;
      }

      // Convert to string if needed
      let plaintext;
      if (typeof value === 'object' && !Buffer.isBuffer(value)) {
        plaintext = JSON.stringify(value);
      } else {
        plaintext = value.toString();
      }

      // Generate unique IV
      const iv = crypto.randomBytes(this.ivLength);

      // Get current key
      const key = this.keyManager.getKey();

      // Create cipher with context as AAD
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from(context));

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Clear sensitive data
      SecureMemory.clear(Buffer.from(plaintext));

      this.metrics.encryptionCount++;

      // Return versioned encrypted data
      return {
        v: this.keyManager.currentVersion, // Version
        e: encrypted.toString('base64'),   // Encrypted data
        i: iv.toString('base64'),          // IV
        t: tag.toString('base64'),         // Tag
        c: context                          // Context
      };
    } catch (error) {
      this.metrics.errors++;
      throw new EncryptionError(
        'Encryption failed',
        'ENCRYPTION_FAILED',
        error
      );
    }
  }

  /**
   * Decrypt a value with version support
   * @param {Object} encryptedData - Encrypted data object
   * @returns {Promise<string>} Decrypted value
   */
  async decrypt(encryptedData) {
    await this.ensureInitialized();

    try {
      if (!encryptedData || !encryptedData.e) {
        return null;
      }

      // Check cache
      const cacheKey = `${encryptedData.v}:${encryptedData.e}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      this.metrics.cacheMisses++;

      // Extract components
      const version = encryptedData.v || 1;
      const encrypted = Buffer.from(encryptedData.e, 'base64');
      const iv = Buffer.from(encryptedData.i, 'base64');
      const tag = Buffer.from(encryptedData.t, 'base64');
      const context = encryptedData.c || '';

      // Get key for this version
      const key = this.keyManager.getKey(version);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(context));

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');

      // Cache result (with size limit)
      if (decrypted.length < 10000) { // Don't cache large values
        this.cache.set(cacheKey, decrypted);
      }

      this.metrics.decryptionCount++;

      return decrypted;
    } catch (error) {
      this.metrics.errors++;

      // Check if it's an authentication failure
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new EncryptionError(
          'Decryption failed - data may be tampered',
          'AUTHENTICATION_FAILED',
          error
        );
      }

      throw new EncryptionError(
        'Decryption failed',
        'DECRYPTION_FAILED',
        error
      );
    }
  }

  /**
   * Generate search hash for encrypted field
   * @param {string} value - Value to hash
   * @param {string} salt - Optional salt
   * @returns {Promise<string>} SHA-256 hash
   */
  async generateSearchHash(value, salt = '') {
    if (!value) return null;

    const hash = crypto.createHash('sha256');
    hash.update(salt + value);
    return hash.digest('hex');
  }

  /**
   * Re-encrypt data with new key version
   * @param {Object} encryptedData - Encrypted data to re-encrypt
   * @returns {Promise<Object>} Re-encrypted data
   */
  async reencrypt(encryptedData) {
    const decrypted = await this.decrypt(encryptedData);
    return await this.encrypt(decrypted, encryptedData.c);
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheCalculatedSize: this.cache.calculatedSize,
      currentKeyVersion: this.keyManager.currentVersion
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Clear rotation check interval
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
    }

    // Clear cache
    this.cache.clear();

    // Clear keys from memory
    this.keyManager.cleanup();

    this.initialized = false;
  }
}

// Export singleton instance
let instance = null;

module.exports = {
  FieldEncryptionImproved,
  EncryptionError,
  SecureMemory,

  // Singleton getter
  getInstance: async () => {
    if (!instance) {
      instance = new FieldEncryptionImproved();
      await instance.initialize();
    }
    return instance;
  },

  // Clean up singleton
  cleanup: async () => {
    if (instance) {
      await instance.cleanup();
      instance = null;
    }
  }
};
