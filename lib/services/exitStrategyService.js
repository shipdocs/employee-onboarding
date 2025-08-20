/**
 * Exit Strategy Service
 * Provides complete system migration and exit capabilities
 */

const { supabase } = require('../supabase');
const { dataExportService } = require('./dataExportService');
const configService = require('../configService');
const { auditService, ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('./auditService');
const { StorageService } = require('../storage');
const { exitNotificationService } = require('./exitNotificationService');
const crypto = require('crypto');
const JSZip = require('jszip');

// Exit strategy status constants
const EXIT_STATUS = {
  PENDING: 'pending',
  COLLECTING: 'collecting',
  PACKAGING: 'packaging',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

class ExitStrategyService {
  constructor() {
    this.maxExportSize = 500 * 1024 * 1024; // 500MB max
  }

  /**
   * Request complete system export for migration
   */
  async requestSystemExport(adminUserId, adminEmail, options = {}) {
    try {
      const {
        includeUserData = true,
        includeSystemConfig = true,
        includeAuditLogs = true,
        includeCertificates = true,
        includeTrainingContent = true,
        format = 'json',
        dateRange = null
      } = options;

      // Create exit strategy job
      const exitJob = await this.createExitJob(adminUserId, adminEmail, options);

      // Log the exit strategy request
      await auditService.logEvent({
        userId: adminUserId,
        userEmail: adminEmail,
        action: ACTION_TYPES.ADMIN_ACTION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: exitJob.id,
        details: {
          action: 'system_export_requested',
          options,
          job_id: exitJob.id
        },
        severityLevel: SEVERITY_LEVELS.HIGH
      });

      // Start export processing asynchronously
      this.processSystemExport(exitJob.id).catch(error => {
        console.error('System export processing failed:', error);
      });

      return {
        success: true,
        exportId: exitJob.id,
        status: EXIT_STATUS.PENDING,
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        message: 'System export request submitted successfully'
      };

    } catch (error) {
      console.error('Failed to request system export:', error);
      throw error;
    }
  }

  /**
   * Create exit strategy job record
   */
  async createExitJob(adminUserId, adminEmail, options) {
    const { data, error } = await supabase
      .from('exit_strategy_jobs')
      .insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        export_options: options,
        status: EXIT_STATUS.PENDING,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exit job: ${error.message}`);
    }

    return data;
  }

  /**
   * Process complete system export
   */
  async processSystemExport(exitJobId) {
    try {
      // Update status to collecting
      await this.updateExitJobStatus(exitJobId, EXIT_STATUS.COLLECTING);

      // Get job details
      const { data: exitJob } = await supabase
        .from('exit_strategy_jobs')
        .select('*')
        .eq('id', exitJobId)
        .single();

      if (!exitJob) {
        throw new Error('Exit job not found');
      }

      const options = exitJob.export_options || {};
      const exportData = {
        metadata: {
          export_type: 'complete_system_export',
          export_date: new Date().toISOString(),
          export_version: '1.0',
          requested_by: exitJob.admin_email,
          options: options
        },
        system_info: await this.collectSystemInfo(),
        data: {}
      };

      // Collect all requested data
      if (options.includeUserData) {
        console.log('📊 Collecting user data...');
        exportData.data.users = await this.collectAllUserData(options.dateRange);
      }

      if (options.includeSystemConfig) {
        console.log('⚙️ Collecting system configuration...');
        exportData.data.configuration = await this.collectSystemConfiguration();
      }

      if (options.includeAuditLogs) {
        console.log('📋 Collecting audit logs...');
        exportData.data.audit_logs = await this.collectAuditLogs(options.dateRange);
      }

      if (options.includeCertificates) {
        console.log('🏆 Collecting certificates...');
        exportData.data.certificates = await this.collectCertificates(options.dateRange);
      }

      if (options.includeTrainingContent) {
        console.log('📚 Collecting training content...');
        exportData.data.training_content = await this.collectTrainingContent();
      }

      // Update status to packaging
      await this.updateExitJobStatus(exitJobId, EXIT_STATUS.PACKAGING);

      // Package and store the export
      const packageResult = await this.packageSystemExport(exitJobId, exportData, options.format);

      // Update job with completion details
      await this.updateExitJobStatus(exitJobId, EXIT_STATUS.COMPLETED, null, {
        file_path: packageResult.filePath,
        file_size: packageResult.fileSize,
        checksum: packageResult.checksum,
        completed_at: new Date().toISOString()
      });

      // Send completion notification
      await this.sendExitCompletionNotification(exitJob, packageResult);

      console.log(`✅ System export completed: ${exitJobId}`);
      return packageResult;

    } catch (error) {
      console.error('System export processing failed:', error);
      await this.updateExitJobStatus(exitJobId, EXIT_STATUS.FAILED, error.message);
      throw error;
    }
  }

  /**
   * Collect system information
   */
  async collectSystemInfo() {
    return {
      application: {
        name: 'Maritime Onboarding System',
        version: '2025.1.0',
        environment: process.env.NODE_ENV || 'production'
      },
      database: {
        provider: 'Supabase PostgreSQL',
        export_date: new Date().toISOString()
      },
      export_scope: {
        total_users: await this.getTableCount('users'),
        total_audit_logs: await this.getTableCount('audit_log'),
        total_certificates: await this.getTableCount('certificates'),
        total_training_phases: await this.getTableCount('training_phases')
      }
    };
  }

  /**
   * Collect all user data
   */
  async collectAllUserData(dateRange = null) {
    let query = supabase
      .from('users')
      .select(`
        *,
        training_progress(*),
        quiz_results(*),
        certificates(*),
        onboarding_progress(*),
        manager_permissions(*)
      `);

    if (dateRange?.start) {
      query = query.gte('created_at', dateRange.start);
    }
    if (dateRange?.end) {
      query = query.lte('created_at', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to collect user data: ${error.message}`);

    return data || [];
  }

  /**
   * Collect system configuration
   */
  async collectSystemConfiguration() {
    const config = {
      system_settings: await this.getTableData('system_settings'),
      feature_flags: await this.getTableData('feature_flags'),
      application_config: await configService.exportConfig(),
      email_templates: await this.getTableData('email_templates', ['id', 'name', 'subject', 'template_html']),
      pdf_templates: await this.getTableData('pdf_templates')
    };

    return config;
  }

  /**
   * Collect audit logs
   */
  async collectAuditLogs(dateRange = null) {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateRange?.start) {
      query = query.gte('created_at', dateRange.start);
    }
    if (dateRange?.end) {
      query = query.lte('created_at', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to collect audit logs: ${error.message}`);

    return data || [];
  }

  /**
   * Collect certificates
   */
  async collectCertificates(dateRange = null) {
    let query = supabase
      .from('certificates')
      .select(`
        *,
        users(id, email, first_name, last_name)
      `);

    if (dateRange?.start) {
      query = query.gte('issued_at', dateRange.start);
    }
    if (dateRange?.end) {
      query = query.lte('issued_at', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to collect certificates: ${error.message}`);

    return data || [];
  }

  /**
   * Collect training content
   */
  async collectTrainingContent() {
    const content = {
      training_phases: await this.getTableData('training_phases'),
      quiz_content: await this.getTableData('quiz_content'),
      forms: await this.getTableData('forms'),
      workflow_templates: await this.getTableData('workflow_templates')
    };

    return content;
  }

  /**
   * Package system export into compressed archive
   */
  async packageSystemExport(exitJobId, exportData, format) {
    const zip = new JSZip();

    // Add main export data
    if (format === 'json') {
      zip.file('system_export.json', JSON.stringify(exportData, null, 2));
    }

    // Add documentation
    zip.file('README.md', this.generateExportDocumentation(exportData));
    zip.file('migration_guide.md', this.generateMigrationGuide());
    zip.file('data_dictionary.json', JSON.stringify(this.generateDataDictionary(), null, 2));

    // Generate archive
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    
    // Store in Supabase Storage
    const fileName = `system_export_${exitJobId}_${Date.now()}.zip`;
    const filePath = `system-exports/${fileName}`;
    
    const uploadResult = await StorageService.uploadFile(
      'data-exports',
      filePath,
      zipBuffer,
      {
        contentType: 'application/zip',
        cacheControl: '3600',
        upsert: false
      }
    );

    return {
      filePath: uploadResult.path,
      fileSize: zipBuffer.length,
      checksum,
      fileName
    };
  }

  /**
   * Generate export documentation
   */
  generateExportDocumentation(exportData) {
    return `# Maritime Onboarding System - Complete Export

## Export Information
- **Export Date**: ${exportData.metadata.export_date}
- **Export Type**: ${exportData.metadata.export_type}
- **Requested By**: ${exportData.metadata.requested_by}
- **Export Version**: ${exportData.metadata.export_version}

## Data Included
${Object.keys(exportData.data).map(key => `- **${key}**: ${Array.isArray(exportData.data[key]) ? exportData.data[key].length + ' records' : 'Configuration data'}`).join('\n')}

## System Information
- **Application**: ${exportData.system_info.application.name} v${exportData.system_info.application.version}
- **Environment**: ${exportData.system_info.application.environment}
- **Database**: ${exportData.system_info.database.provider}

## Files Included
1. \`system_export.json\` - Complete system data export
2. \`migration_guide.md\` - Step-by-step migration instructions
3. \`data_dictionary.json\` - Data structure documentation
4. \`README.md\` - This documentation file

## Next Steps
1. Review the migration guide for detailed instructions
2. Validate data integrity using provided checksums
3. Follow the migration procedures in your target system
4. Verify all data has been successfully migrated
5. Securely delete this export package after successful migration

## Support
For migration assistance, contact: support@maritime-example.com
`;
  }

  /**
   * Generate migration guide
   */
  generateMigrationGuide() {
    return `# Migration Guide - Maritime Onboarding System

## Overview
This guide provides step-by-step instructions for migrating your Maritime Onboarding System data to a new platform.

## Pre-Migration Checklist
- [ ] Backup current system
- [ ] Verify export data integrity
- [ ] Prepare target system
- [ ] Schedule migration window
- [ ] Notify users of migration

## Migration Steps

### 1. Data Validation
\`\`\`bash
# Verify export file integrity
sha256sum system_export_*.zip
# Compare with provided checksum
\`\`\`

### 2. Extract Export Data
\`\`\`bash
unzip system_export_*.zip
\`\`\`

### 3. Database Migration
1. Create target database schema
2. Import user data from \`system_export.json\`
3. Import training content and configurations
4. Import audit logs and certificates

### 4. Configuration Migration
1. Review \`data_dictionary.json\` for data structure
2. Map configuration settings to target system
3. Update environment variables and secrets
4. Configure email templates and PDF templates

### 5. Validation
1. Verify user count matches export metadata
2. Test user authentication and access
3. Validate training progress and certificates
4. Check audit log integrity

### 6. Go-Live
1. Update DNS/routing to new system
2. Monitor system performance
3. Verify all functionality works correctly
4. Communicate successful migration to users

## Rollback Procedure
If migration fails:
1. Restore original system from backup
2. Update DNS/routing back to original system
3. Investigate migration issues
4. Plan retry with fixes

## Data Retention
- Keep export files for 90 days after successful migration
- Securely delete export files after retention period
- Maintain audit trail of migration process

## Support Contacts
- Technical Support: tech@maritime-example.com
- Migration Assistance: migration@maritime-example.com
`;
  }

  /**
   * Generate data dictionary
   */
  generateDataDictionary() {
    return {
      users: {
        description: 'User accounts and profiles',
        fields: {
          id: 'Unique user identifier',
          email: 'User email address',
          first_name: 'User first name',
          last_name: 'User last name',
          role: 'User role (admin, manager, crew)',
          created_at: 'Account creation timestamp'
        }
      },
      training_progress: {
        description: 'User training progress tracking',
        fields: {
          user_id: 'Reference to user',
          phase_id: 'Training phase identifier',
          status: 'Progress status',
          completed_at: 'Completion timestamp'
        }
      },
      certificates: {
        description: 'Training certificates issued',
        fields: {
          user_id: 'Certificate holder',
          certificate_type: 'Type of certificate',
          issued_at: 'Issue date',
          expires_at: 'Expiration date'
        }
      },
      audit_log: {
        description: 'System audit trail',
        fields: {
          user_id: 'User who performed action',
          action: 'Action performed',
          resource_type: 'Type of resource affected',
          created_at: 'Action timestamp'
        }
      }
    };
  }

  /**
   * Helper methods
   */
  async getTableCount(tableName) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) return 0;
    return count || 0;
  }

  async getTableData(tableName, columns = '*') {
    const { data, error } = await supabase
      .from(tableName)
      .select(Array.isArray(columns) ? columns.join(',') : columns);
    
    if (error) {
      console.warn(`Failed to collect ${tableName}:`, error.message);
      return [];
    }
    return data || [];
  }

  async updateExitJobStatus(exitJobId, status, errorMessage = null, metadata = {}) {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...metadata
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('exit_strategy_jobs')
      .update(updateData)
      .eq('id', exitJobId);

    if (error) {
      console.error('Failed to update exit job status:', error);
    }
  }

  async sendExitCompletionNotification(exitJob, packageResult) {
    try {
      await exitNotificationService.sendExportCompletionNotification(exitJob, packageResult);
    } catch (error) {
      console.error('Failed to send exit completion notification:', error);
    }
  }
}

// Export singleton instance
const exitStrategyService = new ExitStrategyService();

module.exports = {
  exitStrategyService,
  ExitStrategyService,
  EXIT_STATUS
};
