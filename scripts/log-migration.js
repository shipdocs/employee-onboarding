#!/usr/bin/env node
/**
 * Log Migration Script
 * 
 * This script logs migration applications to the migration_logs table.
 * It's used by GitHub Actions and can also be run manually.
 * 
 * Environment Variables:
 *   MIGRATION_NAME - Name of the migration
 *   ENVIRONMENT - Environment name (testing, preview, production)
 *   APPLIED_BY - Who applied the migration
 *   NOTES - Additional notes
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function logMigration() {
  try {
    // Get environment variables
    const migrationName = process.env.MIGRATION_NAME || 'Unknown Migration';
    const environment = process.env.ENVIRONMENT || 'unknown';
    const appliedBy = process.env.APPLIED_BY || 'unknown';
    const notes = process.env.NOTES || '';
    const supabaseUrl = process.env.SUPABASE_URL;

    // Try environment-specific key first, then fallback to generic key
    const serviceKeyEnvVar = `SUPABASE_SERVICE_ROLE_KEY_${environment.toUpperCase()}`;
    const supabaseKey = process.env[serviceKeyEnvVar] || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error(`❌ Error: SUPABASE_URL and ${serviceKeyEnvVar} (or SUPABASE_SERVICE_ROLE_KEY) environment variables are required`);
      process.exit(1);
    }

    console.log(`🔑 Using service key from ${serviceKeyEnvVar}`);

    console.log(`📝 Logging migration: ${migrationName}`);
    console.log(`🌍 Environment: ${environment}`);
    console.log(`👤 Applied by: ${appliedBy}`);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if migration_logs table exists and create if needed
    try {
      const { error: checkError } = await supabase.rpc('exec_sql', { 
        sql: "SELECT to_regclass('public.migration_logs')" 
      });
      
      if (checkError) {
        console.log('📋 Migration logs table does not exist yet. Creating it...');
        const { error: createError } = await supabase.rpc('exec_sql', { 
          sql: `CREATE TABLE IF NOT EXISTS public.migration_logs (
            id SERIAL PRIMARY KEY,
            migration_name TEXT NOT NULL,
            environment TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW(),
            applied_by TEXT,
            notes TEXT
          );`
        });
        
        if (createError) {
          throw createError;
        }
        console.log('✅ Migration logs table created');
      }
    } catch (err) {
      console.warn('⚠️ Could not check/create migration_logs table:', err.message);
      console.log('📝 Attempting to log migration anyway...');
    }

    // Log the migration
    const { error } = await supabase.from('migration_logs').insert({
      migration_name: migrationName,
      environment: environment,
      applied_by: appliedBy,
      notes: notes
    });

    if (error) {
      throw error;
    }

    console.log('✅ Migration logged successfully');
  } catch (err) {
    console.error('❌ Error logging migration:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  logMigration();
}

module.exports = logMigration;
