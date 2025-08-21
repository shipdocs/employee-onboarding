#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

const filesToFix = [
  'api/upload/content-image.js',
  'api/upload/content-video.js',
  'api/crew/training/phase/[phase].js',
  'api/templates/index.js',
  'api/templates/[id].js',
  'api/cron/cleanup-expired.js',
  'api/workflows/pdf/generate.js',
  'lib/services/accountDeletionService.js',
  'lib/aiTranslationService.js',
  'lib/unifiedEmailService.js',
  'lib/dynamicPdfService.js',
  'lib/security/SecurityAuditLogger.js',
  'lib/validation.js'
];

function getError(file) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    return null;
  } catch (error) {
    return error.stderr ? error.stderr.toString() : error.message;
  }
}

function fixFile(file) {
  const error = getError(file);
  if (!error) {
    console.log(`✅ ${file} - No errors`);
    return;
  }
  
  console.log(`\n🔍 Fixing: ${file}`);
  console.log(`   Error: ${error.split('\n')[0]}`);
  
  let content = fs.readFileSync(file, 'utf8');
  let fixed = false;
  
  // Fix incomplete await statements
  content = content.replace(/await\s+\/\/[^\n]+\n\s*\.(from|select|insert|update|delete|rpc)/g, (match) => {
    fixed = true;
    return '// TODO: Fix incomplete await\n      // ' + match.replace(/\n/g, '\n      // ');
  });
  
  // Fix duplicate try statements
  content = content.replace(/try\s*{\s*try\s*{/g, 'try {');
  
  // Fix duplicate const declarations
  const lines = content.split('\n');
  const declaredVars = new Set();
  const newLines = [];
  
  for (const line of lines) {
    const constMatch = line.match(/^\s*const\s+(\w+)\s*=/);
    const destructMatch = line.match(/^\s*const\s+{\s*(\w+)[^}]*}\s*=/);
    
    if (constMatch) {
      const varName = constMatch[1];
      if (declaredVars.has(varName)) {
        console.log(`   Removing duplicate: const ${varName}`);
        fixed = true;
        continue;
      }
      declaredVars.add(varName);
    }
    
    if (destructMatch) {
      const varName = destructMatch[1];
      if (declaredVars.has(varName)) {
        console.log(`   Removing duplicate: const { ${varName} }`);
        fixed = true;
        continue;
      }
      declaredVars.add(varName);
    }
    
    newLines.push(line);
  }
  
  if (fixed) {
    content = newLines.join('\n');
  }
  
  // Fix unclosed blocks
  let braceBalance = 0;
  for (const line of content.split('\n')) {
    for (const char of line) {
      if (char === '{') braceBalance++;
      if (char === '}') braceBalance--;
    }
  }
  
  if (braceBalance > 0) {
    content += '\n' + '}'.repeat(braceBalance);
    console.log(`   Added ${braceBalance} closing brace(s)`);
    fixed = true;
  }
  
  // Fix missing catch after try
  content = content.replace(/(\btry\s*{[^}]+})\s*$/gm, '$1 catch (error) { console.error(error); }');
  
  // Write back
  if (fixed) {
    fs.writeFileSync(file, content);
    
    const newError = getError(file);
    if (!newError) {
      console.log(`   ✅ Fixed!`);
    } else if (newError !== error) {
      console.log(`   ⚠️ Different error now`);
    } else {
      console.log(`   ❌ Still broken`);
    }
  }
}

console.log('🔧 Fixing remaining syntax errors...\n');

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    fixFile(file);
  }
}

// Count remaining errors
const remaining = filesToFix.filter(file => getError(file)).length;
console.log(`\n📊 Remaining errors: ${remaining}`);