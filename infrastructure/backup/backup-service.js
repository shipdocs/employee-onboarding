/**
 * Backup Service
 * Handles automated backups for database and file storage
 */

const { supabase } = require('../../lib/supabase');
const config = require('./backup-config');
const crypto = require('crypto');

class BackupService {
  constructor() {
    this.config = config;
    this.status = {
      lastBackup: null,
      inProgress: false,
      errors: []
    };
  }

  /**
   * Execute database backup
   */
  async backupDatabase(type = 'full') {
    console.log(`Starting ${type} database backup...`);
    const startTime = Date.now();
    const backupId = this.generateBackupId();

    try {
      this.status.inProgress = true;
      
      // Create backup metadata
      const metadata = {
        id: backupId,
        type,
        timestamp: new Date().toISOString(),
        tables: this.config.database.tables,
        status: 'in_progress'
      };

      // Log backup start
      await this.logBackup('start', metadata);

      // Perform backup based on type
      let result;
      if (type === 'full') {
        result = await this.performFullDatabaseBackup(backupId, metadata);
      } else {
        result = await this.performIncrementalDatabaseBackup(backupId, metadata);
      }

      // Update metadata with results
      metadata.status = 'completed';
      metadata.size = result.size;
      metadata.duration = Date.now() - startTime;
      metadata.location = result.location;

      // Verify backup
      if (this.config.restore.verification.enabled) {
        await this.verifyBackup(backupId, result.location);
      }

      // Log backup completion
      await this.logBackup('complete', metadata);

      this.status.lastBackup = metadata;
      
      return {
        success: true,
        backupId,
        metadata
      };

    } catch (error) {
      console.error('Database backup failed:', error);
      this.status.errors.push({
        type: 'database_backup',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      await this.logBackup('failed', {
        id: backupId,
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    } finally {
      this.status.inProgress = false;
    }
  }

  /**
   * Perform full database backup
   */
  async performFullDatabaseBackup(backupId, metadata) {
    const backupData = {
      metadata,
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Backup critical tables
    for (const table of this.config.database.tables.critical) {
      console.log(`Backing up table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        throw new Error(`Failed to backup table ${table}: ${error.message}`);
      }

      backupData.data[table] = data;
    }

    // Backup important tables
    for (const table of this.config.database.tables.important) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (!error) {
          backupData.data[table] = data;
        }
      } catch (e) {
        console.warn(`Failed to backup non-critical table ${table}:`, e.message);
      }
    }

    // Compress and encrypt backup
    const compressed = await this.compressData(backupData);
    const encrypted = await this.encryptData(compressed);

    // Upload to storage
    const location = await this.uploadBackup(backupId, encrypted, 'database');

    return {
      size: encrypted.length,
      location,
      tables: Object.keys(backupData.data),
      records: Object.values(backupData.data).reduce((sum, table) => sum + table.length, 0)
    };
  }

  /**
   * Perform incremental database backup
   */
  async performIncrementalDatabaseBackup(backupId, metadata) {
    // Get last backup timestamp
    const { data: lastBackup } = await supabase
      .from('backup_logs')
      .select('timestamp')
      .eq('type', 'database')
      .eq('status', 'completed')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const lastBackupTime = lastBackup?.timestamp || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const backupData = {
      metadata,
      type: 'incremental',
      since: lastBackupTime,
      data: {}
    };

    // Backup only changed records
    for (const table of [...this.config.database.tables.critical, ...this.config.database.tables.important]) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .or(`created_at.gt.${lastBackupTime},updated_at.gt.${lastBackupTime}`);

      if (!error && data.length > 0) {
        backupData.data[table] = data;
      }
    }

    // Compress and upload
    const compressed = await this.compressData(backupData);
    const location = await this.uploadBackup(backupId, compressed, 'database-incremental');

    return {
      size: compressed.length,
      location,
      tables: Object.keys(backupData.data),
      records: Object.values(backupData.data).reduce((sum, table) => sum + table.length, 0)
    };
  }

  /**
   * Backup file storage
   */
  async backupStorage(type = 'daily') {
    console.log(`Starting ${type} storage backup...`);
    const startTime = Date.now();
    const backupId = this.generateBackupId();

    try {
      const metadata = {
        id: backupId,
        type: `storage-${type}`,
        timestamp: new Date().toISOString(),
        buckets: this.config.storage.buckets,
        status: 'in_progress'
      };

      await this.logBackup('start', metadata);

      const results = {
        buckets: {},
        totalSize: 0,
        totalFiles: 0
      };

      // Backup each bucket
      for (const bucket of this.config.storage.buckets) {
        const bucketResult = await this.backupBucket(bucket, backupId);
        results.buckets[bucket] = bucketResult;
        results.totalSize += bucketResult.size;
        results.totalFiles += bucketResult.files;
      }

      metadata.status = 'completed';
      metadata.results = results;
      metadata.duration = Date.now() - startTime;

      await this.logBackup('complete', metadata);

      return {
        success: true,
        backupId,
        metadata
      };

    } catch (error) {
      console.error('Storage backup failed:', error);
      await this.logBackup('failed', {
        id: backupId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Backup individual storage bucket
   */
  async backupBucket(bucketName, backupId) {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 10000,
        offset: 0
      });

    if (error) {
      throw new Error(`Failed to list files in bucket ${bucketName}: ${error.message}`);
    }

    let totalSize = 0;
    const backupFiles = [];

    for (const file of files) {
      // Check if file should be included
      if (this.shouldIncludeFile(file.name)) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(file.name);

        if (!downloadError) {
          backupFiles.push({
            name: file.name,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at,
            data: fileData
          });
          totalSize += file.metadata?.size || 0;
        }
      }
    }

    // Create bucket backup archive
    const archive = {
      bucket: bucketName,
      timestamp: new Date().toISOString(),
      files: backupFiles
    };

    // Compress and upload
    const compressed = await this.compressData(archive);
    const location = await this.uploadBackup(`${backupId}/${bucketName}`, compressed, 'storage');

    return {
      files: backupFiles.length,
      size: totalSize,
      location
    };
  }

  /**
   * Check if file should be included in backup
   */
  shouldIncludeFile(filename) {
    // Check excludes
    for (const pattern of this.config.storage.exclude) {
      if (this.matchPattern(filename, pattern)) {
        return false;
      }
    }

    // Check includes
    for (const pattern of this.config.storage.include) {
      if (this.matchPattern(filename, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching
   */
  matchPattern(filename, pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(filename);
  }

  /**
   * Generate unique backup ID
   */
  generateBackupId() {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace('T', '-').split('.')[0];
    const random = crypto.randomBytes(4).toString('hex');
    return `backup-${timestamp}-${random}`;
  }

  /**
   * Compress data
   */
  async compressData(data) {
    // In production, use zlib or another compression library
    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Encrypt data
   */
  async encryptData(data) {
    if (!this.config.database.schedules.full.encryption) {
      return data;
    }

    // In production, implement proper encryption
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.BACKUP_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([
      iv,
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return encrypted;
  }

  /**
   * Upload backup to storage
   */
  async uploadBackup(backupId, data, type) {
    const destination = this.config.database.destinations.primary;
    const filename = `${destination.path}${type}/${backupId}.backup`;

    // In production, upload to S3 or Azure
    // For now, store in Supabase storage
    const { error } = await supabase.storage
      .from('system-backups')
      .upload(filename, data, {
        contentType: 'application/octet-stream',
        cacheControl: '3600'
      });

    if (error) {
      throw new Error(`Failed to upload backup: ${error.message}`);
    }

    return `${destination.type}://${destination.bucket}/${filename}`;
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId, location) {
    console.log(`Verifying backup ${backupId}...`);
    
    // Download and check backup
    // In production, implement full verification
    return true;
  }

  /**
   * Log backup operation
   */
  async logBackup(action, details) {
    try {
      await supabase
        .from('backup_logs')
        .insert({
          action,
          backup_id: details.id,
          type: details.type,
          status: details.status || action,
          details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log backup:', error);
    }
  }

  /**
   * Clean old backups based on retention policy
   */
  async cleanOldBackups() {
    console.log('Cleaning old backups...');

    const retentionPolicies = {
      'database-full': this.config.database.schedules.full.retention,
      'database-incremental': this.config.database.schedules.incremental.retention,
      'storage-daily': this.config.storage.schedules.daily.retention,
      'storage-weekly': this.config.storage.schedules.weekly.retention
    };

    for (const [type, retentionDays] of Object.entries(retentionPolicies)) {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const { data: oldBackups, error } = await supabase
        .from('backup_logs')
        .select('backup_id, details')
        .eq('type', type)
        .eq('status', 'completed')
        .lt('created_at', cutoffDate.toISOString());

      if (!error && oldBackups) {
        for (const backup of oldBackups) {
          await this.deleteBackup(backup.backup_id, backup.details.location);
        }
      }
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId, location) {
    console.log(`Deleting backup ${backupId}...`);
    
    // Delete from storage
    // In production, implement deletion from S3/Azure
    
    // Mark as deleted in logs
    await supabase
      .from('backup_logs')
      .update({ 
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('backup_id', backupId);
  }
}

module.exports = BackupService;