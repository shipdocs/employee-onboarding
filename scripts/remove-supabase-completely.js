#!/usr/bin/env node

/**
 * Complete Supabase Removal Script
 * Removes all Supabase dependencies and converts to direct PostgreSQL
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob').sync;

// Files to convert
const CONVERSION_PATTERNS = [
  'pages/**/*.js',
  'api/**/*.js',
  'lib/**/*.js',
  'scripts/**/*.js'
];

// Files to remove completely
const FILES_TO_REMOVE = [
  'lib/supabase.js',
  'lib/supabase-migrated.js', 
  'lib/supabase-cjs.js',
  'lib/storage.js' // Old Supabase storage
];

// Import patterns to replace
const IMPORT_REPLACEMENTS = [
  // Main supabase imports
  {
    pattern: /const\s*{\s*supabase\s*}\s*=\s*require\(['"]\.\.\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('../database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*supabase\s*}\s*=\s*require\(['"]\.\.\/\.\.\/lib\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('../../lib/database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*supabase\s*}\s*=\s*require\(['"]\.\.\/\.\.\/\.\.\/lib\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('../../../lib/database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*supabase\s*}\s*=\s*require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('../../../../lib/database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*supabase\s*}\s*=\s*require\(['"]\.\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('./database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*createClient\s*}\s*=\s*require\(['"]\.\.\/\.\.\/\.\.\/lib\/supabase(\.js)?['"]\);?/g,
    replacement: "const { supabase } = require('../../../lib/database-supabase-compat');"
  },
  {
    pattern: /const\s*{\s*createClient\s*}\s*=\s*require\(['"]@supabase\/supabase-js['"]\);?/g,
    replacement: "const { supabase } = require('../lib/database-supabase-compat');"
  }
];

// No additional replacements needed - compatibility layer handles the rest

async function removeSupabaseFiles() {
  console.log('🗑️  Removing Supabase files...');
  
  for (const file of FILES_TO_REMOVE) {
    try {
      await fs.unlink(file);
      console.log(`✅ Removed: ${file}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.log(`⚠️  Could not remove ${file}: ${error.message}`);
      }
    }
  }
}

async function convertFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;

    // Skip if file doesn't contain supabase references
    if (!content.includes('supabase')) {
      return false;
    }

    console.log(`🔄 Converting: ${filePath}`);

    // Replace imports
    for (const { pattern, replacement } of IMPORT_REPLACEMENTS) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }

    // No additional replacements needed

    if (modified) {
      await fs.writeFile(filePath, content);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error converting ${filePath}:`, error.message);
    return false;
  }
}

async function convertAllFiles() {
  console.log('🔄 Converting files to use direct PostgreSQL...');
  
  const files = [];
  for (const pattern of CONVERSION_PATTERNS) {
    const matches = glob(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    files.push(...matches);
  }

  let convertedCount = 0;
  for (const file of files) {
    const converted = await convertFile(file);
    if (converted) {
      convertedCount++;
    }
  }

  console.log(`✅ Converted ${convertedCount} files`);
}

async function main() {
  console.log('🚀 Starting complete Supabase removal...\n');
  
  try {
    await removeSupabaseFiles();
    console.log('');
    await convertAllFiles();
    
    console.log('\n✅ Supabase removal completed!');
    console.log('\n📝 Manual steps still needed:');
    console.log('1. Review converted files for complex query patterns');
    console.log('2. Replace storage operations with MinIO/filesystem');
    console.log('3. Test all API endpoints');
    console.log('4. Update any remaining auth patterns');
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { convertFile, removeSupabaseFiles };
