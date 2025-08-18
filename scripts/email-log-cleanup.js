#!/usr/bin/env node

/**
 * Email Log Cleanup Script
 * Automated data retention enforcement for email logging compliance
 * 
 * Usage:
 *   node scripts/email-log-cleanup.js [options]
 * 
 * Options:
 *   --dry-run          Perform a dry run (count records without deleting)
 *   --batch-size=N     Number of records to process per batch (default: 1000)
 *   --max-batches=N    Maximum number of batches to process (default: 10)
 *   --force            Force cleanup even if not due
 *   --status           Show retention status only
 *   --help             Show this help message
 * 
 * Environment Variables:
 *   EMAIL_CLEANUP_ENABLED=true/false     Enable/disable cleanup (default: true)
 *   EMAIL_CLEANUP_BATCH_SIZE=N           Default batch size
 *   EMAIL_CLEANUP_MAX_BATCHES=N          Default max batches
 *   EMAIL_CLEANUP_INTERVAL_HOURS=N       Hours between cleanups (default: 24)
 */

const { emailLogCleanupService } = require('../lib/emailLogCleanupService');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    batchSize: null,
    maxBatches: null,
    force: false,
    status: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--status') {
      options.status = true;
    } else if (arg === '--help') {
      options.help = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-batches=')) {
      options.maxBatches = parseInt(arg.split('=')[1]);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
📧 Email Log Cleanup Script

DESCRIPTION:
  Automated data retention enforcement for email logging compliance.
  Removes expired email logs based on retention categories.

USAGE:
  node scripts/email-log-cleanup.js [options]

OPTIONS:
  --dry-run              Perform a dry run (count records without deleting)
  --batch-size=N         Number of records to process per batch (default: 1000)
  --max-batches=N        Maximum number of batches to process (default: 10)
  --force                Force cleanup even if not due
  --status               Show retention status only
  --help                 Show this help message

RETENTION CATEGORIES:
  minimal     30 days    - Non-critical emails
  standard    90 days    - Normal business emails (default)
  extended    365 days   - Important notifications
  permanent   never      - Critical audit records

ENVIRONMENT VARIABLES:
  EMAIL_CLEANUP_ENABLED=true/false     Enable/disable cleanup (default: true)
  EMAIL_CLEANUP_BATCH_SIZE=N           Default batch size
  EMAIL_CLEANUP_MAX_BATCHES=N          Default max batches
  EMAIL_CLEANUP_INTERVAL_HOURS=N       Hours between cleanups (default: 24)

EXAMPLES:
  # Show current retention status
  node scripts/email-log-cleanup.js --status

  # Perform a dry run to see what would be deleted
  node scripts/email-log-cleanup.js --dry-run

  # Run cleanup with custom batch size
  node scripts/email-log-cleanup.js --batch-size=500

  # Force cleanup even if not due
  node scripts/email-log-cleanup.js --force

SCHEDULING:
  Add to crontab for daily execution:
  0 2 * * * cd /path/to/project && node scripts/email-log-cleanup.js

  Or use with PM2 ecosystem:
  pm2 start scripts/email-log-cleanup.js --cron "0 2 * * *"
`);
}

// Show retention status
async function showRetentionStatus() {
  console.log('📊 Email Log Retention Status\n');
  
  try {
    const status = await emailLogCleanupService.getRetentionStatus();
    
    if (!status.success) {
      console.error('❌ Failed to get retention status:', status.error);
      return false;
    }

    if (!status.status || status.status.length === 0) {
      console.log('ℹ️  No email logs found in database');
      return true;
    }

    // Display status in a table format
    console.log('Table                | Category  | Total | Permanent | Expired | Active | Oldest Record       | Newest Record');
    console.log('---------------------|-----------|-------|-----------|---------|--------|---------------------|-------------------');
    
    for (const row of status.status) {
      const table = row.table_name.padEnd(20);
      const category = (row.retention_category || 'N/A').padEnd(9);
      const total = row.total_records.toString().padStart(5);
      const permanent = row.permanent_records.toString().padStart(9);
      const expired = row.expired_records.toString().padStart(7);
      const active = row.active_records.toString().padStart(6);
      const oldest = row.oldest_record ? new Date(row.oldest_record).toISOString().substring(0, 19) : 'N/A'.padEnd(19);
      const newest = row.newest_record ? new Date(row.newest_record).toISOString().substring(0, 19) : 'N/A'.padEnd(19);
      
      console.log(`${table} | ${category} | ${total} | ${permanent} | ${expired} | ${active} | ${oldest} | ${newest}`);
    }

    console.log('\n📋 Summary:');
    const totalRecords = status.status.reduce((sum, row) => sum + row.total_records, 0);
    const totalExpired = status.status.reduce((sum, row) => sum + row.expired_records, 0);
    
    console.log(`   Total email logs: ${totalRecords}`);
    console.log(`   Expired logs: ${totalExpired}`);
    console.log(`   Cleanup needed: ${totalExpired > 0 ? 'Yes' : 'No'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error getting retention status:', error);
    return false;
  }
}

// Run cleanup
async function runCleanup(options) {
  console.log('🧹 Starting Email Log Cleanup\n');
  
  const cleanupOptions = {
    dryRun: options.dryRun,
    defaultBatchSize: options.batchSize,
    defaultMaxBatches: options.maxBatches,
    enableCleanup: true
  };

  try {
    const result = await emailLogCleanupService.runCleanup(cleanupOptions);
    
    if (!result.success) {
      console.error('❌ Cleanup failed:', result.error || result.reason);
      return false;
    }

    console.log('✅ Cleanup completed successfully\n');
    console.log('📊 Results:');
    console.log(`   Duration: ${result.duration_ms}ms`);
    console.log(`   Total deleted: ${result.total_deleted} records`);
    console.log(`   Tables processed: ${result.tables_processed}`);
    console.log(`   Dry run: ${result.dry_run ? 'Yes' : 'No'}`);
    
    if (result.details && result.details.length > 0) {
      console.log('\n📋 Details:');
      for (const detail of result.details) {
        console.log(`   ${detail.table_name}: ${detail.deleted_count} records (${detail.batch_count} batches)`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return false;
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('📧 Email Log Cleanup Service');
  console.log('============================\n');

  // Show current configuration
  const config = emailLogCleanupService.getConfig();
  console.log('⚙️  Configuration:');
  console.log(`   Cleanup enabled: ${config.enableCleanup}`);
  console.log(`   Batch size: ${options.batchSize || config.defaultBatchSize}`);
  console.log(`   Max batches: ${options.maxBatches || config.defaultMaxBatches}`);
  console.log(`   Cleanup interval: ${config.cleanupInterval} hours`);
  console.log(`   Dry run: ${options.dryRun}\n`);

  // Show retention status if requested
  if (options.status) {
    const success = await showRetentionStatus();
    process.exit(success ? 0 : 1);
  }

  // Run cleanup
  const success = await runCleanup(options);
  process.exit(success ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main, showRetentionStatus, runCleanup };
