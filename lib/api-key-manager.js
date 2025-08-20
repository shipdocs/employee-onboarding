// lib/api-key-manager.js - API key rotation and management system
// Handles secure storage, rotation, and failover of email API keys

const crypto = require('crypto');
const { supabase } = require('./supabase');

class ApiKeyManager {
  constructor() {
    this.providers = ['mailersend', 'smtp'];
    this.activeKeys = new Map();
    this.rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
    this.warningPeriod = 14 * 24 * 60 * 60 * 1000; // 14 days
    this.encryptionKey = this.deriveEncryptionKey();
  }

  // Derive encryption key from environment
  deriveEncryptionKey() {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      console.warn('⚠️ API_KEY_ENCRYPTION_SECRET not set or too short, using default');
      return crypto.createHash('sha256').update('default-encryption-key').digest();
    }
    return crypto.createHash('sha256').update(secret).digest();
  }

  // Initialize API key manager
  async initialize() {
    try {
      // Create tables if needed
      await this.createApiKeyTables();

      // Load active keys
      await this.loadActiveKeys();

      // Start rotation monitoring
      this.startRotationMonitoring();

      console.log('✅ API key manager initialized');
    } catch (error) {
      console.error('Error initializing API key manager:', error);
    }
  }

  // Create API key management tables
  async createApiKeyTables() {
    try {
      const { error } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS api_keys (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            key_name VARCHAR(100),
            key_hash VARCHAR(255) NOT NULL,
            encrypted_key TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            last_rotated_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            is_primary BOOLEAN DEFAULT FALSE,
            usage_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            metadata JSONB
          );
          
          CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
          CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
          CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
          CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);
        `
      });

      // API key rotation history
      const { error: historyError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS api_key_rotations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            old_key_id UUID REFERENCES api_keys(id),
            new_key_id UUID REFERENCES api_keys(id),
            rotated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            rotation_reason VARCHAR(100),
            rotated_by VARCHAR(100),
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_rotations_provider ON api_key_rotations(provider);
          CREATE INDEX IF NOT EXISTS idx_rotations_timestamp ON api_key_rotations(rotated_at);
        `
      });

      // API key usage logs
      const { error: usageError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS api_key_usage (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            key_id UUID REFERENCES api_keys(id),
            used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            endpoint VARCHAR(255),
            status_code INTEGER,
            response_time_ms INTEGER,
            error_message TEXT,
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_usage_key_id ON api_key_usage(key_id);
          CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON api_key_usage(used_at);
        `
      });

    } catch (error) {
      console.error('Error creating API key tables:', error);
    }
  }

  // Encrypt API key
  encryptApiKey(apiKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  // Decrypt API key
  decryptApiKey(encryptedKey, iv) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash API key for storage
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // Store new API key
  async storeApiKey(provider, apiKey, options = {}) {
    try {
      const {
        keyName = `${provider}-${Date.now()}`,
        expiresInDays = 90,
        isPrimary = false,
        metadata = {}
      } = options;

      // Encrypt the key
      const { encrypted, iv } = this.encryptApiKey(apiKey);
      const keyHash = this.hashApiKey(apiKey);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Store in database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          provider,
          key_name: keyName,
          key_hash: keyHash,
          encrypted_key: JSON.stringify({ data: encrypted, iv }),
          expires_at: expiresAt.toISOString(),
          is_primary: isPrimary,
          metadata
        })
        .select()
        .single();

      if (error) throw error;

      // If this is set as primary, update other keys
      if (isPrimary) {
        await this.setPrimaryKey(provider, data.id);
      }

      console.log(`✅ API key stored for ${provider}: ${keyName}`);
      return data;

    } catch (error) {
      console.error('Error storing API key:', error);
      throw error;
    }
  }

  // Load active keys into memory
  async loadActiveKeys() {
    try {
      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by provider
      const keysByProvider = {};
      keys.forEach(key => {
        if (!keysByProvider[key.provider]) {
          keysByProvider[key.provider] = [];
        }
        keysByProvider[key.provider].push(key);
      });

      // Store in memory
      Object.entries(keysByProvider).forEach(([provider, providerKeys]) => {
        this.activeKeys.set(provider, providerKeys);
      });

    } catch (error) {
      console.error('Error loading active keys:', error);
    }
  }

  // Get active API key for provider
  async getApiKey(provider, options = {}) {
    try {
      const { preferPrimary = true } = options;

      // Get from memory first
      let providerKeys = this.activeKeys.get(provider) || [];

      // Reload if empty
      if (providerKeys.length === 0) {
        await this.loadActiveKeys();
        providerKeys = this.activeKeys.get(provider) || [];
      }

      if (providerKeys.length === 0) {
        // Try to get from environment as fallback
        const envKey = this.getEnvKey(provider);
        if (envKey) {
          // Store it for future use
          await this.storeApiKey(provider, envKey, {
            keyName: `${provider}-env-import`,
            isPrimary: true,
            metadata: { source: 'environment' }
          });
          await this.loadActiveKeys();
          providerKeys = this.activeKeys.get(provider) || [];
        } else {
          throw new Error(`No API keys found for provider: ${provider}`);
        }
      }

      // Select key based on preference
      let selectedKey;
      if (preferPrimary) {
        selectedKey = providerKeys.find(k => k.is_primary) || providerKeys[0];
      } else {
        // Round-robin selection for load balancing
        const index = Math.floor(Math.random() * providerKeys.length);
        selectedKey = providerKeys[index];
      }

      // Decrypt the key
      const encryptedData = JSON.parse(selectedKey.encrypted_key);
      const apiKey = this.decryptApiKey(encryptedData.data, encryptedData.iv);

      // Update last used timestamp
      this.updateKeyUsage(selectedKey.id).catch(console.error);

      return {
        key: apiKey,
        keyId: selectedKey.id,
        expiresAt: selectedKey.expires_at
      };

    } catch (error) {
      console.error('Error getting API key:', error);
      throw error;
    }
  }

  // Get API key from environment
  getEnvKey(provider) {
    const envMap = {
      mailersend: process.env.MAILERSEND_API_KEY,
      smtp: process.env.SMTP_PASS
    };
    return envMap[provider];
  }

  // Update key usage
  async updateKeyUsage(keyId) {
    try {
      await supabase.rpc('increment', {
        table_name: 'api_keys',
        column_name: 'usage_count',
        row_id: keyId
      });

      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId);

    } catch (error) {
      console.error('Error updating key usage:', error);
    }
  }

  // Log API key usage
  async logKeyUsage(keyId, endpoint, statusCode, responseTime, errorMessage = null) {
    try {
      await supabase
        .from('api_key_usage')
        .insert({
          key_id: keyId,
          endpoint,
          status_code: statusCode,
          response_time_ms: responseTime,
          error_message: errorMessage
        });

      // Update failure count if needed
      if (statusCode >= 400) {
        await supabase.rpc('increment', {
          table_name: 'api_keys',
          column_name: 'failure_count',
          row_id: keyId
        });
      }

    } catch (error) {
      console.error('Error logging key usage:', error);
    }
  }

  // Set primary key for provider
  async setPrimaryKey(provider, keyId) {
    try {
      // Remove primary status from all keys
      await supabase
        .from('api_keys')
        .update({ is_primary: false })
        .eq('provider', provider);

      // Set new primary
      await supabase
        .from('api_keys')
        .update({ is_primary: true })
        .eq('id', keyId);

      // Reload keys
      await this.loadActiveKeys();

    } catch (error) {
      console.error('Error setting primary key:', error);
    }
  }

  // Rotate API key
  async rotateApiKey(provider, newApiKey, reason = 'scheduled') {
    try {
      // Get current primary key
      const currentKeys = this.activeKeys.get(provider) || [];
      const currentPrimary = currentKeys.find(k => k.is_primary);

      // Store new key
      const newKey = await this.storeApiKey(provider, newApiKey, {
        keyName: `${provider}-rotated-${Date.now()}`,
        isPrimary: true,
        metadata: { rotation_reason: reason }
      });

      // Create rotation record
      if (currentPrimary) {
        await supabase
          .from('api_key_rotations')
          .insert({
            provider,
            old_key_id: currentPrimary.id,
            new_key_id: newKey.id,
            rotation_reason: reason,
            rotated_by: 'system'
          });

        // Schedule old key deactivation (24 hour grace period)
        setTimeout(() => {
          this.deactivateKey(currentPrimary.id).catch(console.error);
        }, 24 * 60 * 60 * 1000);
      }

      console.log(`✅ API key rotated for ${provider}`);
      return newKey;

    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  }

  // Deactivate API key
  async deactivateKey(keyId) {
    try {
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

      // Reload keys
      await this.loadActiveKeys();

      console.log(`✅ API key deactivated: ${keyId}`);

    } catch (error) {
      console.error('Error deactivating key:', error);
    }
  }

  // Start rotation monitoring
  startRotationMonitoring() {
    // Check every day
    setInterval(() => {
      this.checkKeyExpiration().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // Initial check
    this.checkKeyExpiration().catch(console.error);
  }

  // Check for expiring keys
  async checkKeyExpiration() {
    try {
      const now = new Date();
      const warningDate = new Date(now.getTime() + this.warningPeriod);

      const { data: expiringKeys, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true)
        .lte('expires_at', warningDate.toISOString());

      if (error) throw error;

      for (const key of expiringKeys) {
        const daysUntilExpiry = Math.ceil(
          (new Date(key.expires_at) - now) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilExpiry <= 0) {
          // Key has expired
          await this.handleExpiredKey(key);
        } else {
          // Key is expiring soon
          await this.handleExpiringKey(key, daysUntilExpiry);
        }
      }

    } catch (error) {
      console.error('Error checking key expiration:', error);
    }
  }

  // Handle expired key
  async handleExpiredKey(key) {
    console.error(`🚨 API key expired: ${key.key_name} (${key.provider})`);

    // Deactivate immediately
    await this.deactivateKey(key.id);

    // Create alert
    await this.createKeyAlert('expired', key);
  }

  // Handle expiring key
  async handleExpiringKey(key, daysUntilExpiry) {
    console.warn(`⚠️ API key expiring in ${daysUntilExpiry} days: ${key.key_name} (${key.provider})`);

    // Create alert
    await this.createKeyAlert('expiring', key, { daysUntilExpiry });
  }

  // Create key alert
  async createKeyAlert(type, key, metadata = {}) {
    try {
      const alert = {
        alert_type: `api_key_${type}`,
        severity: type === 'expired' ? 'critical' : 'warning',
        title: `API Key ${type === 'expired' ? 'Expired' : 'Expiring Soon'}`,
        description: `API key for ${key.provider} (${key.key_name}) ${type === 'expired' ? 'has expired' : `expires in ${metadata.daysUntilExpiry} days`}`,
        metadata: {
          provider: key.provider,
          key_name: key.key_name,
          key_id: key.id,
          expires_at: key.expires_at,
          ...metadata
        }
      };

      await supabase
        .from('email_alerts')
        .insert(alert);

    } catch (error) {
      console.error('Error creating key alert:', error);
    }
  }

  // Get key statistics
  async getKeyStatistics(provider = null) {
    try {
      let query = supabase
        .from('api_keys')
        .select('*');

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data: keys, error } = await query;
      if (error) throw error;

      const stats = {
        total: keys.length,
        active: keys.filter(k => k.is_active).length,
        expired: keys.filter(k => new Date(k.expires_at) < new Date()).length,
        byProvider: {},
        recentUsage: []
      };

      // Group by provider
      keys.forEach(key => {
        if (!stats.byProvider[key.provider]) {
          stats.byProvider[key.provider] = {
            total: 0,
            active: 0,
            primary: null,
            usage: 0
          };
        }

        stats.byProvider[key.provider].total++;
        if (key.is_active) stats.byProvider[key.provider].active++;
        if (key.is_primary) stats.byProvider[key.provider].primary = key.key_name;
        stats.byProvider[key.provider].usage += key.usage_count;
      });

      // Get recent usage
      const { data: recentUsage, error: usageError } = await supabase
        .from('api_key_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(100);

      if (!usageError) {
        stats.recentUsage = recentUsage;
      }

      return stats;

    } catch (error) {
      console.error('Error getting key statistics:', error);
      return null;
    }
  }

  // Failover to backup key
  async failoverKey(provider, failedKeyId) {
    try {
      const keys = this.activeKeys.get(provider) || [];
      const backupKey = keys.find(k => k.id !== failedKeyId && k.is_active);

      if (backupKey) {
        await this.setPrimaryKey(provider, backupKey.id);
        console.log(`✅ Failed over to backup key: ${backupKey.key_name}`);
        return true;
      }

      console.error(`❌ No backup keys available for ${provider}`);
      return false;

    } catch (error) {
      console.error('Error during key failover:', error);
      return false;
    }
  }
}

// Export singleton instance
const apiKeyManager = new ApiKeyManager();

module.exports = {
  apiKeyManager,
  ApiKeyManager
};
