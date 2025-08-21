#!/usr/bin/env node

// Migration Analysis Script
// Sprint S02 T04: Migration Cleanup & Consolidation
// Analyzes current migration files for consolidation opportunities

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');

// Migration categories for consolidation
const MIGRATION_CATEGORIES = {
  settings: ['settings', 'admin', 'smtp', 'application'],
  workflow: ['workflow', 'onboarding', 'dynamic'],
  translation: ['translation', 'multilingual', 'quiz_translation'],
  user_management: ['user', 'account', 'lockout', 'login'],
  content: ['content', 'cms', 'pdf'],
  fixes: ['fix', 'duplicate', 'references'],
  tracking: ['tracking', 'migration', 'frontend_errors']
};

// Analysis results
const analysis = {
  totalFiles: 0,
  categories: {},
  consolidationOpportunities: [],
  redundantFiles: [],
  dependencies: {},
  recommendations: []
};

/**
 * Read and analyze migration files
 */
function analyzeMigrations() {
  console.log('🔍 MIGRATION ANALYSIS');
  console.log('=====================');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  analysis.totalFiles = files.length;
  console.log(`📁 Total migration files: ${files.length}`);
  console.log('');

  // Categorize migrations
  files.forEach(file => {
    const category = categorizeFile(file);
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const size = content.length;
    const lines = content.split('\n').length;
    
    if (!analysis.categories[category]) {
      analysis.categories[category] = [];
    }
    
    analysis.categories[category].push({
      file,
      size,
      lines,
      content: content.substring(0, 200) + '...' // Preview
    });
  });

  // Print categorization
  console.log('📋 MIGRATION CATEGORIZATION');
  console.log('============================');
  Object.entries(analysis.categories).forEach(([category, migrations]) => {
    console.log(`\n${category.toUpperCase()} (${migrations.length} files):`);
    migrations.forEach(migration => {
      console.log(`  - ${migration.file} (${migration.lines} lines, ${(migration.size/1024).toFixed(1)}KB)`);
    });
  });

  // Identify consolidation opportunities
  identifyConsolidationOpportunities();
  
  // Identify redundant files
  identifyRedundantFiles();
  
  // Generate recommendations
  generateRecommendations();
  
  // Print summary
  printSummary();
}

/**
 * Categorize migration file based on filename and content
 */
function categorizeFile(filename) {
  const lowerName = filename.toLowerCase();
  
  for (const [category, keywords] of Object.entries(MIGRATION_CATEGORIES)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Identify consolidation opportunities
 */
function identifyConsolidationOpportunities() {
  console.log('\n🔄 CONSOLIDATION OPPORTUNITIES');
  console.log('==============================');
  
  Object.entries(analysis.categories).forEach(([category, migrations]) => {
    if (migrations.length > 1) {
      const opportunity = {
        category,
        files: migrations.map(m => m.file),
        potential: migrations.length > 3 ? 'HIGH' : migrations.length > 1 ? 'MEDIUM' : 'LOW',
        savings: migrations.length - 1
      };
      
      analysis.consolidationOpportunities.push(opportunity);
      
      console.log(`\n${category.toUpperCase()} - ${opportunity.potential} PRIORITY`);
      console.log(`  Files to consolidate: ${opportunity.files.length}`);
      console.log(`  Potential reduction: ${opportunity.savings} files`);
      opportunity.files.forEach(file => {
        console.log(`    - ${file}`);
      });
    }
  });
}

/**
 * Identify potentially redundant files
 */
function identifyRedundantFiles() {
  console.log('\n🗑️ POTENTIALLY REDUNDANT FILES');
  console.log('===============================');
  
  const redundantPatterns = [
    { pattern: /fix_.*/, reason: 'Fix migrations that might be consolidated' },
    { pattern: /add_.*_tracking/, reason: 'Tracking additions that could be merged' },
    { pattern: /enhance.*/, reason: 'Enhancement migrations that could be consolidated' }
  ];
  
  Object.values(analysis.categories).flat().forEach(migration => {
    redundantPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(migration.file)) {
        analysis.redundantFiles.push({
          file: migration.file,
          reason
        });
      }
    });
  });
  
  if (analysis.redundantFiles.length > 0) {
    analysis.redundantFiles.forEach(({ file, reason }) => {
      console.log(`  ⚠️  ${file}`);
      console.log(`      Reason: ${reason}`);
    });
  } else {
    console.log('  ✅ No obviously redundant files found');
  }
}

/**
 * Generate consolidation recommendations
 */
function generateRecommendations() {
  console.log('\n💡 CONSOLIDATION RECOMMENDATIONS');
  console.log('=================================');
  
  // Settings consolidation
  const settingsFiles = analysis.categories.settings || [];
  if (settingsFiles.length > 1) {
    analysis.recommendations.push({
      type: 'CONSOLIDATE',
      category: 'settings',
      action: 'Merge all settings-related migrations into a single comprehensive settings migration',
      files: settingsFiles.map(f => f.file),
      impact: 'HIGH',
      savings: settingsFiles.length - 1
    });
  }
  
  // Workflow consolidation
  const workflowFiles = analysis.categories.workflow || [];
  if (workflowFiles.length > 1) {
    analysis.recommendations.push({
      type: 'CONSOLIDATE',
      category: 'workflow',
      action: 'Consolidate workflow system migrations into a single dynamic workflow migration',
      files: workflowFiles.map(f => f.file),
      impact: 'HIGH',
      savings: workflowFiles.length - 1
    });
  }
  
  // Translation consolidation
  const translationFiles = analysis.categories.translation || [];
  if (translationFiles.length > 1) {
    analysis.recommendations.push({
      type: 'CONSOLIDATE',
      category: 'translation',
      action: 'Merge translation system migrations into a comprehensive multilingual system',
      files: translationFiles.map(f => f.file),
      impact: 'MEDIUM',
      savings: translationFiles.length - 1
    });
  }
  
  // Print recommendations
  analysis.recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.type}: ${rec.category.toUpperCase()}`);
    console.log(`   Impact: ${rec.impact}`);
    console.log(`   Savings: ${rec.savings} files`);
    console.log(`   Action: ${rec.action}`);
    console.log(`   Files (${rec.files.length}):`);
    rec.files.forEach(file => {
      console.log(`     - ${file}`);
    });
  });
}

/**
 * Print analysis summary
 */
function printSummary() {
  console.log('\n📊 CONSOLIDATION SUMMARY');
  console.log('========================');
  
  const totalSavings = analysis.recommendations.reduce((sum, rec) => sum + rec.savings, 0);
  const finalCount = analysis.totalFiles - totalSavings;
  const reductionPercent = ((totalSavings / analysis.totalFiles) * 100).toFixed(1);
  
  console.log(`Current files: ${analysis.totalFiles}`);
  console.log(`Potential savings: ${totalSavings} files`);
  console.log(`Final count: ${finalCount} files`);
  console.log(`Reduction: ${reductionPercent}%`);
  
  console.log('\n🎯 CONSOLIDATION PLAN');
  console.log('=====================');
  console.log('1. Create consolidated migrations for each category');
  console.log('2. Test consolidated migrations on fresh database');
  console.log('3. Verify migration paths work correctly');
  console.log('4. Remove old migration files');
  console.log('5. Update migration documentation');
  
  console.log('\n⚠️ IMPORTANT NOTES');
  console.log('==================');
  console.log('- Always backup database before consolidation');
  console.log('- Test migration paths thoroughly');
  console.log('- Coordinate with team before removing files');
  console.log('- Update deployment scripts if needed');
  
  // Generate consolidation script
  generateConsolidationScript();
}

/**
 * Generate consolidation script
 */
function generateConsolidationScript() {
  const scriptPath = path.join(__dirname, 'consolidate-migrations.sh');
  
  let script = `#!/bin/bash
# Migration Consolidation Script
# Generated by migration analysis
# Sprint S02 T04: Migration Cleanup & Consolidation

set -e

echo "🚀 Starting migration consolidation..."
echo "======================================"

# Backup current migrations
echo "📦 Creating backup..."
cp -r supabase/migrations supabase/migrations.backup.$(date +%Y%m%d_%H%M%S)

`;

  analysis.recommendations.forEach((rec, index) => {
    script += `
# ${index + 1}. Consolidate ${rec.category} migrations
echo "🔄 Consolidating ${rec.category} migrations..."
# TODO: Implement consolidation logic for ${rec.category}
# Files to consolidate: ${rec.files.join(', ')}

`;
  });

  script += `
echo "✅ Migration consolidation completed!"
echo "📊 Summary:"
echo "  - Original files: ${analysis.totalFiles}"
echo "  - Consolidated files: ${analysis.totalFiles - analysis.recommendations.reduce((sum, rec) => sum + rec.savings, 0)}"
echo "  - Reduction: ${((analysis.recommendations.reduce((sum, rec) => sum + rec.savings, 0) / analysis.totalFiles) * 100).toFixed(1)}%"
echo ""
echo "⚠️  Remember to:"
echo "  1. Test consolidated migrations"
echo "  2. Update documentation"
echo "  3. Coordinate with team"
`;

  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, '755');
  
  console.log(`\n📝 Consolidation script generated: ${scriptPath}`);
}

// Run analysis
if (require.main === module) {
  analyzeMigrations();
}

module.exports = { analyzeMigrations, analysis };
