#!/usr/bin/env node
/**
 * Migration Rollback Script
 * 
 * This script helps create and apply rollback migrations.
 * 
 * Usage:
 *   node scripts/rollback-migration.js create <migration-name>
 *   node scripts/rollback-migration.js apply <rollback-migration-file>
 *   node scripts/rollback-migration.js list
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createRollbackMigration(originalMigrationName) {
  try {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const rollbackName = `${timestamp}_rollback_${originalMigrationName}`;
    const rollbackFile = path.join('supabase', 'migrations', `${rollbackName}.sql`);

    const rollbackTemplate = `-- Rollback Migration: ${originalMigrationName}
-- Created at: ${new Date().toISOString()}
-- Description: Rollback for ${originalMigrationName}

/**
 * ROLLBACK MIGRATION
 * 
 * This migration rolls back changes made by: ${originalMigrationName}
 * 
 * IMPORTANT: 
 * - Review the original migration before applying this rollback
 * - Test this rollback in a non-production environment first
 * - Consider data loss implications
 * - Have a backup before applying to production
 */

-- Add your rollback SQL statements here:
-- Example:
-- DROP TABLE IF EXISTS new_table;
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Log this rollback migration
SELECT public.log_migration(
  '${rollbackName}.sql',
  COALESCE(current_setting('app.environment', true), 'development'),
  current_user,
  'Rollback migration for ${originalMigrationName}'
);
`;

    await fs.writeFile(rollbackFile, rollbackTemplate);
    console.log(`✅ Created rollback migration: ${rollbackFile}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Edit the rollback migration file to add your rollback SQL');
    console.log('2. Test the rollback in a non-production environment');
    console.log('3. Apply with: node scripts/rollback-migration.js apply ' + path.basename(rollbackFile));

  } catch (error) {
    console.error(`❌ Error creating rollback migration: ${error.message}`);
    process.exit(1);
  }
}

async function applyRollbackMigration(rollbackFile) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
      process.exit(1);
    }

    // Production safety check - removed reference to wrong project
    // Note: Production project ID reference removed as it was incorrect
    if (supabaseUrl.includes('production-project-id-placeholder')) {
      if (!process.env.ALLOW_PRODUCTION_CHANGES) {
        console.error('🚨 PRODUCTION SAFETY: Set ALLOW_PRODUCTION_CHANGES=true to apply rollback to production.');
        console.error('This is a safety measure to prevent accidental production changes.');
        process.exit(1);
      }
      console.log('⚠️ WARNING: Applying ROLLBACK to PRODUCTION environment');
      console.log('⚠️ Ensure you have a recent backup before proceeding');
    }

    const rollbackPath = path.join('supabase', 'migrations', rollbackFile);
    const rollbackExists = await fs.access(rollbackPath).then(() => true).catch(() => false);

    if (!rollbackExists) {
      console.error(`❌ Rollback migration file not found: ${rollbackPath}`);
      process.exit(1);
    }

    console.log(`🔄 Applying rollback migration: ${rollbackFile}`);
    console.log(`📍 Environment: ${supabaseUrl}`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sql = await fs.readFile(rollbackPath, 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`❌ Error applying rollback: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Rollback migration applied successfully: ${rollbackFile}`);

  } catch (error) {
    console.error(`❌ Error applying rollback migration: ${error.message}`);
    process.exit(1);
  }
}

async function listMigrations() {
  try {
    const migrationsDir = path.join('supabase', 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    const migrations = files
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('📋 Available migrations:');
    console.log('');

    const rollbacks = migrations.filter(file => file.includes('rollback'));
    const regular = migrations.filter(file => !file.includes('rollback'));

    console.log('🔄 Regular migrations:');
    regular.forEach(file => {
      console.log(`  ${file}`);
    });

    if (rollbacks.length > 0) {
      console.log('');
      console.log('↩️ Rollback migrations:');
      rollbacks.forEach(file => {
        console.log(`  ${file}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error listing migrations: ${error.message}`);
    process.exit(1);
  }
}

function showUsage() {
  console.log('↩️ Migration Rollback Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/rollback-migration.js create <migration-name>');
  console.log('  node scripts/rollback-migration.js apply <rollback-file>');
  console.log('  node scripts/rollback-migration.js list');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/rollback-migration.js create add_user_preferences');
  console.log('  node scripts/rollback-migration.js apply 20250528120000_rollback_add_user_preferences.sql');
  console.log('  node scripts/rollback-migration.js list');
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  const argument = process.argv[3];

  switch (command) {
    case 'create':
      if (!argument) {
        console.error('❌ Error: Migration name is required');
        showUsage();
        process.exit(1);
      }
      createRollbackMigration(argument);
      break;

    case 'apply':
      if (!argument) {
        console.error('❌ Error: Rollback file name is required');
        showUsage();
        process.exit(1);
      }
      applyRollbackMigration(argument);
      break;

    case 'list':
      listMigrations();
      break;

    default:
      showUsage();
      process.exit(1);
  }
}

module.exports = { createRollbackMigration, applyRollbackMigration, listMigrations };
