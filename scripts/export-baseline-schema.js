#!/usr/bin/env node
/**
 * Export Baseline Schema Script
 * 
 * This script exports the schema from the production Supabase database
 * and creates a proper baseline migration file.
 * 
 * Usage:
 *   node scripts/export-baseline-schema.js
 * 
 * Prerequisites:
 *   - Supabase CLI installed and authenticated
 *   - Access to the production Supabase project
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const PRODUCTION_PROJECT_REF = 'ocqnnyxnqaedarcohywe';
const BASELINE_FILE = path.join('supabase', 'migrations', '01-baseline-schema.sql');

async function exportBaselineSchema() {
  try {
    console.log('🔄 Exporting baseline schema from production...');
    console.log(`📋 Production project: ${PRODUCTION_PROJECT_REF}`);
    
    // Check if Supabase CLI is available
    try {
      execSync('supabase --version', { stdio: 'pipe' });
    } catch (err) {
      console.error('❌ Supabase CLI not found. Please install it first:');
      console.error('   npm install -g supabase@1.200.3');
      process.exit(1);
    }
    
    // Link to production project first
    console.log('🔗 Linking to production project...');
    execSync(`supabase link --project-ref ${PRODUCTION_PROJECT_REF}`, { stdio: 'inherit' });

    // Export schema from production using the correct CLI syntax
    console.log('📤 Exporting schema...');
    const schemaOutput = execSync(
      `supabase db dump`,
      { encoding: 'utf8' }
    );
    
    // Create the baseline migration content
    const timestamp = new Date().toISOString();
    const baselineContent = `-- Migration: baseline_schema
-- Created at: ${timestamp}
-- Description: Initial baseline schema exported from production database

/**
 * This is the baseline schema exported from the production database.
 * It includes all tables, indexes, functions, triggers, and other database objects
 * that existed at the time of migration system setup.
 * 
 * This migration is idempotent and can be run multiple times safely.
 */

-- Enable necessary extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

${schemaOutput}

-- Log this migration
SELECT public.log_migration(
  '01-baseline-schema.sql',
  COALESCE(current_setting('app.environment', true), 'development'),
  current_user,
  'Baseline schema exported from production'
);
`;
    
    // Write the baseline schema file
    await fs.writeFile(BASELINE_FILE, baselineContent);
    
    console.log('✅ Baseline schema exported successfully!');
    console.log(`📁 File saved to: ${BASELINE_FILE}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Review the exported schema for any sensitive data');
    console.log('2. Test the migration locally with: npm run db:push');
    console.log('3. Commit the baseline schema to version control');
    
  } catch (error) {
    console.error('❌ Error exporting baseline schema:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('');
      console.error('🔐 Authentication error. Please run:');
      console.error('   supabase login');
    }
    
    if (error.message.includes('project not found')) {
      console.error('');
      console.error('🔍 Project not found. Please check:');
      console.error('   - You have access to the production project');
      console.error('   - The project reference is correct');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  exportBaselineSchema();
}

module.exports = exportBaselineSchema;
