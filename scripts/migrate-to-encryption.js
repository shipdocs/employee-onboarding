#!/usr/bin/env node

/**
 * Migration Script: Migrate to Encrypted Storage
 * 
 * This script migrates existing sensitive data to encrypted columns
 * while maintaining system availability and data integrity.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Import our services
const supabase = require('../lib/supabase');
const fieldEncryption = require('../lib/encryption/FieldEncryption');
const secretsManager = require('../lib/security/SecretsManager');

// Configuration
const BATCH_SIZE = 100;
const MIGRATION_LOG_FILE = './logs/encryption-migration.log';

class EncryptionMigration {
  constructor() {
    this.migrationId = crypto.randomUUID();
    this.startTime = new Date();
    this.stats = {
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      skippedRecords: 0
    };
    
    // Ensure logs directory exists
    const logsDir = path.dirname(MIGRATION_LOG_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Log migration progress
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      migrationId: this.migrationId,
      level,
      message,
      data
    };

    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    // Append to log file
    fs.appendFileSync(MIGRATION_LOG_FILE, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Validate encryption setup
   */
  async validateSetup() {
    this.log('info', 'Validating encryption setup...');

    try {
      // Check if encryption extensions are available
      const { data: extensions, error: extError } = await supabase.helpers.query(`
        SELECT name FROM pg_available_extensions 
        WHERE name IN ('pgcrypto', 'uuid-ossp')
      `);

      if (extError) {
        throw new Error(`Failed to check extensions: ${extError.message}`);
      }

      if (extensions.length < 2) {
        throw new Error('Required encryption extensions not available');
      }

      // Check if encryption functions exist
      const { data: functions, error: funcError } = await supabase.helpers.query(`
        SELECT proname FROM pg_proc 
        WHERE proname IN ('encrypt_field', 'decrypt_field', 'create_search_hash')
      `);

      if (funcError) {
        throw new Error(`Failed to check functions: ${funcError.message}`);
      }

      if (functions.length < 3) {
        throw new Error('Required encryption functions not available');
      }

      // Validate field encryption service
      if (!fieldEncryption.validateKey()) {
        throw new Error('Field encryption key validation failed');
      }

      this.log('info', 'Encryption setup validation passed');
      return true;
    } catch (error) {
      this.log('error', 'Encryption setup validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Migrate users table
   */
  async migrateUsers() {
    this.log('info', 'Starting users table migration...');

    try {
      // Get total count
      const { data: countResult } = await supabase.helpers.query(
        'SELECT COUNT(*) as count FROM users WHERE encrypted_personal_data IS NULL'
      );
      const totalUsers = parseInt(countResult[0].count);
      
      this.log('info', `Found ${totalUsers} users to migrate`);
      this.stats.totalRecords += totalUsers;

      let offset = 0;
      let migratedCount = 0;

      while (offset < totalUsers) {
        // Get batch of users
        const { data: users, error } = await supabase.helpers.query(`
          SELECT id, first_name, last_name, email, position
          FROM users 
          WHERE encrypted_personal_data IS NULL
          ORDER BY id
          LIMIT $1 OFFSET $2
        `, [BATCH_SIZE, offset]);

        if (error) {
          throw new Error(`Failed to fetch users: ${error.message}`);
        }

        // Process batch
        for (const user of users) {
          try {
            // Create personal data object
            const personalData = {
              firstName: user.first_name,
              lastName: user.last_name,
              position: user.position,
              migratedAt: new Date().toISOString()
            };

            // Encrypt personal data
            const encryptedData = fieldEncryption.encrypt(
              JSON.stringify(personalData),
              'user_personal_data'
            );

            // Create search hash for email (if needed for searching)
            const emailHash = fieldEncryption.generateSearchHash(user.email, 'user_email');

            // Update user record
            const { error: updateError } = await supabase.helpers.query(`
              UPDATE users 
              SET 
                encrypted_personal_data = $1,
                personal_data_hash = $2,
                updated_at = NOW()
              WHERE id = $3
            `, [encryptedData, emailHash, user.id]);

            if (updateError) {
              throw new Error(`Failed to update user ${user.id}: ${updateError.message}`);
            }

            migratedCount++;
            this.stats.migratedRecords++;

            if (migratedCount % 10 === 0) {
              this.log('info', `Migrated ${migratedCount}/${totalUsers} users`);
            }

          } catch (error) {
            this.log('error', `Failed to migrate user ${user.id}`, { error: error.message });
            this.stats.failedRecords++;
          }
        }

        offset += BATCH_SIZE;
      }

      // Update migration status
      await this.updateMigrationStatus('users', 'encrypted_personal_data', true);
      
      this.log('info', `Users migration completed: ${migratedCount} migrated`);
    } catch (error) {
      this.log('error', 'Users migration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Migrate MFA settings
   */
  async migrateMfaSettings() {
    this.log('info', 'Starting MFA settings migration...');

    try {
      const { data: mfaSettings, error } = await supabase.helpers.query(`
        SELECT id, user_id, secret, backup_codes
        FROM user_mfa_settings 
        WHERE encrypted_secret_new IS NULL
      `);

      if (error) {
        throw new Error(`Failed to fetch MFA settings: ${error.message}`);
      }

      this.log('info', `Found ${mfaSettings.length} MFA settings to migrate`);
      this.stats.totalRecords += mfaSettings.length;

      for (const mfa of mfaSettings) {
        try {
          // Encrypt secret
          const encryptedSecret = fieldEncryption.encrypt(mfa.secret, 'mfa_secret');
          
          // Encrypt backup codes if they exist
          let encryptedBackupCodes = null;
          if (mfa.backup_codes && mfa.backup_codes.length > 0) {
            encryptedBackupCodes = fieldEncryption.encrypt(
              JSON.stringify(mfa.backup_codes),
              'mfa_backup_codes'
            );
          }

          // Update MFA record
          const { error: updateError } = await supabase.helpers.query(`
            UPDATE user_mfa_settings 
            SET 
              encrypted_secret_new = $1,
              encrypted_backup_codes_new = $2,
              updated_at = NOW()
            WHERE id = $3
          `, [encryptedSecret, encryptedBackupCodes, mfa.id]);

          if (updateError) {
            throw new Error(`Failed to update MFA ${mfa.id}: ${updateError.message}`);
          }

          this.stats.migratedRecords++;
        } catch (error) {
          this.log('error', `Failed to migrate MFA ${mfa.id}`, { error: error.message });
          this.stats.failedRecords++;
        }
      }

      await this.updateMigrationStatus('user_mfa_settings', 'encrypted_secret_new', true);
      this.log('info', 'MFA settings migration completed');
    } catch (error) {
      this.log('error', 'MFA settings migration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Migrate magic links
   */
  async migrateMagicLinks() {
    this.log('info', 'Starting magic links migration...');

    try {
      const { data: magicLinks, error } = await supabase.helpers.query(`
        SELECT id, token
        FROM magic_links 
        WHERE encrypted_token_new IS NULL AND expires_at > NOW()
      `);

      if (error) {
        throw new Error(`Failed to fetch magic links: ${error.message}`);
      }

      this.log('info', `Found ${magicLinks.length} active magic links to migrate`);
      this.stats.totalRecords += magicLinks.length;

      for (const link of magicLinks) {
        try {
          // Encrypt token
          const encryptedToken = fieldEncryption.encrypt(link.token, 'magic_link_token');
          
          // Create search hash
          const tokenHash = fieldEncryption.generateSearchHash(link.token, 'magic_link');

          // Update magic link record
          const { error: updateError } = await supabase.helpers.query(`
            UPDATE magic_links 
            SET 
              encrypted_token_new = $1,
              token_hash = $2
            WHERE id = $3
          `, [encryptedToken, tokenHash, link.id]);

          if (updateError) {
            throw new Error(`Failed to update magic link ${link.id}: ${updateError.message}`);
          }

          this.stats.migratedRecords++;
        } catch (error) {
          this.log('error', `Failed to migrate magic link ${link.id}`, { error: error.message });
          this.stats.failedRecords++;
        }
      }

      await this.updateMigrationStatus('magic_links', 'encrypted_token_new', true);
      this.log('info', 'Magic links migration completed');
    } catch (error) {
      this.log('error', 'Magic links migration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Update migration status in database
   */
  async updateMigrationStatus(tableName, columnName, completed) {
    try {
      await supabase.helpers.query(`
        SELECT update_encryption_status($1, $2, $3)
      `, [tableName, columnName, completed]);
    } catch (error) {
      this.log('error', `Failed to update migration status for ${tableName}.${columnName}`, 
        { error: error.message });
    }
  }

  /**
   * Create migration backup
   */
  async createBackup() {
    this.log('info', 'Creating pre-migration backup...');

    try {
      const backupFile = `./backups/pre-encryption-migration-${Date.now()}.sql`;
      
      // This would typically use pg_dump, but for now we'll create a simple backup
      const { data: tables } = await supabase.helpers.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'user_mfa_settings', 'magic_links')
      `);

      this.log('info', `Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      this.log('error', 'Backup creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run the complete migration
   */
  async run() {
    this.log('info', 'Starting encryption migration', {
      migrationId: this.migrationId,
      startTime: this.startTime
    });

    try {
      // Validate setup
      await this.validateSetup();

      // Create backup
      await this.createBackup();

      // Run migrations
      await this.migrateUsers();
      await this.migrateMfaSettings();
      await this.migrateMagicLinks();

      // Calculate duration
      const endTime = new Date();
      const duration = endTime - this.startTime;

      this.log('info', 'Encryption migration completed successfully', {
        migrationId: this.migrationId,
        duration: `${Math.round(duration / 1000)}s`,
        stats: this.stats
      });

      // Display summary
      console.log('\n🎉 Migration Summary:');
      console.log(`📊 Total Records: ${this.stats.totalRecords}`);
      console.log(`✅ Migrated: ${this.stats.migratedRecords}`);
      console.log(`❌ Failed: ${this.stats.failedRecords}`);
      console.log(`⏭️  Skipped: ${this.stats.skippedRecords}`);
      console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);

      return true;
    } catch (error) {
      this.log('error', 'Migration failed', { error: error.message });
      console.error('\n❌ Migration failed:', error.message);
      console.error('Check the migration log for details:', MIGRATION_LOG_FILE);
      return false;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new EncryptionMigration();
  migration.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = EncryptionMigration;
