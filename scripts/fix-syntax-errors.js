#!/usr/bin/env node

/**
 * Script to fix common syntax errors in API files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let fixedCount = 0;
const errors = [];

/**
 * Fix duplicate const declarations
 */
function fixDuplicateDeclarations(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove duplicate supabase imports
    const supabaseImportRegex = /const\s+{\s*supabase\s*}\s*=\s*require\([^)]+database-supabase-compat[^)]*\);?\n/g;
    const supabaseMatches = content.match(supabaseImportRegex);
    if (supabaseMatches && supabaseMatches.length > 1) {
      // Keep only the first one
      content = content.replace(supabaseImportRegex, '');
      content = supabaseMatches[0] + content;
      console.log(`Fixed duplicate supabase import in: ${filePath}`);
    }
    
    // Remove duplicate db imports
    const dbImportRegex = /const\s+{\s*db\s*}\s*=\s*require\([^)]+\/database[^)]*\);?\n/g;
    const dbMatches = content.match(dbImportRegex);
    if (dbMatches && dbMatches.length > 1) {
      // Keep only the first one
      content = content.replace(dbImportRegex, '');
      content = dbMatches[0] + content;
      console.log(`Fixed duplicate db import in: ${filePath}`);
    }
    
    // Also check for conflicting imports (both db from database-direct and database)
    if (content.includes('const db = require') && content.includes('const { db } = require')) {
      // Remove the const db = require line
      content = content.replace(/const\s+db\s*=\s*require\([^)]+\);?\n/g, '');
      console.log(`Fixed conflicting db imports in: ${filePath}`);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      fixedCount++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing duplicates in ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Fix incomplete async/await statements
 */
function fixIncompleteStatements(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix incomplete await statements like "await // TODO:"
    content = content.replace(
      /const\s+{\s*data:\s*{\s*user\s*},\s*error:\s*\w+\s*}\s*=\s*await\s*\/\/[^\n]+/g,
      'const user = null; // TODO: Implement authentication\n    const authError = null;'
    );
    
    // Fix trailing dots in object access
    content = content.replace(/(\w+)\.\s*\n/g, '$1\n');
    
    // Fix empty catch blocks without proper syntax
    content = content.replace(/catch\s*{\s*}/g, 'catch (error) { /* Empty catch */ }');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed incomplete statements in: ${filePath}`);
      fixedCount++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing statements in ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Fix module.exports wrapped incorrectly
 */
function fixModuleExports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix extra closing braces after module.exports
    const lines = content.split('\n');
    let braceCount = 0;
    let inModuleExports = false;
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('module.exports')) {
        inModuleExports = true;
      }
      
      if (inModuleExports) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        // If we've closed all braces and see an extra });
        if (braceCount === 0 && lines[i + 1] && lines[i + 1].trim() === '});') {
          // Skip the extra });
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    const fixedContent = fixedLines.join('\n');
    
    if (fixedContent !== originalContent) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`Fixed module exports in: ${filePath}`);
      fixedCount++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing module exports in ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Check if file has syntax errors
 */
function hasSyntaxError(filePath) {
  try {
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return false;
  } catch (error) {
    return error.stderr ? error.stderr.toString() : error.message;
  }
}

/**
 * Main function
 */
async function fixAllSyntaxErrors() {
  console.log('🔧 Starting syntax error fixes...\n');
  
  // Get all JS files in api directory
  const apiFiles = require('glob').sync('api/**/*.js', {
    ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js']
  });
  
  console.log(`Found ${apiFiles.length} API files to check\n`);
  
  // First pass: Fix known issues
  for (const file of apiFiles) {
    const errorBefore = hasSyntaxError(file);
    
    if (errorBefore) {
      console.log(`\nChecking: ${file}`);
      console.log(`Error: ${errorBefore.split('\n')[0]}`);
      
      // Try different fixes
      fixDuplicateDeclarations(file);
      fixIncompleteStatements(file);
      fixModuleExports(file);
      
      // Check if error is fixed
      const errorAfter = hasSyntaxError(file);
      if (!errorAfter) {
        console.log(`✅ Fixed!`);
      } else if (errorAfter !== errorBefore) {
        console.log(`⚠️ Different error now: ${errorAfter.split('\n')[0]}`);
        errors.push({ file, error: errorAfter });
      } else {
        console.log(`❌ Still has error`);
        errors.push({ file, error: errorAfter });
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✨ SYNTAX ERROR FIX COMPLETE');
  console.log('='.repeat(50));
  console.log(`📊 Files fixed: ${fixedCount}`);
  console.log(`❌ Files with remaining errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nRemaining errors:');
    errors.slice(0, 10).forEach(({ file, error }) => {
      console.log(`\n${file}:`);
      console.log(error.split('\n')[0]);
    });
  }
  
  console.log('='.repeat(50));
}

// Run the fix
fixAllSyntaxErrors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});