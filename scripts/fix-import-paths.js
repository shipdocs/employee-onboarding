#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to calculate the correct import path based on file depth
function getCorrectImportPath(filePath) {
  // Normalize the path and count directory levels from api/
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Extract the part after 'api/'
  const apiMatch = normalizedPath.match(/api\/(.+)\.js$/);
  if (!apiMatch) return null;

  const pathAfterApi = apiMatch[1];

  // Count directory levels (split by '/' and count parts minus the filename)
  const parts = pathAfterApi.split('/');
  const directoryDepth = parts.length - 1; // -1 because last part is filename without extension

  // Generate the correct relative path
  // From api/auth/file.js: need ../../lib/rateLimit (2 levels up)
  // From api/admin/feedback/file.js: need ../../../lib/rateLimit (3 levels up)
  return '../'.repeat(directoryDepth + 1) + 'lib/rateLimit';
}

// Function to recursively find all JS files in api directory
function findJSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findJSFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix import paths in a file
function fixImportPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const correctPath = getCorrectImportPath(filePath);
  
  // Pattern to match rateLimit imports
  const importPattern = /require\(['"`]([^'"`]*lib\/rateLimit)['"`]\)/g;
  
  let hasChanges = false;
  const newContent = content.replace(importPattern, (match, importPath) => {
    if (importPath !== correctPath) {
      console.log(`${filePath}: ${importPath} → ${correctPath}`);
      hasChanges = true;
      return match.replace(importPath, correctPath);
    }
    return match;
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔧 Fixing import paths for lib/rateLimit...\n');

const apiDir = path.join(process.cwd(), 'api');
const jsFiles = findJSFiles(apiDir);

let fixedCount = 0;

for (const filePath of jsFiles) {
  if (fixImportPaths(filePath)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} files with incorrect import paths`);
console.log('🎯 All rateLimit import paths are now correct based on file depth');
