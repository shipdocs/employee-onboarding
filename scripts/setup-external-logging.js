#!/usr/bin/env node

/**
 * Setup script for external logging configuration
 * Can be used to configure external logging via environment variables
 * Run: node scripts/setup-external-logging.js
 */

const db = require('../lib/database-direct');
const crypto = require('crypto');

async function setupExternalLogging() {
  console.log('Setting up external logging configuration...');

  // Check for environment variables
  const config = {
    enabled: process.env.EXTERNAL_LOGGING_ENABLED === 'true',
    endpoint_url: process.env.GRAFANA_CLOUD_URL || process.env.EXTERNAL_LOGGING_URL,
    api_user: process.env.GRAFANA_CLOUD_USER || process.env.EXTERNAL_LOGGING_USER,
    api_key: process.env.GRAFANA_CLOUD_API_KEY || process.env.EXTERNAL_LOGGING_API_KEY,
    log_level: process.env.EXTERNAL_LOGGING_LEVEL || 'warn',
    include_security_events: process.env.EXTERNAL_LOGGING_SECURITY !== 'false',
    include_auth_events: process.env.EXTERNAL_LOGGING_AUTH !== 'false',
    include_error_logs: process.env.EXTERNAL_LOGGING_ERRORS !== 'false',
    include_audit_logs: process.env.EXTERNAL_LOGGING_AUDIT === 'true',
    max_logs_per_minute: parseInt(process.env.EXTERNAL_LOGGING_RATE_LIMIT) || 100
  };

  // Check if any configuration is provided
  if (!config.endpoint_url && !config.api_key) {
    console.log('No external logging configuration found in environment variables.');
    console.log('\nTo configure external logging, set these environment variables:');
    console.log('  EXTERNAL_LOGGING_ENABLED=true');
    console.log('  GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net');
    console.log('  GRAFANA_CLOUD_USER=<your-user-id>');
    console.log('  GRAFANA_CLOUD_API_KEY=<your-api-key>');
    console.log('\nOptional settings:');
    console.log('  EXTERNAL_LOGGING_LEVEL=warn|error|info|debug');
    console.log('  EXTERNAL_LOGGING_SECURITY=true|false');
    console.log('  EXTERNAL_LOGGING_AUTH=true|false');
    console.log('  EXTERNAL_LOGGING_ERRORS=true|false');
    console.log('  EXTERNAL_LOGGING_AUDIT=true|false');
    console.log('  EXTERNAL_LOGGING_RATE_LIMIT=100');
    console.log('  EXTERNAL_LOG_ENCRYPTION_KEY=<32-char-key>');
    return;
  }

  try {
    // Encrypt API key if provided
    let encryptedApiKey = null;
    if (config.api_key) {
      const encryptionKey = process.env.EXTERNAL_LOG_ENCRYPTION_KEY || 
                           process.env.JWT_SECRET?.substring(0, 32) || 
                           'default-encryption-key-change-me';
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey.padEnd(32, '0').substring(0, 32)),
        iv
      );
      let encrypted = cipher.update(config.api_key);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      encryptedApiKey = iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    // Check if configuration already exists
    const existing = await db.query(
      'SELECT * FROM external_logging_config WHERE provider = $1',
      ['grafana_cloud']
    );

    if (existing.rows.length > 0) {
      // Update existing configuration
      await db.query(
        `UPDATE external_logging_config 
         SET enabled = $1,
             endpoint_url = COALESCE($2, endpoint_url),
             api_user = COALESCE($3, api_user),
             api_key_encrypted = COALESCE($4, api_key_encrypted),
             log_level = $5,
             include_security_events = $6,
             include_auth_events = $7,
             include_error_logs = $8,
             include_audit_logs = $9,
             max_logs_per_minute = $10,
             configured_by = 'setup_script',
             last_modified_at = NOW()
         WHERE provider = $11`,
        [
          config.enabled,
          config.endpoint_url,
          config.api_user,
          encryptedApiKey,
          config.log_level,
          config.include_security_events,
          config.include_auth_events,
          config.include_error_logs,
          config.include_audit_logs,
          config.max_logs_per_minute,
          'grafana_cloud'
        ]
      );
      console.log('✅ External logging configuration updated successfully');
    } else {
      // Insert new configuration
      await db.query(
        `INSERT INTO external_logging_config (
          provider,
          enabled,
          endpoint_url,
          api_user,
          api_key_encrypted,
          log_level,
          include_security_events,
          include_auth_events,
          include_error_logs,
          include_audit_logs,
          max_logs_per_minute,
          configured_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          'grafana_cloud',
          config.enabled,
          config.endpoint_url,
          config.api_user,
          encryptedApiKey,
          config.log_level,
          config.include_security_events,
          config.include_auth_events,
          config.include_error_logs,
          config.include_audit_logs,
          config.max_logs_per_minute,
          'setup_script'
        ]
      );
      console.log('✅ External logging configuration created successfully');
    }

    // Log audit event
    await db.query(
      `INSERT INTO external_logging_audit 
       (action, provider, changed_by, new_config)
       VALUES ($1, $2, $3, $4)`,
      [
        config.enabled ? 'configured' : 'disabled',
        'grafana_cloud',
        'setup_script',
        JSON.stringify(config)
      ]
    );

    console.log('\nConfiguration summary:');
    console.log(`  Provider: Grafana Cloud`);
    console.log(`  Enabled: ${config.enabled}`);
    console.log(`  Endpoint: ${config.endpoint_url || 'Not set'}`);
    console.log(`  User: ${config.api_user || 'Not set'}`);
    console.log(`  API Key: ${config.api_key ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Log Level: ${config.log_level}`);
    console.log(`  Security Events: ${config.include_security_events}`);
    console.log(`  Auth Events: ${config.include_auth_events}`);
    console.log(`  Error Logs: ${config.include_error_logs}`);
    console.log(`  Audit Logs: ${config.include_audit_logs}`);
    console.log(`  Rate Limit: ${config.max_logs_per_minute} logs/minute`);

    if (config.enabled && config.api_key) {
      console.log('\n🚀 External logging is now active!');
      console.log('Logs will be sent to Grafana Cloud based on your configuration.');
    } else if (!config.enabled) {
      console.log('\n⚠️  External logging is configured but not enabled.');
      console.log('Set EXTERNAL_LOGGING_ENABLED=true to activate.');
    } else if (!config.api_key) {
      console.log('\n⚠️  External logging is missing API key.');
      console.log('Set GRAFANA_CLOUD_API_KEY to complete configuration.');
    }

  } catch (error) {
    console.error('❌ Failed to setup external logging:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run setup
setupExternalLogging().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});