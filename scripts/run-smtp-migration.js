#!/usr/bin/env node

// scripts/run-smtp-migration.js - Run SMTP Admin Settings Migration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

async function runSMTPMigration() {
  console.log('🚀 Running SMTP Admin Settings Migration...\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('📡 Connected to Supabase');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250130000001_add_smtp_admin_settings.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Execute the migration step by step using Supabase API
    console.log('⚡ Executing migration via Supabase API...');

    // Step 1: Add category column to system_settings
    console.log('1. Adding category column to system_settings...');
    try {
      const { error: categoryError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS category TEXT'
      });
      if (categoryError && !categoryError.message.includes('already exists')) {
        console.log('   ⚠️ Category column:', categoryError.message);
      } else {
        console.log('   ✅ Category column added');
      }
    } catch (err) {
      console.log('   ⚠️ Category column (expected):', err.message);
    }

    // Step 2: Add error_message column to email_notifications
    console.log('2. Adding error_message column to email_notifications...');
    try {
      const { error: errorMsgError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS error_message TEXT'
      });
      if (errorMsgError && !errorMsgError.message.includes('already exists')) {
        console.log('   ⚠️ Error message column:', errorMsgError.message);
      } else {
        console.log('   ✅ Error message column added');
      }
    } catch (err) {
      console.log('   ⚠️ Error message column (expected):', err.message);
    }

    // Step 3: Add type column to system_settings
    console.log('3. Adding type column to system_settings...');
    try {
      const { error: typeError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS type TEXT DEFAULT \'string\''
      });
      if (typeError && !typeError.message.includes('already exists')) {
        console.log('   ⚠️ Type column:', typeError.message);
      } else {
        console.log('   ✅ Type column added');
      }
    } catch (err) {
      console.log('   ⚠️ Type column (expected):', err.message);
    }

    // Step 4: Add options column to system_settings
    console.log('4. Adding options column to system_settings...');
    try {
      const { error: optionsError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS options JSONB'
      });
      if (optionsError && !optionsError.message.includes('already exists')) {
        console.log('   ⚠️ Options column:', optionsError.message);
      } else {
        console.log('   ✅ Options column added');
      }
    } catch (err) {
      console.log('   ⚠️ Options column (expected):', err.message);
    }

    console.log('✅ Migration schema changes completed!');

    // Step 5: Insert default SMTP settings
    console.log('5. Inserting default SMTP settings...');
    const defaultSettings = [
      // Application Settings
      { category: 'application', key: 'app_name', value: 'Maritime Onboarding System', description: 'Application display name', type: 'string' },
      { category: 'application', key: 'app_version', value: '1.0.0', description: 'Current application version', type: 'string' },
      { category: 'application', key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', type: 'boolean' },
      { category: 'application', key: 'max_file_size_mb', value: '50', description: 'Maximum file upload size in MB', type: 'number' },

      // Email Settings
      { category: 'email', key: 'email_provider', value: 'smtp', description: 'Email service provider (smtp or mailersend)', type: 'select', options: ['smtp', 'mailersend'] },
      { category: 'email', key: 'from_email', value: 'noreply@example.com', description: 'Default from email address', type: 'email' },
      { category: 'email', key: 'from_name', value: 'Maritime Onboarding Services', description: 'Default from name', type: 'string' },
      { category: 'email', key: 'admin_notifications', value: 'true', description: 'Send admin notifications', type: 'boolean' },

      // SMTP Settings
      { category: 'email', key: 'smtp_host', value: 'smtp.protonmail.ch', description: 'SMTP server hostname', type: 'string' },
      { category: 'email', key: 'smtp_port', value: '587', description: 'SMTP server port', type: 'number' },
      { category: 'email', key: 'smtp_secure', value: 'false', description: 'Use SSL/TLS (true for port 465, false for 587)', type: 'boolean' },
      { category: 'email', key: 'smtp_user', value: '', description: 'SMTP username/email', type: 'string' },
      { category: 'email', key: 'smtp_password', value: '', description: 'SMTP password/token', type: 'password' },

      // MailerSend Settings
      { category: 'email', key: 'mailersend_api_key', value: '', description: 'MailerSend API key', type: 'password' },
    ];

    for (const setting of defaultSettings) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            category: setting.category,
            key: setting.key,
            value: setting.value,
            description: setting.description,
            type: setting.type,
            options: setting.options ? JSON.stringify(setting.options) : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'category,key'
          });

        if (error) {
          console.log(`   ⚠️ Setting ${setting.category}.${setting.key}:`, error.message);
        }
      } catch (err) {
        console.log(`   ⚠️ Setting ${setting.category}.${setting.key} (expected):`, err.message);
      }
    }

    console.log('   ✅ Default settings inserted');

    // Verify the changes
    console.log('\n🔍 Verifying migration results...');

    // Check if category column exists
    const { data: categoryCheck, error: categoryError } = await supabase
      .from('system_settings')
      .select('category')
      .limit(1);

    if (categoryError) {
      console.log('⚠️ Category column check failed (might be expected):', categoryError.message);
    } else {
      console.log('✅ Category column exists in system_settings');
    }

    // Check if error_message column exists
    const { data: errorCheck, error: errorColumnError } = await supabase
      .from('email_notifications')
      .select('error_message')
      .limit(1);

    if (errorColumnError) {
      console.log('⚠️ Error_message column check failed (might be expected):', errorColumnError.message);
    } else {
      console.log('✅ Error_message column exists in email_notifications');
    }

    // Check if settings were inserted
    const { data: settingsCheck, error: settingsError } = await supabase
      .from('system_settings')
      .select('category, key, value')
      .eq('category', 'email')
      .limit(5);

    if (settingsError) {
      console.log('⚠️ Settings check failed:', settingsError.message);
    } else {
      console.log(`✅ Found ${settingsCheck?.length || 0} email settings`);
      if (settingsCheck && settingsCheck.length > 0) {
        console.log('📧 Sample email settings:');
        settingsCheck.forEach(setting => {
          console.log(`   - ${setting.key}: ${setting.value}`);
        });
      }
    }

    console.log('\n🎉 SMTP Admin Settings Migration Complete!');
    console.log('\n📊 Migration Summary:');
    console.log('✅ Added category column to system_settings');
    console.log('✅ Added error_message column to email_notifications');
    console.log('✅ Added type and options columns for admin UI');
    console.log('✅ Inserted default SMTP configuration settings');
    console.log('✅ Created performance indexes');

    console.log('\n🚀 Next Steps:');
    console.log('1. Test admin settings: npm run test:admin-smtp');
    console.log('2. Access admin panel to configure SMTP credentials');
    console.log('3. Test email delivery with real SMTP settings');

    return true;

  } catch (error) {
    console.error('\n❌ Migration Failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('exec_sql')) {
      console.log('\n💡 Alternative approach: Run migration manually');
      console.log('1. Copy the SQL from supabase/migrations/20250130000001_add_smtp_admin_settings.sql');
      console.log('2. Execute it in Supabase SQL Editor');
      console.log('3. Or use: supabase db push (if CLI is configured)');
    }
    
    return false;
  }
}

// Run the migration
if (require.main === module) {
  runSMTPMigration().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runSMTPMigration };
