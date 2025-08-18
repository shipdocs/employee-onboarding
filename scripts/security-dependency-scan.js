#!/usr/bin/env node

/**
 * Security Dependency Scanner
 * 
 * This script performs comprehensive dependency vulnerability scanning
 * and generates security reports for both server and client dependencies.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityDependencyScanner {
  constructor() {
    this.results = {
      server: null,
      client: null,
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        moderateCount: 0,
        lowCount: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Run npm audit and parse results
   */
  async runAudit(directory = '.', name = 'server') {
    console.log(`\n🔍 Running security audit for ${name}...`);
    
    try {
      const auditCommand = 'npm audit --audit-level=low --json';
      const cwd = path.resolve(directory);
      
      console.log(`   Directory: ${cwd}`);
      
      const result = execSync(auditCommand, { 
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const auditData = JSON.parse(result);
      this.results[name] = auditData;
      
      // Update summary
      if (auditData.metadata && auditData.metadata.vulnerabilities) {
        const vulns = auditData.metadata.vulnerabilities;
        this.results.summary.totalVulnerabilities += vulns.total || 0;
        this.results.summary.criticalCount += vulns.critical || 0;
        this.results.summary.highCount += vulns.high || 0;
        this.results.summary.moderateCount += vulns.moderate || 0;
        this.results.summary.lowCount += vulns.low || 0;
      }
      
      console.log(`   ✅ ${name} audit completed`);
      return auditData;
      
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          this.results[name] = auditData;
          
          // Update summary
          if (auditData.metadata && auditData.metadata.vulnerabilities) {
            const vulns = auditData.metadata.vulnerabilities;
            this.results.summary.totalVulnerabilities += vulns.total || 0;
            this.results.summary.criticalCount += vulns.critical || 0;
            this.results.summary.highCount += vulns.high || 0;
            this.results.summary.moderateCount += vulns.moderate || 0;
            this.results.summary.lowCount += vulns.low || 0;
          }
          
          console.log(`   ⚠️  ${name} audit completed with vulnerabilities found`);
          return auditData;
        } catch (parseError) {
          console.error(`   ❌ Failed to parse ${name} audit results:`, parseError.message);
          return null;
        }
      } else {
        console.error(`   ❌ Failed to run ${name} audit:`, error.message);
        return null;
      }
    }
  }

  /**
   * Check for outdated packages
   */
  async checkOutdated(directory = '.', name = 'server') {
    console.log(`\n📦 Checking outdated packages for ${name}...`);
    
    try {
      const outdatedCommand = 'npm outdated --json';
      const cwd = path.resolve(directory);
      
      const result = execSync(outdatedCommand, { 
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const outdatedData = JSON.parse(result || '{}');
      const outdatedCount = Object.keys(outdatedData).length;
      
      console.log(`   📊 Found ${outdatedCount} outdated packages`);
      
      if (outdatedCount > 0) {
        console.log('   Outdated packages:');
        Object.entries(outdatedData).forEach(([pkg, info]) => {
          console.log(`     - ${pkg}: ${info.current} → ${info.latest}`);
        });
      }
      
      return outdatedData;
      
    } catch (error) {
      // npm outdated returns non-zero exit code when outdated packages are found
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout || '{}');
          const outdatedCount = Object.keys(outdatedData).length;
          
          console.log(`   📊 Found ${outdatedCount} outdated packages`);
          
          if (outdatedCount > 0) {
            console.log('   Outdated packages:');
            Object.entries(outdatedData).forEach(([pkg, info]) => {
              console.log(`     - ${pkg}: ${info.current} → ${info.latest}`);
            });
          }
          
          return outdatedData;
        } catch (parseError) {
          console.log(`   ℹ️  No outdated packages found for ${name}`);
          return {};
        }
      } else {
        console.log(`   ℹ️  No outdated packages found for ${name}`);
        return {};
      }
    }
  }

  /**
   * Generate security report
   */
  generateReport() {
    console.log('\n📋 Generating Security Report...');
    
    const report = {
      ...this.results,
      generatedAt: new Date().toISOString(),
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed report
    const reportPath = path.join(__dirname, '..', 'reports', 'security-dependency-scan.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   💾 Detailed report saved to: ${reportPath}`);
    
    // Generate summary report
    this.printSummary();
    
    return report;
  }

  /**
   * Generate recommendations based on scan results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.criticalCount > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Immediately update packages with critical vulnerabilities',
        command: 'npm audit fix --force'
      });
    }
    
    if (this.results.summary.highCount > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Update packages with high severity vulnerabilities within 24 hours',
        command: 'npm audit fix'
      });
    }
    
    if (this.results.summary.moderateCount > 0) {
      recommendations.push({
        priority: 'MODERATE',
        action: 'Plan updates for moderate severity vulnerabilities within 1 week',
        command: 'npm audit fix'
      });
    }
    
    if (this.results.summary.totalVulnerabilities === 0) {
      recommendations.push({
        priority: 'INFO',
        action: 'No vulnerabilities found. Continue regular monitoring.',
        command: 'npm audit'
      });
    }
    
    return recommendations;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY DEPENDENCY SCAN SUMMARY');
    console.log('='.repeat(60));
    
    const { summary } = this.results;
    
    console.log(`📅 Scan Date: ${new Date(summary.timestamp).toLocaleString()}`);
    console.log(`📊 Total Vulnerabilities: ${summary.totalVulnerabilities}`);
    
    if (summary.totalVulnerabilities > 0) {
      console.log('\n🚨 Vulnerability Breakdown:');
      if (summary.criticalCount > 0) {
        console.log(`   🔴 Critical: ${summary.criticalCount}`);
      }
      if (summary.highCount > 0) {
        console.log(`   🟠 High: ${summary.highCount}`);
      }
      if (summary.moderateCount > 0) {
        console.log(`   🟡 Moderate: ${summary.moderateCount}`);
      }
      if (summary.lowCount > 0) {
        console.log(`   🟢 Low: ${summary.lowCount}`);
      }
    } else {
      console.log('\n✅ No vulnerabilities found!');
    }
    
    // Print recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`      Command: ${rec.command}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Return exit code based on severity
    if (summary.criticalCount > 0 || summary.highCount > 0) {
      console.log('❌ SCAN FAILED: Critical or high severity vulnerabilities found!');
      return 1;
    } else if (summary.moderateCount > 0) {
      console.log('⚠️  SCAN WARNING: Moderate severity vulnerabilities found.');
      return 0;
    } else {
      console.log('✅ SCAN PASSED: No critical vulnerabilities found.');
      return 0;
    }
  }

  /**
   * Run complete security scan
   */
  async runCompleteScan() {
    console.log('🚀 Starting Security Dependency Scan...');
    
    try {
      // Scan server dependencies
      await this.runAudit('.', 'server');
      
      // Scan client dependencies if client directory exists
      if (fs.existsSync('./client/package.json')) {
        await this.runAudit('./client', 'client');
      }
      
      // Check for outdated packages
      await this.checkOutdated('.', 'server');
      if (fs.existsSync('./client/package.json')) {
        await this.checkOutdated('./client', 'client');
      }
      
      // Generate report
      const report = this.generateReport();
      
      // Return appropriate exit code
      const exitCode = this.printSummary();
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const scanner = new SecurityDependencyScanner();
  scanner.runCompleteScan();
}

module.exports = SecurityDependencyScanner;