#!/usr/bin/env node

/**
 * Fix remaining syntax errors in specific problematic files
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'api/upload/content-image.js',
    fix: (content) => {
      // Fix trailing dots
      return content.replace(/(\w+)\.\s*$/gm, '$1');
    }
  },
  {
    file: 'api/upload/content-video.js',
    fix: (content) => {
      // Fix trailing dots
      return content.replace(/(\w+)\.\s*$/gm, '$1');
    }
  },
  {
    file: 'api/templates/index.js',
    fix: (content) => {
      // Fix trailing dots in object access
      return content.replace(/(\w+)\.\s*\n/g, '$1\n');
    }
  },
  {
    file: 'api/templates/[id].js',
    fix: (content) => {
      // Fix async function issues
      return content.replace(/async\s+\(\s*req,\s*res\s*\)\s*=>\s*{/g, 'async function handler(req, res) {');
    }
  },
  {
    file: 'api/crew/training/phase/[phase].js',
    fix: (content) => {
      // Fix trailing dots
      return content.replace(/(\w+)\.\s*$/gm, '$1');
    }
  },
  {
    file: 'api/workflows/pdf/generate.js',
    fix: (content) => {
      // Fix async/await issues
      return content.replace(/await\s+\/\/.*$/gm, '// TODO: Implement this');
    }
  },
  {
    file: 'api/workflows/instance-steps/[stepId].js',
    fix: (content) => {
      // Remove duplicate imports
      const lines = content.split('\n');
      const seen = new Set();
      const filtered = lines.filter(line => {
        if (line.includes('const { db }') || line.includes('const db =')) {
          if (seen.has('db')) return false;
          seen.add('db');
        }
        return true;
      });
      return filtered.join('\n');
    }
  },
  {
    file: 'api/cron/cleanup-expired.js',
    fix: (content) => {
      // Fix unmatched braces
      let braceCount = 0;
      const lines = content.split('\n');
      const result = [];
      
      for (const line of lines) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        result.push(line);
      }
      
      // Add missing closing braces
      while (braceCount > 0) {
        result.push('}');
        braceCount--;
      }
      
      return result.join('\n');
    }
  },
  {
    file: 'api/admin/security/config.js',
    fix: (content) => {
      // Fix the supabase references
      content = content.replace(/await supabase/g, 'await db');
      content = content.replace(/supabase\s*\.\s*from\(['"]\w+['"]\)/g, 'db');
      return content;
    }
  }
];

console.log('🔧 Fixing remaining syntax errors...\n');

for (const { file, fix } of fixes) {
  try {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${file}`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fix(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`ℹ️ No changes needed: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
}

console.log('\n✨ Done!');