#!/usr/bin/env node

/**
 * Fix mismatched catch block variable names
 * Problem: catch (_error) but using 'error' in the body
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

let totalFixed = 0;
let totalFiles = 0;
const issues = [];

function fixCatchBlocks(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixed = false;
    
    // Pattern 1: catch (_error) with 'error' used in body
    // Replace catch (_error) with catch (error) when 'error' is referenced
    const catchPattern = /} catch \(_error\) \{([^}]*)\}/g;
    
    content = content.replace(catchPattern, (match, body) => {
      // Check if 'error' (not '_error') is used in the body
      if (body.includes('error') && !body.includes('_error')) {
        fixed = true;
        return `} catch (error) {${body}}`;
      }
      // Check if neither error nor _error is used (empty or just console.log)
      else if (!body.includes('_error') && !body.includes('error')) {
        fixed = true;
        return `} catch (error) {${body}}`;
      }
      return match;
    });
    
    // Pattern 2: Fix standalone catch blocks with multiline bodies
    const multilineCatchPattern = /} catch \(_error\) \{([\s\S]*?)^  }/gm;
    
    content = content.replace(multilineCatchPattern, (match, body) => {
      if (body.includes('error') && !body.includes('_error')) {
        fixed = true;
        return `} catch (error) {${body}  }`;
      }
      return match;
    });
    
    // Pattern 3: Fix catch blocks that reference undefined 'error' variable
    // Look for patterns like "console.error('...', error)" after "catch (_error)"
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('} catch (_error) {')) {
        // Check next few lines for 'error' usage
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('error') && !lines[j].includes('_error') && !lines[j].includes('error:')) {
            // Found usage of 'error' when we caught '_error'
            lines[i] = lines[i].replace('} catch (_error) {', '} catch (error) {');
            fixed = true;
            break;
          }
          // Stop at closing brace
          if (lines[j].match(/^  }/)) break;
        }
      }
    }
    
    if (fixed) {
      content = lines.join('\n');
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      totalFixed++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    issues.push({ file: filePath, error: error.message });
    return false;
  }
}

function validateFile(filePath) {
  try {
    const { execSync } = require('child_process');
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return { valid: true };
  } catch (error) {
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;
    return { valid: false, error: errorMsg };
  }
}

async function main() {
  console.log('🔧 Fixing catch block variable mismatches...\n');
  
  // Find all API files
  const apiFiles = glob.sync('api/**/*.js', {
    ignore: ['**/node_modules/**']
  });
  
  console.log(`📁 Found ${apiFiles.length} API files\n`);
  
  // Process each file
  for (const file of apiFiles) {
    totalFiles++;
    
    // Check for syntax errors before
    const beforeCheck = validateFile(file);
    if (!beforeCheck.valid && beforeCheck.error.includes('catch')) {
      console.log(`\n🔍 Checking: ${file}`);
      console.log(`   Error: ${beforeCheck.error.split('\n')[0]}`);
      
      // Try to fix
      const wasFixed = fixCatchBlocks(file);
      
      if (wasFixed) {
        // Validate after fix
        const afterCheck = validateFile(file);
        if (afterCheck.valid) {
          console.log(`   ✅ Syntax valid after fix!`);
        } else {
          console.log(`   ⚠️ Still has issues: ${afterCheck.error.split('\n')[0]}`);
          issues.push({ file, error: afterCheck.error });
        }
      }
    }
  }
  
  // Also check lib directory
  const libFiles = glob.sync('lib/**/*.js', {
    ignore: ['**/node_modules/**']
  });
  
  console.log(`\n📁 Checking ${libFiles.length} lib files...\n`);
  
  for (const file of libFiles) {
    totalFiles++;
    const beforeCheck = validateFile(file);
    if (!beforeCheck.valid && beforeCheck.error.includes('catch')) {
      console.log(`\n🔍 Checking: ${file}`);
      fixCatchBlocks(file);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CATCH BLOCK FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Files fixed: ${totalFixed}`);
  console.log(`📁 Total files checked: ${totalFiles}`);
  console.log(`❌ Files with remaining issues: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n⚠️ Files still with issues:');
    issues.slice(0, 10).forEach(({ file, error }) => {
      console.log(`  - ${file}`);
    });
  }
  
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});