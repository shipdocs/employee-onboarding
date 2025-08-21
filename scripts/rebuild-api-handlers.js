#!/usr/bin/env node

/**
 * Rebuild broken API handlers with proper Express structure
 * This is a more aggressive approach to fix fundamentally broken files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function extractHandlerLogic(content) {
  // Try to extract the core logic from the broken file
  const lines = content.split('\n');
  const logic = [];
  let inMainLogic = false;
  
  for (const line of lines) {
    // Skip imports and module.exports lines
    if (line.includes('require(') || line.includes('module.exports')) {
      continue;
    }
    
    // Start capturing after function declaration
    if (line.includes('async') || line.includes('function')) {
      inMainLogic = true;
      continue;
    }
    
    if (inMainLogic) {
      logic.push(line);
    }
  }
  
  return logic.join('\n');
}

function rebuildHandler(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract imports
    const imports = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('require(') && !line.includes('module.exports')) {
        imports.push(line);
      }
    }
    
    // Extract the core logic
    const logic = extractHandlerLogic(content);
    
    // Rebuild with proper structure
    const rebuilt = `${imports.join('\n')}

module.exports = async function handler(req, res) {
  try {
    ${logic.trim()}
  } catch (error) {
    console.error('API Error in ${path.basename(filePath)}:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};`;
    
    fs.writeFileSync(filePath, rebuilt);
    console.log(`✅ Rebuilt: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to rebuild ${filePath}:`, error.message);
    return false;
  }
}

// List of critically broken files that need rebuilding
const brokenFiles = [
  'api/admin/security/config.js',
  'api/workflows/pdf/generate.js',
  'api/workflows/instance-steps/[stepId].js',
  'api/upload/content-video.js',
  'api/upload/content-image.js',
  'api/templates/index.js',
  'api/templates/[id].js',
  'api/health/storage.js',
  'api/crew/training/phase/[phase].js',
  'api/cron/cleanup-expired.js'
];

console.log('🔧 Rebuilding critically broken API files...\n');

for (const file of brokenFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    // Check if it's actually broken
    try {
      execSync(`node -c "${fullPath}"`, { stdio: 'pipe' });
      console.log(`✓ ${file} is valid, skipping`);
    } catch {
      // It's broken, rebuild it
      rebuildHandler(fullPath);
      
      // Validate the fix
      try {
        execSync(`node -c "${fullPath}"`, { stdio: 'pipe' });
        console.log(`  ✓ Validation passed`);
      } catch (error) {
        console.log(`  ❌ Still broken after rebuild`);
      }
    }
  }
}

console.log('\n✨ Rebuild complete');