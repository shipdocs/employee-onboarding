#!/usr/bin/env node

/**
 * Vulnerability Check Script
 * Checks for known vulnerabilities in project dependencies
 */

const fs = require('fs');
const path = require('path');

// Known vulnerabilities database
const knownVulnerabilities = {
  'bcrypt': {
    vulnerabilities: [{
      id: 'CVE-2020-7689',
      affectedVersions: '<5.0.0',
      severity: 'MODERATE',
      description: 'Integer overflow causing incorrect password truncation'
    }]
  },
  'axios': {
    vulnerabilities: [{
      id: 'CVE-2024-39338',
      affectedVersions: '>=1.3.2 <1.7.4',
      severity: 'HIGH',
      description: 'Server-Side Request Forgery (SSRF) vulnerability'
    }]
  },
  'nodemailer': {
    vulnerabilities: [{
      id: 'CVE-2020-7769',
      affectedVersions: '<6.4.16',
      severity: 'HIGH',
      description: 'Command injection via crafted email addresses'
    }]
  },
  'nth-check': {
    vulnerabilities: [{
      id: 'CVE-2021-3803',
      affectedVersions: '<2.0.1',
      severity: 'HIGH',
      description: 'Regular Expression Denial of Service (ReDoS)'
    }]
  },
  'css-what': {
    vulnerabilities: [{
      id: 'CVE-2021-33587',
      affectedVersions: '<5.0.1',
      severity: 'MEDIUM',
      description: 'Regular Expression Denial of Service (ReDoS)'
    }]
  }
};

function compareVersions(current, required) {
  // Simple version comparison (doesn't handle all edge cases)
  const currentParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);
  const requiredParts = required.replace(/[^0-9.]/g, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const curr = currentParts[i] || 0;
    const req = requiredParts[i] || 0;
    if (curr < req) return -1;
    if (curr > req) return 1;
  }
  return 0;
}

function checkVulnerability(packageName, version, vulnerability) {
  const { affectedVersions } = vulnerability;
  
  if (affectedVersions.startsWith('<')) {
    const maxVersion = affectedVersions.substring(1);
    return compareVersions(version, maxVersion) < 0;
  } else if (affectedVersions.includes('>=') && affectedVersions.includes('<')) {
    const [minPart, maxPart] = affectedVersions.split(' ');
    const minVersion = minPart.substring(2);
    const maxVersion = maxPart.substring(1);
    return compareVersions(version, minVersion) >= 0 && compareVersions(version, maxVersion) < 0;
  }
  
  return false;
}

function checkPackageJson(filePath, location) {
  console.log(`\nChecking ${location}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  ${filePath} not found`);
    return [];
  }
  
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const vulnerabilities = [];
  
  for (const [packageName, version] of Object.entries(allDeps)) {
    if (knownVulnerabilities[packageName]) {
      const cleanVersion = version.replace(/[\^~]/, '');
      
      for (const vuln of knownVulnerabilities[packageName].vulnerabilities) {
        if (checkVulnerability(packageName, cleanVersion, vuln)) {
          vulnerabilities.push({
            location,
            package: packageName,
            version: cleanVersion,
            vulnerability: vuln
          });
          console.log(`  🔴 ${packageName}@${cleanVersion} - ${vuln.id} (${vuln.severity})`);
        } else {
          console.log(`  ✅ ${packageName}@${cleanVersion} - Not affected by ${vuln.id}`);
        }
      }
    }
  }
  
  return vulnerabilities;
}

function main() {
  console.log('Maritime Onboarding System - Vulnerability Check');
  console.log('================================================\n');
  
  const rootPackageJson = path.join(__dirname, 'package.json');
  const clientPackageJson = path.join(__dirname, 'client', 'package.json');
  
  const allVulnerabilities = [
    ...checkPackageJson(rootPackageJson, 'root'),
    ...checkPackageJson(clientPackageJson, 'client')
  ];
  
  console.log('\n\nSummary');
  console.log('=======');
  
  if (allVulnerabilities.length === 0) {
    console.log('✅ No known vulnerabilities found in direct dependencies!');
  } else {
    console.log(`🔴 Found ${allVulnerabilities.length} vulnerabilities:\n`);
    
    const byLocation = {};
    allVulnerabilities.forEach(v => {
      if (!byLocation[v.location]) byLocation[v.location] = [];
      byLocation[v.location].push(v);
    });
    
    for (const [location, vulns] of Object.entries(byLocation)) {
      console.log(`  ${location}:`);
      vulns.forEach(v => {
        console.log(`    - ${v.package}@${v.version}: ${v.vulnerability.id} (${v.vulnerability.severity})`);
        console.log(`      ${v.vulnerability.description}`);
      });
    }
  }
  
  console.log('\nNote: This check only covers direct dependencies.');
  console.log('Run "npm audit" for a complete analysis including transitive dependencies.');
}

main();