#!/usr/bin/env node

/**
 * Script to fix all database import errors across the codebase
 * Replaces undefined 'db' references with proper imports
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Counter for tracking fixes
let filesFixed = 0;
let importsAdded = 0;
let errorsFixed = 0;

/**
 * Check if a file already has a database import
 */
function hasDatabaseImport(content) {
  const patterns = [
    /const\s+{\s*db\s*}\s*=\s*require\(/,
    /const\s+db\s*=\s*require\(/,
    /const\s+{\s*query\s*}\s*=\s*require\(['"]\.\./,
    /const\s+{\s*pool\s*}\s*=\s*require\(/,
    /import\s+{\s*db\s*}\s+from/,
    /import\s+db\s+from/
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

/**
 * Check if file uses db.query() or similar database operations
 */
function usesDatabaseOperations(content) {
  const patterns = [
    /db\.query\(/,
    /db\.getClient\(/,
    /db\.transaction\(/,
    /pool\.query\(/,
    /pool\.connect\(/
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

/**
 * Calculate the correct relative path to lib/database.js
 */
function getRelativeDatabasePath(filePath) {
  const fileDir = path.dirname(filePath);
  const libPath = path.join(process.cwd(), 'lib', 'database.js');
  let relativePath = path.relative(fileDir, libPath);
  
  // Ensure forward slashes for require()
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Add ./ if it doesn't start with ../
  if (!relativePath.startsWith('../')) {
    relativePath = './' + relativePath;
  }
  
  // Remove .js extension for cleaner imports
  relativePath = relativePath.replace(/\.js$/, '');
  
  return relativePath;
}

/**
 * Fix database imports in a single file
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if file doesn't use database operations
    if (!usesDatabaseOperations(content)) {
      return false;
    }
    
    // Skip if already has proper import
    if (hasDatabaseImport(content)) {
      // But check if it's using supabase - we need to replace those
      if (content.includes('database-supabase-compat')) {
        const relativePath = getRelativeDatabasePath(filePath);
        content = content.replace(
          /const\s+{\s*supabase\s*}\s*=\s*require\(['"]\S+database-supabase-compat['"]\);?/g,
          `const { db } = require('${relativePath}');`
        );
        
        // Replace supabase usage with db
        content = content.replace(/supabase\.from\(['"]\w+['"]\)/g, 'db');
        content = content.replace(/supabase\.query/g, 'db.query');
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          console.log(`✅ Replaced supabase with db in: ${filePath}`);
          filesFixed++;
          return true;
        }
      }
      return false;
    }
    
    // Add the import at the beginning, after any existing requires
    const relativePath = getRelativeDatabasePath(filePath);
    const dbImport = `const { db } = require('${relativePath}');\n`;
    
    // Find the right place to insert the import
    const requireRegex = /^const\s+\w+\s*=\s*require\(/m;
    const lastRequireMatch = content.match(/^const\s+.*=\s*require\(.*\);?\s*$/gm);
    
    if (lastRequireMatch && lastRequireMatch.length > 0) {
      // Add after the last require statement
      const lastRequire = lastRequireMatch[lastRequireMatch.length - 1];
      const insertIndex = content.lastIndexOf(lastRequire) + lastRequire.length;
      content = content.slice(0, insertIndex) + '\n' + dbImport + content.slice(insertIndex);
    } else {
      // Add at the very beginning if no requires found
      content = dbImport + '\n' + content;
    }
    
    // Write the fixed content back
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed database imports in: ${filePath}`);
      filesFixed++;
      importsAdded++;
      
      // Count the number of db.query fixes
      const queryMatches = content.match(/db\.query\(/g);
      if (queryMatches) {
        errorsFixed += queryMatches.length;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function to fix all files
 */
async function fixAllDatabaseImports() {
  console.log('🔧 Starting database import fixes...\n');
  
  // Find all JavaScript files in api directory
  const apiFiles = glob.sync('api/**/*.js', {
    ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js']
  });
  
  console.log(`Found ${apiFiles.length} API files to check\n`);
  
  // Process each file
  for (const file of apiFiles) {
    fixFile(file);
  }
  
  // Also check lib files that might need updates
  const libFiles = glob.sync('lib/**/*.js', {
    ignore: [
      '**/node_modules/**',
      '**/*.test.js',
      '**/*.spec.js',
      'lib/database.js', // Don't modify the database file itself
      'lib/database-*.js' // Skip other database files
    ]
  });
  
  console.log(`\nChecking ${libFiles.length} library files...\n`);
  
  for (const file of libFiles) {
    fixFile(file);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('✨ DATABASE IMPORT FIX COMPLETE');
  console.log('='.repeat(50));
  console.log(`📊 Files fixed: ${filesFixed}`);
  console.log(`📦 Imports added: ${importsAdded}`);
  console.log(`🔧 Database operations fixed: ${errorsFixed}`);
  console.log('='.repeat(50));
  
  if (filesFixed === 0) {
    console.log('\n✅ No files needed fixing - database imports already correct!');
  } else {
    console.log('\n✅ All database import errors have been fixed!');
    console.log('Next step: Run syntax check to verify all files are valid');
  }
}

// Run the fix
fixAllDatabaseImports().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});