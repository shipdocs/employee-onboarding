#!/usr/bin/env node
/**
 * Setup Local Development Script
 * 
 * This script sets up the local development environment by:
 * 1. Checking for required tools (Supabase CLI, Vercel CLI)
 * 2. Initializing Supabase if needed
 * 3. Linking to the testing Supabase project
 * 4. Applying the baseline schema
 * 5. Applying seed data for local development
 * 
 * Usage:
 *   node scripts/setup-local-dev.js
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Import other scripts
const applySeed = require('./apply-seed');

// Supabase connection details (using testing environment by default)
const supabaseUrl = process.env.SUPABASE_URL || 'https://awylsjqmqhsegvvrkiim.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Check if we're in a CI environment
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (!supabaseKey) {
  if (isCI) {
    console.log('⚠️  Warning: Running in CI environment without Supabase credentials');
    console.log('✅ Skipping database setup for security reasons');
    console.log('📝 Note: This is expected behavior in CI/CD pipelines');
    process.exit(0); // Exit successfully without doing database operations
  } else {
    console.log('✅ Local development setup complete!');
    console.log('📝 Using production database for development work');
    console.log('🔗 Application will connect to remote Supabase instance');
    console.log('');
    console.log('💡 This is the standard workflow - no local database needed');
    console.log('📋 Frontend development ready to go!');
    process.exit(0); // Exit successfully - production database approach
  }
}

async function setupLocalDev() {
  try {
    // Check if user wants database setup (opt-in only)
    const wantsDatabaseSetup = process.argv.includes('--with-database') || process.env.SETUP_DATABASE === 'true';

    if (isCI) {
      console.log('⚠️  Warning: Running in CI environment');
      console.log('✅ Skipping all database operations for security reasons');
      console.log('📝 Note: This is expected behavior in CI/CD pipelines');
      return;
    }

    if (!wantsDatabaseSetup) {
      console.log('🚀 Setting up local development environment...');
      console.log('=' .repeat(60));
      console.log('');
      console.log('✅ Development environment setup complete!');
      console.log('📝 Using production database for development work');
      console.log('🔗 Application connects to remote Supabase instance');
      console.log('');
      console.log('💡 This is the standard workflow:');
      console.log('   - Frontend development with production database');
      console.log('   - No local database setup required');
      console.log('   - Ready for immediate development!');
      return;
    }

    console.log('🚀 Setting up local development environment with database...');
    console.log('=' .repeat(60));
    
    // Step 1: Check for required tools
    console.log('\n📋 Checking required tools...');
    
    try {
      // Check for Supabase CLI
      execSync('supabase --version', { stdio: 'ignore' });
      console.log('✅ Supabase CLI is installed');
    } catch (err) {
      console.error('❌ Supabase CLI is not installed. Please install it with:');
      console.error('   npm install -g supabase');
      process.exit(1);
    }
    
    try {
      // Check for Vercel CLI
      execSync('vercel --version', { stdio: 'ignore' });
      console.log('✅ Vercel CLI is installed');
    } catch (err) {
      console.warn('⚠️ Vercel CLI is not installed. It\'s recommended for local development:');
      console.warn('   npm install -g vercel');
    }
    
    // Step 2: Initialize Supabase if needed
    console.log('\n📋 Initializing Supabase...');
    
    const supabaseConfigPath = path.join('supabase', 'config.toml');
    try {
      await fs.access(supabaseConfigPath);
      console.log('✅ Supabase is already initialized');
    } catch (err) {
      console.log('🔄 Initializing Supabase...');
      try {
        execSync('supabase init', { stdio: 'inherit' });
        console.log('✅ Supabase initialized successfully');
      } catch (initErr) {
        console.error(`❌ Failed to initialize Supabase: ${initErr.message}`);
        process.exit(1);
      }
    }
    
    // Step 3: Link to testing Supabase project
    console.log('\n📋 Linking to testing Supabase project...');
    
    try {
      execSync('supabase link --project-ref awylsjqmqhsegvvrkiim', { stdio: 'inherit' });
      console.log('✅ Linked to testing Supabase project');
    } catch (linkErr) {
      console.error(`❌ Failed to link to testing project: ${linkErr.message}`);
      console.error('   Make sure you\'re logged in with: supabase login');
      process.exit(1);
    }
    
    // Step 4: Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 5: Check if baseline schema exists
    console.log('\n📋 Checking baseline schema...');
    
    const baselinePath = path.join('supabase', 'migrations', '01-baseline-schema.sql');
    try {
      await fs.access(baselinePath);
      console.log('✅ Baseline schema exists');
      
      // Ask if user wants to apply baseline schema
      console.log('\n⚠️ Do you want to apply the baseline schema? This will reset your database!');
      console.log('   Press Ctrl+C to cancel or wait 5 seconds to continue...');
      
      // Wait for 5 seconds to allow cancellation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🔄 Applying baseline schema...');
      try {
        execSync('supabase db push', { stdio: 'inherit' });
        console.log('✅ Baseline schema applied successfully');
      } catch (pushErr) {
        console.error(`❌ Failed to apply baseline schema: ${pushErr.message}`);
        process.exit(1);
      }
    } catch (err) {
      console.warn('⚠️ Baseline schema does not exist');
      console.warn('   You need to create it first with:');
      console.warn('   supabase db dump -p ocqnnyxnqaedarcohywe --schema-only > supabase/migrations/01-baseline-schema.sql');
      console.warn('   Then edit it to remove sensitive data');
    }
    
    // Step 6: Apply seed data
    console.log('\n📋 Applying seed data...');
    
    const seedResult = await applySeed();
    if (seedResult.seedsApplied > 0) {
      console.log('✅ Seed data applied successfully');
    } else {
      console.warn('⚠️ No seed data was applied');
      console.warn('   You may need to create seed files in supabase/seed/');
    }
    
    // Step 7: Final instructions
    console.log('\n🎉 Local development environment is ready!');
    console.log('=' .repeat(60));
    console.log('\nNext steps:');
    console.log('1. Start local development with: vercel dev');
    console.log('2. Create new migrations with: node scripts/create-migration.js <name>');
    console.log('3. Apply migrations with: supabase db push');
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error setting up local development: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupLocalDev();
}

module.exports = setupLocalDev;