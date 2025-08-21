#!/usr/bin/env node

/**
 * Fix broken try/catch blocks in API files
 * Many files have catch blocks without corresponding try blocks
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

let fixedCount = 0;
let totalFiles = 0;
let stillBroken = [];

function fixTryCatchBlocks(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: module.exports = async function with floating catch
    const moduleExportsPattern = /module\.exports\s*=\s*(async\s+)?function\s*\w*\s*\([^)]*\)\s*\{([^]*)\}\s*catch\s*\([^)]*\)\s*\{/;
    if (moduleExportsPattern.test(content)) {
      content = content.replace(moduleExportsPattern, (match, async, body) => {
        return `module.exports = ${async || ''}function handler(req, res) {
  try {${body}}
  catch (error) {`;
      });
    }
    
    // Pattern 2: Floating catch blocks (catch without try)
    // Look for catch blocks that aren't preceded by a closing brace
    const floatingCatchPattern = /^(\s*)(} catch \(|catch \()/gm;
    const lines = content.split('\n');
    let inFunction = false;
    let functionStart = -1;
    let needsTry = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect function start
      if (line.includes('async function') || line.includes('async (') || 
          line.includes('function handler') || line.includes('module.exports')) {
        inFunction = true;
        functionStart = i;
      }
      
      // Detect catch without proper try
      if (line.match(/^\s*}\s*catch\s*\(/) || line.match(/^\s*catch\s*\(/)) {
        // Check if there's a try in the previous lines
        let hasTry = false;
        for (let j = Math.max(0, i - 50); j < i; j++) {
          if (lines[j].includes('try {')) {
            hasTry = true;
            break;
          }
        }
        
        if (!hasTry && inFunction) {
          // Find the function body start and add try
          for (let j = functionStart; j < i; j++) {
            if (lines[j].includes('{') && !lines[j].includes('try {')) {
              // Add try after the function opening brace
              const indent = lines[j + 1].match(/^\s*/)[0];
              lines[j] = lines[j] + '\n' + indent + 'try {';
              console.log(`Added try block in ${filePath} at line ${j}`);
              needsTry = true;
              break;
            }
          }
        }
      }
    }
    
    if (needsTry) {
      content = lines.join('\n');
    }
    
    // Pattern 3: catch with wrong syntax (catch { instead of catch (error) {)
    content = content.replace(/}\s*catch\s*{/g, '} catch (error) {');
    content = content.replace(/catch\s*{/g, 'catch (error) {');
    
    // Pattern 4: Fix module.exports wrapped in wrong format
    if (content.includes('module.exports = ') && !content.includes('function')) {
      // Check if it's wrapping something without being a function
      const moduleMatch = content.match(/module\.exports\s*=\s*([^{]+){/);
      if (moduleMatch && !moduleMatch[1].includes('function') && !moduleMatch[1].includes('=>')) {
        // It's likely broken, wrap it properly
        content = content.replace(/module\.exports\s*=\s*/, 'module.exports = async function handler(req, res) ');
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      fixedCount++;
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stillBroken.push(filePath);
    return false;
  }
}

function validateFile(filePath) {
  try {
    const { execSync } = require('child_process');
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

console.log('🔧 Fixing try/catch blocks in API files...\n');

const apiFiles = glob.sync('api/**/*.js', {
  ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js']
});

totalFiles = apiFiles.length;
console.log(`Found ${totalFiles} API files to check\n`);

// First pass: fix try/catch blocks
for (const file of apiFiles) {
  if (!validateFile(file)) {
    fixTryCatchBlocks(file);
  }
}

// Second pass: check what's still broken
console.log('\n🔍 Validating fixes...\n');
for (const file of apiFiles) {
  if (!validateFile(file)) {
    stillBroken.push(file);
    console.log(`❌ Still broken: ${file}`);
  }
}

console.log('\n' + '='.repeat(50));
console.log('✨ TRY/CATCH FIX COMPLETE');
console.log('='.repeat(50));
console.log(`📊 Total files: ${totalFiles}`);
console.log(`✅ Files fixed: ${fixedCount}`);
console.log(`❌ Still broken: ${stillBroken.length}`);

if (stillBroken.length > 0) {
  console.log('\nFiles that need manual fixing:');
  stillBroken.slice(0, 10).forEach(file => {
    console.log(`  - ${file}`);
  });
}

console.log('='.repeat(50));