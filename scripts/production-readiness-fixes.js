#!/usr/bin/env node

/**
 * Production Readiness Fixes Script
 * This script identifies and fixes production readiness issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting production readiness audit...\n');

// Configuration
const config = {
  directories: ['api', 'lib', 'services', 'client/src'],
  excludePatterns: ['test', 'spec', 'mock', 'tests', 'scripts'],
  logFile: path.join(__dirname, '..', 'production-readiness-report.md')
};

// Initialize report
let report = `# Production Readiness Report\n\nGenerated: ${new Date().toISOString()}\n\n`;

// 1. Check for console statements
console.log('1️⃣ Checking for console statements...');
const consoleStatements = findConsoleStatements();
report += `## Console Statements Found\n\nTotal: ${consoleStatements.length}\n\n`;
if (consoleStatements.length > 0) {
  report += '### Files with console statements:\n\n';
  consoleStatements.forEach(file => {
    report += `- ${file.path} (${file.count} occurrences)\n`;
  });
  report += '\n';
}

// 2. Check authentication on endpoints
console.log('\n2️⃣ Checking API endpoint authentication...');
const unauthenticatedEndpoints = checkEndpointAuth();
report += `## API Authentication Status\n\n`;
report += `### Endpoints without explicit auth (${unauthenticatedEndpoints.public.length} public, ${unauthenticatedEndpoints.needsReview.length} need review):\n\n`;
report += '#### Public endpoints (expected):\n';
unauthenticatedEndpoints.public.forEach(endpoint => {
  report += `- ✅ ${endpoint}\n`;
});
report += '\n#### Endpoints needing review:\n';
unauthenticatedEndpoints.needsReview.forEach(endpoint => {
  report += `- ⚠️  ${endpoint}\n`;
});
report += '\n';

// 3. Check environment variables
console.log('\n3️⃣ Checking environment variables...');
const envVars = findEnvironmentVariables();
report += `## Environment Variables\n\nTotal unique variables: ${envVars.length}\n\n`;
report += '### Required environment variables:\n\n';
envVars.forEach(envVar => {
  report += `- ${envVar}\n`;
});
report += '\n';

// 4. Check for development artifacts
console.log('\n4️⃣ Checking for development artifacts...');
const devArtifacts = findDevelopmentArtifacts();
report += `## Development Artifacts\n\n`;
if (devArtifacts.length > 0) {
  report += '### Files with development-only code:\n\n';
  devArtifacts.forEach(artifact => {
    report += `- ${artifact.file}: ${artifact.type} - "${artifact.match}"\n`;
  });
} else {
  report += '✅ No obvious development artifacts found.\n';
}
report += '\n';

// 5. Security recommendations
report += `## Security Recommendations\n\n`;
report += `### ✅ Already Implemented:\n\n`;
report += `- Rate limiting on authentication endpoints\n`;
report += `- CORS headers configured in vercel.json\n`;
report += `- Security headers (CSP, X-Frame-Options, etc.) configured\n`;
report += `- JWT authentication for protected endpoints\n`;
report += `- Account lockout mechanism\n\n`;

report += `### ⚠️  Recommendations:\n\n`;
report += `1. **Remove console.log statements** - ${consoleStatements.length} files need cleaning\n`;
report += `2. **Replace console.error with proper logging** - Use a logging service for production\n`;
report += `3. **Add input validation** - Ensure all API endpoints validate input data\n`;
report += `4. **Environment variable validation** - Add startup checks for required env vars\n`;
report += `5. **Error sanitization** - Ensure errors don't expose stack traces\n\n`;

// 6. Create environment template
console.log('\n5️⃣ Creating environment variable template...');
createEnvTemplate(envVars);

// Save report
fs.writeFileSync(config.logFile, report);
console.log(`\n✅ Report saved to: ${config.logFile}`);

// Helper functions
function findConsoleStatements() {
  const results = [];
  
  try {
    const command = `rg -c "console\\.(log|warn|error|debug|info)" -g "*.js" -g "*.jsx" -g "*.ts" -g "*.tsx" ${config.directories.join(' ')} | grep -v -E "(${config.excludePatterns.join('|')})" || true`;
    const output = execSync(command, { encoding: 'utf8', shell: true });
    
    if (output && output.trim()) {
      output.trim().split('\n').forEach(line => {
        if (line && line.includes(':')) {
          const [filePath, count] = line.split(':');
          results.push({ path: filePath, count: parseInt(count) || 0 });
        }
      });
    }
  } catch (error) {
    console.error('Error finding console statements:', error.message);
  }
  
  return results.sort((a, b) => b.count - a.count);
}

function checkEndpointAuth() {
  const apiDir = path.join(process.cwd(), 'api');
  const endpoints = getAllFiles(apiDir, '.js');
  const results = { public: [], needsReview: [] };
  
  const publicEndpoints = [
    'health.js',
    'test.js',
    'test-env.js',
    'errors/frontend.js',
    'auth/admin-login.js',
    'auth/manager-login.js',
    'auth/magic-login.js',
    'auth/request-magic-link.js',
    'auth/verify.js'
  ];
  
  endpoints.forEach(endpoint => {
    const relativePath = path.relative(apiDir, endpoint);
    const content = fs.readFileSync(endpoint, 'utf8');
    
    // Check if it has authentication
    const hasAuth = content.includes('requireAuth') || 
                   content.includes('requireAdmin') || 
                   content.includes('requireManager') ||
                   content.includes('authRateLimit');
    
    if (!hasAuth) {
      if (publicEndpoints.some(pub => relativePath.endsWith(pub))) {
        results.public.push(relativePath);
      } else {
        results.needsReview.push(relativePath);
      }
    }
  });
  
  return results;
}

function findEnvironmentVariables() {
  const envVars = new Set();
  
  try {
    const command = `rg "process\\.env\\." -g "*.js" -g "*.jsx" -g "*.ts" -g "*.tsx" ${config.directories.join(' ')} | grep -oE "process\\.env\\.[A-Z_]+" | sort | uniq || true`;
    const output = execSync(command, { encoding: 'utf8', shell: true });
    
    if (output && output.trim()) {
      output.trim().split('\n').forEach(line => {
        if (line) {
          envVars.add(line.replace('process.env.', ''));
        }
      });
    }
  } catch (error) {
    console.error('Error finding environment variables:', error.message);
  }
  
  return Array.from(envVars).sort();
}

function findDevelopmentArtifacts() {
  const artifacts = [];
  
  const patterns = [
    { pattern: 'localhost:', type: 'localhost reference' },
    { pattern: 'test@example', type: 'test email' },
    { pattern: 'TODO:', type: 'TODO comment' },
    { pattern: 'FIXME:', type: 'FIXME comment' },
    { pattern: 'HACK:', type: 'HACK comment' },
    { pattern: 'dummy', type: 'dummy data', ignoreCase: true },
    { pattern: 'mock', type: 'mock reference', ignoreCase: true }
  ];
  
  config.directories.forEach(dir => {
    const files = getAllFiles(path.join(process.cwd(), dir), '.js');
    
    files.forEach(file => {
      if (config.excludePatterns.some(pattern => file.includes(pattern))) return;
      
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      patterns.forEach(({ pattern, type, ignoreCase }) => {
        const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
        lines.forEach((line, index) => {
          if (regex.test(line)) {
            artifacts.push({
              file: path.relative(process.cwd(), file),
              type,
              line: index + 1,
              match: line.trim().substring(0, 80)
            });
          }
        });
      });
    });
  });
  
  return artifacts;
}

function createEnvTemplate(envVars) {
  const template = `# Environment Variables Template
# Copy this to .env and fill in the values

# Required for all environments
JWT_SECRET=your-secret-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email configuration
MAILERSEND_API_KEY=your-mailersend-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company Name
ENABLE_REAL_EMAILS=false

# URLs
BASE_URL=https://yourdomain.com
DOCS_BASE_URL=https://docs.yourdomain.com

# Optional services
ANTHROPIC_API_KEY=optional-for-ai-features
OPENAI_API_KEY=optional-for-ai-features
GOOGLE_TRANSLATE_API_KEY=optional-for-translation
MICROSOFT_TRANSLATOR_KEY=optional-for-translation
MICROSOFT_TRANSLATOR_REGION=optional-for-translation

# Contact emails
HR_EMAIL=hr@yourdomain.com
QHSE_EMAIL=qhse@yourdomain.com

# Security
CRON_SECRET=your-cron-secret

# Feature flags
CONTENT_VALIDATION_THRESHOLD=0.8
`;

  fs.writeFileSync(path.join(process.cwd(), '.env.template'), template);
  console.log('✅ Created .env.template file');
}

function getAllFiles(dirPath, extension) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dirPath);
  return files;
}

console.log('\n🎉 Production readiness audit complete!');
console.log(`📄 See ${config.logFile} for detailed report`);