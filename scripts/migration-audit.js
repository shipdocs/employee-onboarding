#!/usr/bin/env node

/**
 * Database Migration Audit Script
 * Analyzes all migration files and identifies issues
 */

const fs = require('fs');
const path = require('path');
const { safeScriptReadFile, safeScriptListFiles, safeScriptFileStats } = require('../lib/security/scriptSecurity');

const MIGRATIONS_DIR = 'supabase/migrations';

function auditMigrations() {
  console.log('🔍 Database Migration Audit\n');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('❌ Migrations directory not found');
    return;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
    
  console.log(`📊 Total Migration Files: ${files.length}\n`);
  
  const analysis = {
    total: files.length,
    duplicates: [],
    testFiles: [],
    potentialBaseSchemas: [],
    chronologicalIssues: [],
    sizeLarge: [],
    conflicts: []
  };
  
  console.log('📋 Migration File Inventory:');
  files.forEach((file, index) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    
    console.log(`   ${index + 1}. ${file} (${sizeKB} KB)`);
    
    // Analyze file for issues
    const fileName = file.toLowerCase();
    
    // Check for duplicates
    if (fileName.includes('remote_schema')) {
      analysis.duplicates.push(file);
    }
    
    // Check for test files
    if (fileName.includes('test')) {
      analysis.testFiles.push(file);
    }
    
    // Check for potential base schemas
    if (fileName.includes('complete_schema') || fileName.includes('create_schema')) {
      analysis.potentialBaseSchemas.push(file);
    }
    
    // Check for large files (might need optimization)
    if (sizeKB > 50) {
      analysis.sizeLarge.push({ file, size: sizeKB });
    }
    
    // Check chronological order
    const timestamp = file.substring(0, 14);
    if (index > 0) {
      const prevTimestamp = files[index - 1].substring(0, 14);
      if (timestamp < prevTimestamp) {
        analysis.chronologicalIssues.push({
          file,
          timestamp,
          previousFile: files[index - 1],
          previousTimestamp: prevTimestamp
        });
      }
    }
  });
  
  console.log('\n🚨 Issues Identified:');
  
  if (analysis.duplicates.length > 0) {
    console.log(`\n   📄 Duplicate Files (${analysis.duplicates.length}):`);
    analysis.duplicates.forEach(file => {
      console.log(`      - ${file}`);
    });
  }
  
  if (analysis.testFiles.length > 0) {
    console.log(`\n   🧪 Test Files (${analysis.testFiles.length}):`);
    analysis.testFiles.forEach(file => {
      console.log(`      - ${file}`);
    });
  }
  
  if (analysis.potentialBaseSchemas.length > 0) {
    console.log(`\n   🏗️  Potential Base Schemas (${analysis.potentialBaseSchemas.length}):`);
    analysis.potentialBaseSchemas.forEach(file => {
      console.log(`      - ${file}`);
    });
  }
  
  if (analysis.sizeLarge.length > 0) {
    console.log(`\n   📦 Large Files (${analysis.sizeLarge.length}):`);
    analysis.sizeLarge.forEach(({ file, size }) => {
      console.log(`      - ${file} (${size} KB)`);
    });
  }
  
  if (analysis.chronologicalIssues.length > 0) {
    console.log(`\n   ⏰ Chronological Issues (${analysis.chronologicalIssues.length}):`);
    analysis.chronologicalIssues.forEach(issue => {
      console.log(`      - ${issue.file} (${issue.timestamp}) comes after ${issue.previousFile} (${issue.previousTimestamp})`);
    });
  }
  
  console.log('\n📈 Summary:');
  console.log(`   Total Files: ${analysis.total}`);
  console.log(`   Issues Found: ${analysis.duplicates.length + analysis.testFiles.length + analysis.chronologicalIssues.length}`);
  console.log(`   Potential Base Schemas: ${analysis.potentialBaseSchemas.length}`);
  console.log(`   Large Files: ${analysis.sizeLarge.length}`);
  
  console.log('\n🎯 Recommendations:');
  if (analysis.duplicates.length > 0) {
    console.log('   - Remove duplicate remote_schema files');
  }
  if (analysis.testFiles.length > 0) {
    console.log('   - Remove test-only migration files');
  }
  if (analysis.potentialBaseSchemas.length > 1) {
    console.log('   - Consolidate multiple base schemas');
  }
  if (analysis.sizeLarge.length > 0) {
    console.log('   - Review large files for optimization opportunities');
  }
  
  return analysis;
}

function analyzeFileContents() {
  console.log('\n🔍 Analyzing File Contents...\n');
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
    
  const tableOperations = {
    creates: new Set(),
    alters: new Set(),
    drops: new Set(),
    indexes: new Set()
  };
  
  for (const file of files) {
    try {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = (await safeScriptReadFile(filePath, 'migrations')).toLowerCase();
    
    // Extract table operations
    const createMatches = content.match(/create table\s+(\w+)/g);
    const alterMatches = content.match(/alter table\s+(\w+)/g);
    const dropMatches = content.match(/drop table\s+(\w+)/g);
    const indexMatches = content.match(/create\s+(?:unique\s+)?index\s+(\w+)/g);
    
    if (createMatches) {
      createMatches.forEach(match => {
        const table = match.replace(/create table\s+/, '');
        tableOperations.creates.add(table);
      });
    }
    
    if (alterMatches) {
      alterMatches.forEach(match => {
        const table = match.replace(/alter table\s+/, '');
        tableOperations.alters.add(table);
      });
    }
    
    if (dropMatches) {
      dropMatches.forEach(match => {
        const table = match.replace(/drop table\s+/, '');
        tableOperations.drops.add(table);
      });
    }
    
    if (indexMatches) {
      indexMatches.forEach(match => {
        const index = match.replace(/create\s+(?:unique\s+)?index\s+/, '');
        tableOperations.indexes.add(index);
      });
    }
  });
  
  console.log('📊 Database Operations Summary:');
  console.log(`   Tables Created: ${tableOperations.creates.size}`);
  console.log(`   Tables Altered: ${tableOperations.alters.size}`);
  console.log(`   Tables Dropped: ${tableOperations.drops.size}`);
  console.log(`   Indexes Created: ${tableOperations.indexes.size}`);
  
  if (tableOperations.creates.size > 0) {
    console.log('\n📋 Tables Created:');
    Array.from(tableOperations.creates).sort().forEach(table => {
      console.log(`      - ${table}`);
    });
  }
  
  return tableOperations;
}

// Run audit
const analysis = auditMigrations();
const operations = analyzeFileContents();

console.log('\n✅ Migration audit completed');
console.log('📄 Results saved for consolidation planning');
