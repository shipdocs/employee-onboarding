#!/usr/bin/env node
/**
 * Apply Seed Script
 * 
 * This script applies seed data to the connected Supabase project.
 * It's primarily used for local development to create test data.
 * 
 * Usage:
 *   node scripts/apply-seed.js [seed-file]
 * 
 * Examples:
 *   node scripts/apply-seed.js                  # Applies all seed files
 *   node scripts/apply-seed.js admin-user.sql   # Applies only the admin user seed
 */

const fs = require('fs').promises;
const path = require('path');
const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Supabase connection details
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    console.log('⚠️  Warning: Running in CI environment without Supabase credentials');
    console.log('✅ Skipping seed data application for security reasons');
    console.log('📝 Note: This is expected behavior in CI/CD pipelines');
    process.exit(0);
  } else {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    process.exit(1);
  }
}

async function applySeed() {
  try {
    console.log('🌱 Applying seed data to Supabase...');
    console.log(`📍 Environment: ${supabaseUrl}`);

    // Production safety check
    if (supabaseUrl.includes('ocqnnyxnqaedarcohywe')) {
      if (!process.env.ALLOW_PRODUCTION_CHANGES) {
        console.error('🚨 PRODUCTION SAFETY: Set ALLOW_PRODUCTION_CHANGES=true to modify production database.');
        console.error('This is a safety measure to prevent accidental production changes.');
        process.exit(1);
      }
      console.log('⚠️ WARNING: Applying seed data to PRODUCTION environment');
      console.log('⚠️ Ensure you have a recent backup before proceeding');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get seed file(s) to apply
    const seedDir = path.join('supabase', 'seed');
    let seedFiles = [];
    
    // If a specific seed file is specified, use only that one
    if (process.argv.length > 2) {
      const specificSeed = process.argv[2];
      seedFiles = [path.join(seedDir, specificSeed)];
    } else {
      // Otherwise, get all SQL files in the seed directory
      const files = await fs.readdir(seedDir);
      seedFiles = files
        .filter(file => file.endsWith('.sql'))
        .map(file => path.join(seedDir, file));
    }
    
    if (seedFiles.length === 0) {
      console.log('⚠️ No seed files found');
      return { success: true, seedsApplied: 0 };
    }
    
    console.log(`📋 Found ${seedFiles.length} seed file(s) to apply`);
    
    // Apply each seed file
    let successCount = 0;
    
    for (const seedFile of seedFiles) {
      try {
        console.log(`🔄 Applying seed: ${path.basename(seedFile)}`);
        
        // Read the SQL content
        const sql = await fs.readFile(seedFile, 'utf8');
        
        // Execute the SQL using Supabase's rpc function
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.error(`❌ Error: The exec_sql RPC function does not exist in Supabase.`);
            console.error(`   Please create it first by running this SQL in your Supabase SQL Editor:`);
            console.error(`   CREATE OR REPLACE FUNCTION exec_sql(sql text)`);
            console.error(`   RETURNS void AS $$`);
            console.error(`   BEGIN`);
            console.error(`     EXECUTE sql;`);
            console.error(`   END;`);
            console.error(`   $$ LANGUAGE plpgsql SECURITY DEFINER;`);
            process.exit(1);
          }
          console.error(`❌ Error applying seed ${path.basename(seedFile)}: ${error.message}`);
          continue;
        }
        
        console.log(`✅ Successfully applied seed: ${path.basename(seedFile)}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Error processing seed ${path.basename(seedFile)}: ${err.message}`);
      }
    }
    
    console.log(`\n📊 Seed Application Summary:`);
    console.log(`✅ Successfully applied: ${successCount}/${seedFiles.length}`);
    
    return { success: true, seedsApplied: successCount };
  } catch (error) {
    console.error(`❌ Error applying seeds: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  applySeed();
}

module.exports = applySeed;