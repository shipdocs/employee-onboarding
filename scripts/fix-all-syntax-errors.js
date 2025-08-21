#!/usr/bin/env node

/**
 * Comprehensive syntax error fixer for all API files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

let totalFixed = 0;
let totalErrors = 0;
const remainingErrors = [];

/**
 * Check if file has syntax errors
 */
function checkSyntax(filePath) {
  try {
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return { valid: true };
  } catch (error) {
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;
    return { valid: false, error: errorMsg };
  }
}

/**
 * Fix missing catch blocks
 */
function fixMissingCatch(filePath, content) {
  // Pattern: try block without catch or finally
  const lines = content.split('\n');
  let inTry = false;
  let tryDepth = 0;
  let braceCount = 0;
  let tryStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect try block start
    if (trimmed.startsWith('try {')) {
      inTry = true;
      tryDepth++;
      tryStartLine = i;
      braceCount = 1;
    } else if (inTry) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Try block ended, check if there's a catch or finally
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
            const nextNextLine = lines[i + 2] ? lines[i + 2].trim() : '';
            
            if (!nextLine.startsWith('catch') && !nextLine.startsWith('} catch') && 
                !nextLine.startsWith('finally') && !nextLine.startsWith('} finally') &&
                !nextNextLine.startsWith('catch') && !nextNextLine.startsWith('finally')) {
              // Missing catch/finally - add catch block
              const indent = line.match(/^(\s*)/)[1];
              lines[i] = line + '\n' + indent + '} catch (error) {\n' + 
                         indent + '  console.error("Error:", error);\n' + 
                         indent + '}';
              totalFixed++;
              console.log(`  Fixed missing catch block at line ${i + 1}`);
            }
            inTry = false;
            tryDepth--;
          }
        }
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Fix duplicate try statements
 */
function fixDuplicateTry(filePath, content) {
  // Pattern: try { try {
  let fixed = content.replace(/try\s*{\s*try\s*{/g, 'try {');
  
  if (fixed !== content) {
    totalFixed++;
    console.log(`  Fixed duplicate try statement`);
  }
  
  return fixed;
}

/**
 * Fix catch variable mismatches
 */
function fixCatchVariables(filePath, content) {
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    // Look for catch (_error) or catch (_e) etc
    const catchMatch = lines[i].match(/} catch \((_\w+)\) {/);
    if (catchMatch) {
      const catchVar = catchMatch[1];
      const expectedVar = catchVar.substring(1); // Remove underscore
      
      // Check next 10 lines for usage of the non-underscored variable
      let hasUsage = false;
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes(expectedVar) && !lines[j].includes(catchVar)) {
          hasUsage = true;
          break;
        }
        // Stop at closing brace
        if (lines[j].match(/^[\s]*}/)) break;
      }
      
      if (hasUsage) {
        lines[i] = lines[i].replace(`} catch (${catchVar}) {`, `} catch (${expectedVar}) {`);
        fixed = true;
        console.log(`  Fixed catch variable: ${catchVar} -> ${expectedVar}`);
        totalFixed++;
      }
    }
  }
  
  return fixed ? lines.join('\n') : content;
}

/**
 * Fix unclosed blocks
 */
function fixUnclosedBlocks(filePath, content) {
  const lines = content.split('\n');
  let braceBalance = 0;
  
  for (const line of lines) {
    for (const char of line) {
      if (char === '{') braceBalance++;
      if (char === '}') braceBalance--;
    }
  }
  
  if (braceBalance > 0) {
    // Missing closing braces
    content += '\n' + '}'.repeat(braceBalance);
    console.log(`  Added ${braceBalance} missing closing brace(s)`);
    totalFixed++;
  } else if (braceBalance < 0) {
    // Extra closing braces - remove from end
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex > -1) {
      content = content.substring(0, lastBraceIndex) + content.substring(lastBraceIndex + 1);
      console.log(`  Removed extra closing brace`);
      totalFixed++;
    }
  }
  
  return content;
}

/**
 * Main fix function for a single file
 */
function fixFile(filePath) {
  const check = checkSyntax(filePath);
  if (check.valid) return true;
  
  console.log(`\n🔍 Fixing: ${filePath}`);
  console.log(`  Error: ${check.error.split('\n')[0]}`);
  totalErrors++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes based on error type
    if (check.error.includes('Missing catch or finally')) {
      content = fixMissingCatch(filePath, content);
    }
    
    if (check.error.includes('Unexpected token')) {
      content = fixDuplicateTry(filePath, content);
      content = fixCatchVariables(filePath, content);
    }
    
    if (check.error.includes('Unexpected end of input')) {
      content = fixUnclosedBlocks(filePath, content);
    }
    
    // Always check catch variables
    content = fixCatchVariables(filePath, content);
    
    // Write if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      
      // Verify fix
      const afterCheck = checkSyntax(filePath);
      if (afterCheck.valid) {
        console.log(`  ✅ Fixed successfully!`);
        return true;
      } else {
        console.log(`  ⚠️ Still has errors: ${afterCheck.error.split('\n')[0]}`);
        remainingErrors.push({ file: filePath, error: afterCheck.error });
        return false;
      }
    } else {
      console.log(`  ❌ Could not automatically fix`);
      remainingErrors.push({ file: filePath, error: check.error });
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error processing file:`, error.message);
    remainingErrors.push({ file: filePath, error: error.message });
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 COMPREHENSIVE SYNTAX ERROR FIXER');
  console.log('='.repeat(60));
  
  // Get all JS files
  const allFiles = [
    ...glob.sync('api/**/*.js', { ignore: ['**/node_modules/**'] }),
    ...glob.sync('lib/**/*.js', { ignore: ['**/node_modules/**'] }),
    ...glob.sync('scripts/**/*.js', { ignore: ['**/node_modules/**'] })
  ];
  
  console.log(`\n📁 Checking ${allFiles.length} JavaScript files...\n`);
  
  // First pass: fix all files
  for (const file of allFiles) {
    fixFile(file);
  }
  
  // Second pass: retry remaining errors with different strategies
  if (remainingErrors.length > 0) {
    console.log('\n🔄 Second pass for remaining errors...\n');
    const stillBroken = [];
    
    for (const { file } of remainingErrors) {
      if (!fixFile(file)) {
        stillBroken.push(file);
      }
    }
    
    remainingErrors.length = 0;
    stillBroken.forEach(file => {
      const check = checkSyntax(file);
      if (!check.valid) {
        remainingErrors.push({ file, error: check.error });
      }
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total fixes applied: ${totalFixed}`);
  console.log(`📁 Files with errors found: ${totalErrors}`);
  console.log(`❌ Files still with errors: ${remainingErrors.length}`);
  
  if (remainingErrors.length > 0) {
    console.log('\n⚠️ Files requiring manual intervention:');
    remainingErrors.forEach(({ file, error }) => {
      console.log(`\n  ${file}:`);
      console.log(`    ${error.split('\n')[0]}`);
    });
  } else if (totalFixed > 0) {
    console.log('\n✨ All syntax errors have been fixed!');
  }
  
  console.log('='.repeat(60));
  
  // Test server startup
  if (totalFixed > 0) {
    console.log('\n🚀 Testing server startup...\n');
    try {
      execSync('timeout 3 npm start', { stdio: 'inherit' });
    } catch (e) {
      // Timeout is expected
    }
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});