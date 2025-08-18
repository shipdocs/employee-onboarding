#!/usr/bin/env node

/**
 * Migration Cleanup Script
 * Phase 1: Remove duplicate and test migration files
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = 'supabase/migrations';
const BACKUP_DIR = 'migration-backup';

function createBackup() {
  console.log('📦 Creating backup of migration files...\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR);
  let backedUp = 0;
  
  files.forEach(file => {
    if (file.endsWith('.sql')) {
      const sourcePath = path.join(MIGRATIONS_DIR, file);
      const backupPath = path.join(BACKUP_DIR, file);
      fs.copyFileSync(sourcePath, backupPath);
      backedUp++;
    }
  });
  
  console.log(`✅ Backed up ${backedUp} migration files to ${BACKUP_DIR}/`);
  return backedUp;
}

function removeProblematicFiles() {
  console.log('\n🧹 Removing problematic migration files...\n');
  
  const filesToRemove = [
    // Duplicate remote schema files
    '20250528070308_remote_schema.sql',  // Empty placeholder
    '20250528071902_remote_schema.sql',  // Another placeholder
    
    // Test migration file
    '20250528125150_test_migration_system.sql'
  ];
  
  const removed = [];
  const notFound = [];
  
  filesToRemove.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    
    if (fs.existsSync(filePath)) {
      // Show file content before removal
      console.log(`📄 Removing: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
      console.log(`   Size: ${sizeKB} KB, Lines: ${lines}`);
      console.log(`   Content preview: ${content.substring(0, 100)}...`);
      
      // Remove the file
      fs.unlinkSync(filePath);
      removed.push(file);
      console.log(`   ✅ Removed successfully\n`);
    } else {
      notFound.push(file);
      console.log(`   ⚠️  File not found: ${file}\n`);
    }
  });
  
  console.log('📊 Removal Summary:');
  console.log(`   Successfully removed: ${removed.length} files`);
  console.log(`   Not found: ${notFound.length} files`);
  
  if (removed.length > 0) {
    console.log('\n✅ Removed files:');
    removed.forEach(file => console.log(`      - ${file}`));
  }
  
  if (notFound.length > 0) {
    console.log('\n⚠️  Files not found:');
    notFound.forEach(file => console.log(`      - ${file}`));
  }
  
  return { removed, notFound };
}

function analyzeRemainingFiles() {
  console.log('\n🔍 Analyzing remaining migration files...\n');
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
    
  console.log(`📊 Remaining files: ${files.length}`);
  
  files.forEach((file, index) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`   ${index + 1}. ${file} (${sizeKB} KB)`);
  });
  
  return files;
}

function identifyConsolidationCandidates() {
  console.log('\n🎯 Identifying consolidation candidates...\n');
  
  const candidates = {
    baseSchema: [
      '20250130000000_create_complete_schema.sql'  // Needs updating
    ],
    userManagement: [
      '20250528160800_ensure_admin_user.sql',      // Admin user creation
      '20250528161500_fix_admin_password.sql',     // Admin password fix
      '20250602000000_fix_manager_permissions_schema.sql'  // Manager permissions
    ],
    contentSystem: [
      '20250602000002_content_management_system.sql',  // Content management
      '20250605000001_dynamic_workflow_system.sql',    // Workflow system
      '20250605000002_migrate_onboarding_to_workflow.sql',  // Workflow migration
      '20250606115627_multilingual_workflow_system.sql',    // Multilingual
      '20250609000000_create_workflow_translations_table.sql',  // Translations
      '20250609000001_fix_workflow_user_references.sql'     // Workflow fixes
    ],
    systemSettings: [
      '20250130000001_add_smtp_admin_settings.sql',    // SMTP settings
      '20250602000001_consolidate_settings_tables.sql', // Settings consolidation
      '20250603000000_enhanced_application_settings.sql' // Enhanced settings
    ],
    securityAndTracking: [
      '20250528100001_add_migration_tracking.sql',     // Migration tracking
      '20250529064500_fix_pdf_templates_rls.sql',      // PDF templates RLS
      '20250602120000_add_first_login_tracking.sql',   // Login tracking
      '20250603000001_simple_account_lockout.sql',     // Account lockout
      '20250605000000_fix_duplicate_notifications.sql' // Notification fixes
    ],
    legacyFeatures: [
      '20250107000000_quiz_translation_system.sql',    // Quiz translations
      '20250107000003_add_onboarding_phase_3_2.sql'    // Onboarding phase 3.2
    ]
  };
  
  console.log('📋 Consolidation Groups:');
  Object.entries(candidates).forEach(([group, files]) => {
    console.log(`\n   ${group.toUpperCase()}:`);
    files.forEach(file => {
      const exists = fs.existsSync(path.join(MIGRATIONS_DIR, file));
      console.log(`      ${exists ? '✅' : '❌'} ${file}`);
    });
  });
  
  return candidates;
}

// Main execution
function main() {
  console.log('🚀 Migration Cleanup Process Started\n');
  console.log('Phase 1: Remove Duplicate and Test Files\n');
  
  try {
    // Step 1: Create backup
    const backedUpCount = createBackup();
    
    // Step 2: Remove problematic files
    const { removed, notFound } = removeProblematicFiles();
    
    // Step 3: Analyze remaining files
    const remainingFiles = analyzeRemainingFiles();
    
    // Step 4: Identify consolidation candidates
    const candidates = identifyConsolidationCandidates();
    
    console.log('\n🎉 Phase 1 Completed Successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Original files: ${backedUpCount}`);
    console.log(`   Removed files: ${removed.length}`);
    console.log(`   Remaining files: ${remainingFiles.length}`);
    console.log(`   Backup location: ${BACKUP_DIR}/`);
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Review remaining files');
    console.log('   2. Fix base schema inconsistencies');
    console.log('   3. Consolidate related migrations');
    console.log('   4. Test new migration set');
    
    return {
      success: true,
      backedUpCount,
      removed,
      remainingFiles,
      candidates
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.log('\n🔄 Rollback available from backup directory');
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

module.exports = { main, createBackup, removeProblematicFiles };
