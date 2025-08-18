#!/usr/bin/env node

/**
 * Fix Base Schema Inconsistencies
 * Updates the base schema to use correct status constraints
 */

const fs = require('fs');
const path = require('path');
const { safeScriptReadFile, safeScriptWriteFile, safeScriptPath, safeScriptFileExists } = require('../lib/security/scriptSecurity');

const MIGRATIONS_DIR = 'supabase/migrations';
const BASE_SCHEMA_FILE = '20250130000000_create_complete_schema.sql';

async function analyzeBaseSchemaIssues() {
  console.log('🔍 Analyzing Base Schema Issues...\n');

  const pathResult = safeScriptPath(MIGRATIONS_DIR, BASE_SCHEMA_FILE, 'migrations');
  if (!pathResult.isValid) {
    console.log(`❌ Invalid file path: ${pathResult.error}`);
    return null;
  }

  const fileExists = await safeScriptFileExists(pathResult.safePath, 'migrations');
  if (!fileExists) {
    console.log('❌ Base schema file not found');
    return null;
  }

  let content;
  try {
    content = await safeScriptReadFile(pathResult.safePath, 'migrations');
  } catch (error) {
    console.log(`❌ Failed to read base schema file: ${error.message}`);
    return null;
  }
  
  // Find the problematic status constraint
  const statusConstraintMatch = content.match(/status TEXT DEFAULT '[^']+' CHECK \(status IN \([^)]+\)\)/);
  
  if (statusConstraintMatch) {
    console.log('🚨 Found problematic status constraint:');
    console.log(`   ${statusConstraintMatch[0]}`);
    console.log('');
    
    // Extract the current status values
    const valuesMatch = statusConstraintMatch[0].match(/\(([^)]+)\)/);
    if (valuesMatch) {
      const currentValues = valuesMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
      console.log('📋 Current status values:');
      currentValues.forEach(value => {
        console.log(`      - '${value}'`);
      });
      console.log('');
    }
  }
  
  // Find admin user creation with wrong status
  const adminUserMatch = content.match(/status.*'active'/);
  if (adminUserMatch) {
    console.log('🚨 Found admin user with wrong status:');
    console.log(`   ${adminUserMatch[0]}`);
    console.log('');
  }
  
  return {
    content,
    hasStatusIssue: !!statusConstraintMatch,
    hasAdminIssue: !!adminUserMatch,
    statusConstraintMatch,
    adminUserMatch
  };
}

function createFixedBaseSchema() {
  console.log('🔧 Creating Fixed Base Schema...\n');
  
  const analysis = analyzeBaseSchemaIssues();
  if (!analysis) {
    return false;
  }
  
  let fixedContent = analysis.content;
  
  // Fix 1: Update status constraint to use new values
  const oldStatusConstraint = `status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'completed'))`;
  const newStatusConstraint = `status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'forms_completed', 'training_completed', 'fully_completed', 'suspended'))`;
  
  if (fixedContent.includes(oldStatusConstraint)) {
    fixedContent = fixedContent.replace(oldStatusConstraint, newStatusConstraint);
    console.log('✅ Fixed status constraint');
  }
  
  // Fix 2: Remove any admin user creation from base schema (should be separate)
  // The base schema shouldn't create specific users
  const adminUserSection = /-- Create admin user[\s\S]*?END\s*\$\$;/g;
  if (adminUserSection.test(fixedContent)) {
    fixedContent = fixedContent.replace(adminUserSection, '-- Admin user creation moved to separate migration');
    console.log('✅ Removed admin user creation from base schema');
  }
  
  // Fix 3: Add proper comments
  const commentToAdd = `
-- Status progression for users:
-- not_started -> in_progress -> forms_completed -> training_completed -> fully_completed
-- suspended (can be set at any time to disable account)
COMMENT ON COLUMN users.status IS 'Onboarding progression status: not_started -> in_progress -> forms_completed -> training_completed -> fully_completed (or suspended)';
`;
  
  // Add comment after users table creation
  const usersTableEnd = /CREATE TABLE IF NOT EXISTS users \([^;]+\);/;
  if (usersTableEnd.test(fixedContent)) {
    fixedContent = fixedContent.replace(usersTableEnd, (match) => match + commentToAdd);
    console.log('✅ Added status progression comment');
  }
  
  // Fix 4: Update header comment
  const headerComment = `-- Migration: 20250130000000_create_complete_schema
-- Created: 2025-01-30 00:00:00
-- Updated: 2025-06-10 (Fixed status constraints and removed admin user creation)
-- Description: Complete schema creation with correct status constraints
-- This migration creates ALL required tables and constraints with proper status values

/**
 * CONSOLIDATED BASE SCHEMA: Complete schema migration
 * This creates the full schema with correct status constraints
 * Safe to run multiple times (uses IF NOT EXISTS)
 * 
 * Status Values: not_started, in_progress, forms_completed, training_completed, fully_completed, suspended
 * Admin/Manager Status: fully_completed
 * Crew Default Status: not_started
 */`;
  
  // Replace the existing header
  fixedContent = fixedContent.replace(/^-- Migration:[\s\S]*?\*\//, headerComment);
  
  // Create the fixed file
  const fixedFilePath = path.join(MIGRATIONS_DIR, 'FIXED_' + BASE_SCHEMA_FILE);
  fs.writeFileSync(fixedFilePath, fixedContent);
  
  console.log(`✅ Created fixed base schema: FIXED_${BASE_SCHEMA_FILE}`);
  
  return {
    originalFile: BASE_SCHEMA_FILE,
    fixedFile: 'FIXED_' + BASE_SCHEMA_FILE,
    fixedContent
  };
}

function createConsolidatedUserManagement() {
  console.log('\n🔧 Creating Consolidated User Management Migration...\n');
  
  const userMgmtFiles = [
    '20250528160800_ensure_admin_user.sql',
    '20250528161500_fix_admin_password.sql',
    '20250602000000_fix_manager_permissions_schema.sql'
  ];
  
  let consolidatedContent = `-- Consolidated User Management Migration
-- Created: 2025-06-10
-- Description: Consolidated admin user creation and manager permissions
-- Combines: ensure_admin_user, fix_admin_password, fix_manager_permissions_schema

/**
 * This migration handles all user management setup:
 * 1. Creates admin user with correct status (fully_completed)
 * 2. Ensures proper manager permissions schema
 * 3. Sets up proper user management constraints
 */

`;
  
  userMgmtFiles.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      consolidatedContent += `-- ========================================\n`;
      consolidatedContent += `-- From: ${file}\n`;
      consolidatedContent += `-- ========================================\n\n`;
      
      // Fix admin user status from 'active' to 'fully_completed'
      let fixedContent = content;
      if (file.includes('ensure_admin_user')) {
        fixedContent = fixedContent.replace(/'active'/g, "'fully_completed'");
        console.log(`✅ Fixed admin user status in ${file}`);
      }
      
      consolidatedContent += fixedContent + '\n\n';
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  });
  
  consolidatedContent += `-- Migration completed successfully
SELECT 'Consolidated user management migration completed' as status;
`;
  
  const consolidatedFile = '20250610000000_consolidated_user_management.sql';
  const consolidatedPath = path.join(MIGRATIONS_DIR, consolidatedFile);
  fs.writeFileSync(consolidatedPath, consolidatedContent);
  
  console.log(`✅ Created consolidated user management: ${consolidatedFile}`);
  
  return consolidatedFile;
}

function validateFixes() {
  console.log('\n🔍 Validating Fixes...\n');
  
  const fixedBaseFile = path.join(MIGRATIONS_DIR, 'FIXED_' + BASE_SCHEMA_FILE);
  const consolidatedFile = path.join(MIGRATIONS_DIR, '20250610000000_consolidated_user_management.sql');
  
  const validations = [];
  
  // Validate fixed base schema
  if (fs.existsSync(fixedBaseFile)) {
    const content = fs.readFileSync(fixedBaseFile, 'utf8');
    
    // Check for correct status constraint
    const hasCorrectConstraint = content.includes("'not_started', 'in_progress', 'forms_completed', 'training_completed', 'fully_completed', 'suspended'");
    validations.push({
      test: 'Base schema has correct status constraint',
      passed: hasCorrectConstraint
    });
    
    // Check that admin user creation is removed
    const hasNoAdminUser = !content.includes("INSERT INTO users") || !content.includes("'active'");
    validations.push({
      test: 'Base schema has no admin user creation',
      passed: hasNoAdminUser
    });
  }
  
  // Validate consolidated user management
  if (fs.existsSync(consolidatedFile)) {
    const content = fs.readFileSync(consolidatedFile, 'utf8');
    
    // Check for correct admin status
    const hasCorrectAdminStatus = content.includes("'fully_completed'") && !content.includes("'active'");
    validations.push({
      test: 'Admin user has correct status (fully_completed)',
      passed: hasCorrectAdminStatus
    });
  }
  
  console.log('📊 Validation Results:');
  validations.forEach(validation => {
    const status = validation.passed ? '✅' : '❌';
    console.log(`   ${status} ${validation.test}`);
  });
  
  const allPassed = validations.every(v => v.passed);
  console.log(`\n🎯 Overall: ${allPassed ? '✅ All validations passed' : '❌ Some validations failed'}`);
  
  return { validations, allPassed };
}

// Main execution
function main() {
  console.log('🚀 Base Schema Fix Process Started\n');
  
  try {
    // Step 1: Analyze current issues
    const analysis = analyzeBaseSchemaIssues();
    
    if (!analysis) {
      throw new Error('Could not analyze base schema');
    }
    
    // Step 2: Create fixed base schema
    const fixResult = createFixedBaseSchema();
    
    if (!fixResult) {
      throw new Error('Could not create fixed base schema');
    }
    
    // Step 3: Create consolidated user management
    const consolidatedFile = createConsolidatedUserManagement();
    
    // Step 4: Validate fixes
    const validation = validateFixes();
    
    console.log('\n🎉 Base Schema Fix Completed!');
    console.log('\n📊 Summary:');
    console.log(`   Fixed base schema: FIXED_${BASE_SCHEMA_FILE}`);
    console.log(`   Consolidated user mgmt: ${consolidatedFile}`);
    console.log(`   Validations passed: ${validation.allPassed ? 'Yes' : 'No'}`);
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Review fixed files');
    console.log('   2. Test migrations on clean database');
    console.log('   3. Replace original files if tests pass');
    console.log('   4. Continue with remaining consolidations');
    
    return {
      success: true,
      fixedBaseSchema: fixResult,
      consolidatedUserMgmt: consolidatedFile,
      validation
    };
    
  } catch (error) {
    console.error('❌ Error during base schema fix:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main, analyzeBaseSchemaIssues, createFixedBaseSchema };
