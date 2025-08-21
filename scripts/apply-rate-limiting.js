#!/usr/bin/env node
// scripts/apply-rate-limiting.js - Apply rate limiting to API endpoints

const fs = require('fs');
const path = require('path');

/**
 * Configuration for different endpoint types and their rate limits
 */
const ENDPOINT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    pattern: /api\/(auth|login|register|reset-password)/,
    rateLimit: 'authRateLimit',
    description: 'Authentication endpoints'
  },
  
  // File upload endpoints - moderate limits
  upload: {
    pattern: /api\/(upload|pdf|templates.*preview)/,
    rateLimit: 'uploadRateLimit',
    description: 'File upload and processing endpoints'
  },
  
  // Email endpoints - strict limits
  email: {
    pattern: /api\/email/,
    rateLimit: 'emailRateLimit',
    description: 'Email sending endpoints'
  },
  
  // Admin endpoints - moderate limits
  admin: {
    pattern: /api\/(admin|manager|templates|workflows.*edit)/,
    rateLimit: 'adminRateLimit',
    description: 'Administrative endpoints'
  },
  
  // Training/quiz endpoints - moderate limits
  training: {
    pattern: /api\/(crew|training|quiz|workflows.*instances)/,
    rateLimit: 'trainingRateLimit',
    description: 'Training and quiz endpoints'
  },
  
  // Search endpoints - moderate limits
  search: {
    pattern: /api\/(search|find|lookup)/,
    rateLimit: 'searchRateLimit',
    description: 'Search endpoints'
  },
  
  // Webhook endpoints - higher limits
  webhook: {
    pattern: /api\/(webhook|csp-report)/,
    rateLimit: 'webhookRateLimit',
    description: 'Webhook endpoints'
  },
  
  // General API endpoints - standard limits
  api: {
    pattern: /.*/,
    rateLimit: 'apiRateLimit',
    description: 'General API endpoints'
  }
};

/**
 * Endpoints that should be excluded from rate limiting
 */
const EXCLUDED_ENDPOINTS = [
  /api\/cron\//,           // Cron jobs
  /api\/health/,           // Health checks
  /api\/debug\/auth-test/, // Debug endpoints (already have their own protection)
  /api\/security\/rate-limit/ // Rate limit management endpoints (already protected)
];

/**
 * Find all API endpoint files
 */
function findAPIEndpoints() {
  const apiDir = path.join(process.cwd(), 'api');
  const endpoints = [];
  
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath, itemRelativePath);
      } else if (item.endsWith('.js')) {
        const endpointPath = itemRelativePath.replace(/\\/g, '/');
        endpoints.push({
          filePath: fullPath,
          relativePath: itemRelativePath,
          endpointPath: endpointPath,
          urlPath: `/api/${endpointPath.replace('.js', '')}`
        });
      }
    }
  }
  
  scanDirectory(apiDir);
  return endpoints;
}

/**
 * Analyze an endpoint file to determine its current rate limiting status
 */
function analyzeEndpoint(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const analysis = {
      hasRateLimit: false,
      rateLimitType: null,
      hasAuth: false,
      authType: null,
      isExcluded: false,
      needsRateLimit: true,
      content: content
    };
    
    // Check for existing rate limiting
    const rateLimitPatterns = [
      /authRateLimit/,
      /uploadRateLimit/,
      /apiRateLimit/,
      /adminRateLimit/,
      /emailRateLimit/,
      /trainingRateLimit/,
      /searchRateLimit/,
      /webhookRateLimit/,
      /withRateLimit/,
      /rateLimit\(/
    ];
    
    for (const pattern of rateLimitPatterns) {
      if (pattern.test(content)) {
        analysis.hasRateLimit = true;
        analysis.rateLimitType = pattern.source.replace(/[\/\\]/g, '');
        break;
      }
    }
    
    // Check for authentication
    const authPatterns = [
      { pattern: /requireAuth/, type: 'requireAuth' },
      { pattern: /requireAdmin/, type: 'requireAdmin' },
      { pattern: /requireManager/, type: 'requireManager' },
      { pattern: /requireCrew/, type: 'requireCrew' },
      { pattern: /authenticateToken/, type: 'authenticateToken' }
    ];
    
    for (const { pattern, type } of authPatterns) {
      if (pattern.test(content)) {
        analysis.hasAuth = true;
        analysis.authType = type;
        break;
      }
    }
    
    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Determine the appropriate rate limit for an endpoint
 */
function determineRateLimit(endpoint) {
  const urlPath = endpoint.urlPath;
  
  // Check if endpoint should be excluded
  for (const excludePattern of EXCLUDED_ENDPOINTS) {
    if (excludePattern.test(urlPath)) {
      return { excluded: true, reason: 'Excluded endpoint type' };
    }
  }
  
  // Find matching configuration
  for (const [configName, config] of Object.entries(ENDPOINT_CONFIGS)) {
    if (config.pattern.test(urlPath)) {
      return {
        excluded: false,
        configName: configName,
        rateLimit: config.rateLimit,
        description: config.description
      };
    }
  }
  
  // Default to API rate limit
  return {
    excluded: false,
    configName: 'api',
    rateLimit: 'apiRateLimit',
    description: 'General API endpoints'
  };
}

/**
 * Generate the updated content for an endpoint file
 */
function generateUpdatedContent(endpoint, analysis, rateLimitConfig) {
  let content = analysis.content;
  
  // Add rate limit import if not present
  const hasRateLimitImport = /require.*rateLimit/.test(content) || 
                            /from.*rateLimit/.test(content);
  
  if (!hasRateLimitImport) {
    // Find the last require statement to add the import after it
    const requireLines = content.split('\n').filter(line => 
      line.includes('require(') && !line.includes('//'));
    
    if (requireLines.length > 0) {
      const lastRequire = requireLines[requireLines.length - 1];
      const importStatement = `const { ${rateLimitConfig.rateLimit} } = require('../../lib/rateLimit');`;
      content = content.replace(lastRequire, `${lastRequire}\n${importStatement}`);
    } else {
      // Add at the top if no requires found
      content = `const { ${rateLimitConfig.rateLimit} } = require('../../lib/rateLimit');\n\n${content}`;
    }
  }
  
  // Wrap the module.exports with rate limiting
  const moduleExportsPattern = /module\.exports\s*=\s*(.+);?$/m;
  const match = content.match(moduleExportsPattern);
  
  if (match) {
    const exportedValue = match[1];
    
    // Check if it's already wrapped with rate limiting
    if (!exportedValue.includes('RateLimit(')) {
      const newExport = `module.exports = ${rateLimitConfig.rateLimit}(${exportedValue});`;
      content = content.replace(moduleExportsPattern, newExport);
    }
  }
  
  return content;
}

/**
 * Main function to analyze and apply rate limiting
 */
async function main() {
  console.log('🔍 Analyzing API endpoints for rate limiting...\n');
  
  const endpoints = findAPIEndpoints();
  const results = {
    total: endpoints.length,
    hasRateLimit: 0,
    needsRateLimit: 0,
    excluded: 0,
    updated: 0,
    errors: []
  };
  
  const endpointAnalysis = [];
  
  // Analyze all endpoints
  for (const endpoint of endpoints) {
    const analysis = analyzeEndpoint(endpoint.filePath);
    if (!analysis) {
      results.errors.push(`Failed to analyze ${endpoint.relativePath}`);
      continue;
    }
    
    const rateLimitConfig = determineRateLimit(endpoint);
    
    const endpointInfo = {
      ...endpoint,
      analysis,
      rateLimitConfig,
      needsUpdate: !analysis.hasRateLimit && !rateLimitConfig.excluded
    };
    
    endpointAnalysis.push(endpointInfo);
    
    // Update counters
    if (analysis.hasRateLimit) {
      results.hasRateLimit++;
    }
    if (rateLimitConfig.excluded) {
      results.excluded++;
    }
    if (endpointInfo.needsUpdate) {
      results.needsRateLimit++;
    }
  }
  
  // Display analysis results
  console.log('📊 Analysis Results:');
  console.log(`   Total endpoints: ${results.total}`);
  console.log(`   Already have rate limiting: ${results.hasRateLimit}`);
  console.log(`   Excluded from rate limiting: ${results.excluded}`);
  console.log(`   Need rate limiting: ${results.needsRateLimit}`);
  console.log('');
  
  // Show endpoints that need rate limiting
  const needsRateLimit = endpointAnalysis.filter(e => e.needsUpdate);
  if (needsRateLimit.length > 0) {
    console.log('🚨 Endpoints needing rate limiting:');
    for (const endpoint of needsRateLimit) {
      console.log(`   ${endpoint.urlPath} -> ${endpoint.rateLimitConfig.rateLimit}`);
    }
    console.log('');
  }
  
  // Show excluded endpoints
  const excluded = endpointAnalysis.filter(e => e.rateLimitConfig.excluded);
  if (excluded.length > 0) {
    console.log('⚪ Excluded endpoints:');
    for (const endpoint of excluded) {
      console.log(`   ${endpoint.urlPath} -> ${endpoint.rateLimitConfig.reason}`);
    }
    console.log('');
  }
  
  // Ask for confirmation to apply changes
  if (needsRateLimit.length > 0) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`Apply rate limiting to ${needsRateLimit.length} endpoints? (y/N): `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🔧 Applying rate limiting...');
      
      for (const endpoint of needsRateLimit) {
        try {
          const updatedContent = generateUpdatedContent(
            endpoint, 
            endpoint.analysis, 
            endpoint.rateLimitConfig
          );
          
          // Create backup
          const backupPath = `${endpoint.filePath}.backup`;
          fs.writeFileSync(backupPath, endpoint.analysis.content);
          
          // Write updated content
          fs.writeFileSync(endpoint.filePath, updatedContent);
          
          console.log(`   ✅ Updated ${endpoint.relativePath}`);
          results.updated++;
        } catch (error) {
          console.error(`   ❌ Failed to update ${endpoint.relativePath}:`, error.message);
          results.errors.push(`Failed to update ${endpoint.relativePath}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Applied rate limiting to ${results.updated} endpoints`);
      
      if (results.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        for (const error of results.errors) {
          console.log(`   ${error}`);
        }
      }
    } else {
      console.log('❌ Rate limiting application cancelled');
    }
  } else {
    console.log('✅ All endpoints already have appropriate rate limiting');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  findAPIEndpoints,
  analyzeEndpoint,
  determineRateLimit,
  generateUpdatedContent,
  ENDPOINT_CONFIGS,
  EXCLUDED_ENDPOINTS
};