#!/usr/bin/env node

/**
 * Verify that the auth schema matches code expectations
 * Run with: node scripts/verify-auth-schema.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'employee_onboarding'
});

async function verifySchema() {
  console.log('🔍 Verifying auth schema alignment...\n');
  
  const issues = [];
  const successes = [];

  try {
    // Check token_blacklist columns
    console.log('📋 Checking token_blacklist table...');
    const blacklistColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'token_blacklist' 
      ORDER BY ordinal_position
    `);
    
    const blacklistCols = blacklistColumns.rows.map(r => r.column_name);
    const requiredBlacklistCols = ['token_jti', 'token_hash', 'user_id', 'ip_address', 'user_agent', 'expires_at', 'reason'];
    
    for (const col of requiredBlacklistCols) {
      if (blacklistCols.includes(col)) {
        successes.push(`✅ token_blacklist.${col} exists`);
      } else {
        issues.push(`❌ token_blacklist.${col} is missing`);
      }
    }

    // Check refresh_tokens columns
    console.log('\n📋 Checking refresh_tokens table...');
    const refreshColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'refresh_tokens' 
      ORDER BY ordinal_position
    `);
    
    const refreshCols = refreshColumns.rows.map(r => r.column_name);
    const requiredRefreshCols = ['token_hash', 'user_id', 'is_active', 'expires_at', 'device_info'];
    
    for (const col of requiredRefreshCols) {
      if (refreshCols.includes(col)) {
        successes.push(`✅ refresh_tokens.${col} exists`);
      } else {
        issues.push(`❌ refresh_tokens.${col} is missing`);
      }
    }

    // Check indexes
    console.log('\n📋 Checking indexes...');
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('token_blacklist', 'refresh_tokens')
    `);
    
    const indexNames = indexes.rows.map(r => r.indexname);
    const requiredIndexes = [
      'idx_token_blacklist_token_jti',
      'idx_token_blacklist_user_id',
      'idx_refresh_tokens_is_active'
    ];
    
    for (const idx of requiredIndexes) {
      if (indexNames.includes(idx)) {
        successes.push(`✅ Index ${idx} exists`);
      } else {
        issues.push(`❌ Index ${idx} is missing`);
      }
    }

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(50));
    
    if (successes.length > 0) {
      console.log('\n✅ Successful checks:');
      successes.forEach(s => console.log('  ' + s));
    }
    
    if (issues.length > 0) {
      console.log('\n❌ Issues found:');
      issues.forEach(i => console.log('  ' + i));
      console.log('\n⚠️  Run the migration to fix these issues:');
      console.log('  cd database/migrations && ./apply-migration.sh');
    } else {
      console.log('\n🎉 All schema requirements are met! Auth system should work correctly.');
    }
    
    console.log('\n' + '='.repeat(50));
    
    process.exit(issues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();