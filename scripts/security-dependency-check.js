#!/usr/bin/env node

/**
 * Comprehensive Security Dependency Check
 * Analyzes dependencies for known vulnerabilities and license issues
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const AUDIT_LEVEL = 'moderate';
const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense'
];

// Vulnerable packages to check for
const KNOWN_VULNERABLE_PACKAGES = {
  'event-stream': 'Contains malicious code',
  'flatmap-stream': 'Contains malicious code',
  'lodash': 'Use version >= 4.17.21',
  'minimist': 'Use version >= 1.2.6',
  'node-forge': 'Use version >= 1.3.0',
  'axios': 'Use version >= 1.10.0 (CVE-2023-45857)',
  'react-scripts': 'Contains multiple vulnerable dependencies'
};

async function runCommand(command, cwd = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

async function checkNpmAudit(directory) {
  console.log(`\n🔍 Running npm audit in ${directory}...`);
  
  const result = await runCommand(`npm audit --json`, directory);
  
  if (result.stdout) {
    try {
      const audit = JSON.parse(result.stdout);
      const vulnerabilities = audit.metadata?.vulnerabilities || {};
      
      return {
        directory,
        vulnerabilities,
        advisories: audit.advisories || {},
        total: Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      console.error(`Failed to parse audit results: ${error.message}`);
      return { directory, error: error.message };
    }
  }
  
  return { directory, error: 'No audit output' };
}

async function checkOutdated(directory) {
  console.log(`\n📦 Checking outdated packages in ${directory}...`);
  
  const result = await runCommand(`npm outdated --json`, directory);
  
  if (result.stdout) {
    try {
      const outdated = JSON.parse(result.stdout);
      return { directory, outdated };
    } catch (error) {
      // npm outdated returns empty object when all packages are up to date
      return { directory, outdated: {} };
    }
  }
  
  return { directory, outdated: {} };
}

async function checkLicenses(directory) {
  console.log(`\n📜 Checking licenses in ${directory}...`);
  
  const result = await runCommand(
    `npx license-checker --json --production`,
    directory
  );
  
  if (result.stdout) {
    try {
      const licenses = JSON.parse(result.stdout);
      const problematicLicenses = {};
      
      for (const [pkg, info] of Object.entries(licenses)) {
        const license = info.licenses || 'UNKNOWN';
        if (!ALLOWED_LICENSES.some(allowed => license.includes(allowed))) {
          problematicLicenses[pkg] = license;
        }
      }
      
      return { directory, total: Object.keys(licenses).length, problematic: problematicLicenses };
    } catch (error) {
      return { directory, error: error.message };
    }
  }
  
  return { directory, error: 'No license data' };
}

async function checkKnownVulnerabilities(directory) {
  console.log(`\n⚠️  Checking for known vulnerable packages in ${directory}...`);
  
  const packageJsonPath = path.join(directory, 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const found = {};
    
    for (const [pkg, warning] of Object.entries(KNOWN_VULNERABLE_PACKAGES)) {
      if (allDeps[pkg]) {
        found[pkg] = {
          version: allDeps[pkg],
          warning
        };
      }
    }
    
    return { directory, vulnerablePackages: found };
  } catch (error) {
    return { directory, error: error.message };
  }
}

async function generateReport(rootResults, clientResults) {
  const timestamp = new Date().toISOString();
  
  const report = `# Security Dependency Report

Generated: ${timestamp}

## Executive Summary

### Root Dependencies
- Total Vulnerabilities: ${rootResults.audit.total || 0}
- Critical: ${rootResults.audit.vulnerabilities?.critical || 0}
- High: ${rootResults.audit.vulnerabilities?.high || 0}
- Moderate: ${rootResults.audit.vulnerabilities?.moderate || 0}
- Low: ${rootResults.audit.vulnerabilities?.low || 0}

### Client Dependencies
- Total Vulnerabilities: ${clientResults.audit.total || 0}
- Critical: ${clientResults.audit.vulnerabilities?.critical || 0}
- High: ${clientResults.audit.vulnerabilities?.high || 0}
- Moderate: ${clientResults.audit.vulnerabilities?.moderate || 0}
- Low: ${clientResults.audit.vulnerabilities?.low || 0}

## Detailed Findings

### Known Vulnerable Packages

#### Root
${Object.entries(rootResults.known.vulnerablePackages || {}).map(([pkg, info]) => 
  `- **${pkg}** (${info.version}): ${info.warning}`
).join('\n') || 'None found'}

#### Client
${Object.entries(clientResults.known.vulnerablePackages || {}).map(([pkg, info]) => 
  `- **${pkg}** (${info.version}): ${info.warning}`
).join('\n') || 'None found'}

### Outdated Packages

#### Root
${Object.entries(rootResults.outdated.outdated || {}).map(([pkg, info]) => 
  `- ${pkg}: ${info.current} → ${info.wanted} (latest: ${info.latest})`
).join('\n') || 'All packages up to date'}

#### Client
${Object.entries(clientResults.outdated.outdated || {}).map(([pkg, info]) => 
  `- ${pkg}: ${info.current} → ${info.wanted} (latest: ${info.latest})`
).join('\n') || 'All packages up to date'}

### License Issues

#### Root
- Total packages: ${rootResults.licenses.total || 0}
- Problematic licenses: ${Object.keys(rootResults.licenses.problematic || {}).length}
${Object.entries(rootResults.licenses.problematic || {}).map(([pkg, license]) => 
  `  - ${pkg}: ${license}`
).join('\n') || ''}

#### Client
- Total packages: ${clientResults.licenses.total || 0}
- Problematic licenses: ${Object.keys(clientResults.licenses.problematic || {}).length}
${Object.entries(clientResults.licenses.problematic || {}).map(([pkg, license]) => 
  `  - ${pkg}: ${license}`
).join('\n') || ''}

## Recommendations

1. Run \`npm audit fix\` to automatically fix vulnerabilities
2. Update packages listed in "Known Vulnerable Packages"
3. Review and update outdated packages
4. Verify licenses for compliance with your project requirements

## Commands to Fix

\`\`\`bash
# Fix root vulnerabilities
npm audit fix

# Fix client vulnerabilities
cd client && npm audit fix

# Update specific vulnerable packages
npm install axios@latest bcrypt@latest uuid@latest
cd client && npm install axios@latest
\`\`\`
`;

  const reportPath = path.join(process.cwd(), 'SECURITY_DEPENDENCY_REPORT.md');
  await fs.writeFile(reportPath, report, 'utf8');
  
  return reportPath;
}

async function main() {
  console.log('🔒 Maritime Onboarding System - Security Dependency Check');
  console.log('========================================================\n');
  
  const rootDir = process.cwd();
  const clientDir = path.join(rootDir, 'client');
  
  // Check root dependencies
  console.log('📍 Checking root dependencies...');
  const rootResults = {
    audit: await checkNpmAudit(rootDir),
    outdated: await checkOutdated(rootDir),
    licenses: await checkLicenses(rootDir),
    known: await checkKnownVulnerabilities(rootDir)
  };
  
  // Check client dependencies
  console.log('\n📍 Checking client dependencies...');
  const clientResults = {
    audit: await checkNpmAudit(clientDir),
    outdated: await checkOutdated(clientDir),
    licenses: await checkLicenses(clientDir),
    known: await checkKnownVulnerabilities(clientDir)
  };
  
  // Generate report
  console.log('\n📝 Generating security report...');
  const reportPath = await generateReport(rootResults, clientResults);
  
  console.log(`\n✅ Security report generated: ${reportPath}`);
  
  // Summary
  const totalVulns = (rootResults.audit.total || 0) + (clientResults.audit.total || 0);
  const totalCritical = 
    (rootResults.audit.vulnerabilities?.critical || 0) + 
    (clientResults.audit.vulnerabilities?.critical || 0);
  const totalHigh = 
    (rootResults.audit.vulnerabilities?.high || 0) + 
    (clientResults.audit.vulnerabilities?.high || 0);
  
  console.log('\n🎯 Summary:');
  console.log('===========');
  console.log(`Total vulnerabilities: ${totalVulns}`);
  console.log(`Critical: ${totalCritical}`);
  console.log(`High: ${totalHigh}`);
  
  if (totalCritical > 0 || totalHigh > 0) {
    console.log('\n⚠️  Action required: Critical or high severity vulnerabilities found!');
    console.log('Run the update script: ./scripts/update-vulnerable-dependencies.sh');
    process.exit(1);
  } else if (totalVulns > 0) {
    console.log('\n⚠️  Moderate or low severity vulnerabilities found.');
    console.log('Consider running: npm audit fix');
  } else {
    console.log('\n✅ No vulnerabilities found!');
  }
}

// Run the check
main().catch(error => {
  console.error('❌ Security check failed:', error);
  process.exit(1);
});