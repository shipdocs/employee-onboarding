#!/usr/bin/env node

/**
 * Apply Multilingual Migration Script
 * Runs the multilingual workflow system database migration
 */

import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('🚀 Starting multilingual workflow system migration...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250606115627_multilingual_workflow_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded, applying to database...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If rpc doesn't exist, try direct SQL execution
      console.log('📝 Executing migration SQL directly...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          if (statement.toLowerCase().includes('create table') || 
              statement.toLowerCase().includes('alter table') ||
              statement.toLowerCase().includes('create index') ||
              statement.toLowerCase().includes('create policy') ||
              statement.toLowerCase().includes('create function') ||
              statement.toLowerCase().includes('create trigger') ||
              statement.toLowerCase().includes('insert into') ||
              statement.toLowerCase().includes('create view')) {
            
            const { error: stmtError } = await supabase.rpc('exec_sql_statement', {
              statement: statement + ';'
            });

            if (stmtError) {
              console.warn(`⚠️  Warning executing statement: ${stmtError.message}`);
              console.log(`Statement: ${statement.substring(0, 100)}...`);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          console.warn(`⚠️  Error executing statement: ${err.message}`);
          errorCount++;
        }
      }

      console.log(`✅ Migration completed: ${successCount} successful, ${errorCount} warnings/errors`);
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Verify some key tables were created
    console.log('🔍 Verifying migration results...');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['translation_memory', 'maritime_terminology', 'translation_jobs']);

    if (tablesError) {
      console.warn('⚠️  Could not verify table creation:', tablesError.message);
    } else {
      console.log(`✅ Found ${tables.length} translation tables created`);
      tables.forEach(table => console.log(`  - ${table.table_name}`));
    }

    // Check if maritime terminology was populated
    const { data: terms, error: termsError } = await supabase
      .from('maritime_terminology')
      .select('term_key')
      .limit(5);

    if (termsError) {
      console.warn('⚠️  Could not verify terminology data:', termsError.message);
    } else {
      console.log(`✅ Found ${terms.length} maritime terms populated`);
      terms.forEach(term => console.log(`  - ${term.term_key}`));
    }

    console.log('🎉 Multilingual workflow system migration completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Set up LibreTranslate Docker service');
    console.log('  2. Create translation API endpoints');
    console.log('  3. Update workflow components for multilingual support');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigration();