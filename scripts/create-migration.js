#!/usr/bin/env node
/**
 * Create Migration Script
 * 
 * This script creates a new migration file with a timestamp prefix
 * and the provided description.
 * 
 * Usage:
 *   node scripts/create-migration.js add_new_feature
 * 
 * Output:
 *   Creates a file like: supabase/migrations/20250528123456_add_new_feature.sql
 */

const fs = require('fs').promises;
const path = require('path');

async function createMigration() {
  try {
    // Get migration name from command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('❌ Error: Migration name is required');
      console.log('Usage: node scripts/create-migration.js <migration_name>');
      process.exit(1);
    }

    // Format the migration name (convert spaces to underscores, lowercase)
    const migrationName = args[0].toLowerCase().replace(/\s+/g, '_');
    
    // Create timestamp (YYYYMMDDHHmmss format)
    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    
    // Create file name
    const fileName = `${timestamp}_${migrationName}.sql`;
    const filePath = path.join('supabase', 'migrations', fileName);
    
    // Create migration directory if it doesn't exist
    await fs.mkdir(path.join('supabase', 'migrations'), { recursive: true });
    
    // Create migration file with template content
    const templateContent = `-- Migration: ${migrationName}
-- Created at: ${now.toISOString()}
-- Description: 

/**
 * IMPORTANT: 
 * - Keep migrations idempotent when possible (use IF NOT EXISTS, etc.)
 * - Add comments explaining complex changes
 * - Consider rollback strategy for destructive changes
 */

-- Your SQL statements here:

`;
    
    await fs.writeFile(filePath, templateContent);
    
    console.log(`✅ Created migration file: ${filePath}`);
    console.log('📝 Edit this file to add your SQL statements');
    
    return { success: true, filePath };
  } catch (error) {
    console.error(`❌ Error creating migration: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createMigration();
}

module.exports = createMigration;