#!/usr/bin/env node

/**
 * Security Dashboard
 * 
 * Displays current security status and recent scan results
 */

const fs = require('fs');
const path = require('path');

class SecurityDashboard {
  constructor() {
    this.reportsDir = path.join(__dirname, '..', 'reports');
    this.securityConfig = require('../config/security-monitoring');
  }

  /**
   * Load latest security scan results
   */
  loadLatestScanResults() {
    const scanResultsPath = path.join(this.reportsDir, 'security-dependency-scan.json');
    
    if (!fs.existsSync(scanResultsPath)) {
      return null;
    }
    
    try {
      const data = fs.readFileSync(scanResultsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load scan results:', error.message);
      return null;
    }
  }

  /**
   * Get security status based on latest scan
   */
  getSecurityStatus(scanResults) {
    if (!scanResults || !scanResults.summary) {
      return {
        status: 'UNKNOWN',
        color: '⚪',
        message: 'No scan results available'
      };
    }
    
    const { summary } = scanResults;
    
    if (summary.criticalCount > 0) {
      return {
        status: 'CRITICAL',
        color: '🔴',
        message: `${summary.criticalCount} critical vulnerabilities found`
      };
    }
    
    if (summary.highCount > 0) {
      return {
        status: 'HIGH',
        color: '🟠',
        message: `${summary.highCount} high severity vulnerabilities found`
      };
    }
    
    if (summary.moderateCount > 0) {
      return {
        status: 'MODERATE',
        color: '🟡',
        message: `${summary.moderateCount} moderate severity vulnerabilities found`
      };
    }
    
    if (summary.lowCount > 0) {
      return {
        status: 'LOW',
        color: '🟢',
        message: `${summary.lowCount} low severity vulnerabilities found`
      };
    }
    
    return {
      status: 'SECURE',
      color: '✅',
      message: 'No vulnerabilities found'
    };
  }

  /**
   * Display security dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(70));
    console.log('🛡️  MARITIME ONBOARDING SYSTEM - SECURITY DASHBOARD');
    console.log('='.repeat(70));
    
    const scanResults = this.loadLatestScanResults();
    const securityStatus = this.getSecurityStatus(scanResults);
    
    // Current Security Status
    console.log('\n📊 CURRENT SECURITY STATUS');
    console.log('-'.repeat(30));
    console.log(`Status: ${securityStatus.color} ${securityStatus.status}`);
    console.log(`Message: ${securityStatus.message}`);
    
    if (scanResults && scanResults.generatedAt) {
      const lastScan = new Date(scanResults.generatedAt);
      const timeSinceLastScan = Math.floor((Date.now() - lastScan.getTime()) / (1000 * 60 * 60));
      console.log(`Last Scan: ${lastScan.toLocaleString()} (${timeSinceLastScan}h ago)`);
    }
    
    // Vulnerability Summary
    if (scanResults && scanResults.summary) {
      console.log('\n🚨 VULNERABILITY SUMMARY');
      console.log('-'.repeat(30));
      console.log(`Total Vulnerabilities: ${scanResults.summary.totalVulnerabilities}`);
      
      if (scanResults.summary.totalVulnerabilities > 0) {
        console.log(`  🔴 Critical: ${scanResults.summary.criticalCount}`);
        console.log(`  🟠 High: ${scanResults.summary.highCount}`);
        console.log(`  🟡 Moderate: ${scanResults.summary.moderateCount}`);
        console.log(`  🟢 Low: ${scanResults.summary.lowCount}`);
      }
    }
    
    // Security Thresholds
    console.log('\n⚖️  SECURITY THRESHOLDS');
    console.log('-'.repeat(30));
    const thresholds = this.securityConfig.severityThresholds;
    console.log(`Critical: Max ${thresholds.critical.maxAllowed} (Action: ${thresholds.critical.action})`);
    console.log(`High: Max ${thresholds.high.maxAllowed} (Action: ${thresholds.high.action})`);
    console.log(`Moderate: Max ${thresholds.moderate.maxAllowed} (Action: ${thresholds.moderate.action})`);
    console.log(`Low: Max ${thresholds.low.maxAllowed} (Action: ${thresholds.low.action})`);
    
    // Critical Packages Status
    console.log('\n📦 CRITICAL PACKAGES MONITORING');
    console.log('-'.repeat(30));
    console.log(`Monitoring ${this.securityConfig.criticalPackages.length} critical packages:`);
    this.securityConfig.criticalPackages.slice(0, 5).forEach(pkg => {
      console.log(`  • ${pkg}`);
    });
    if (this.securityConfig.criticalPackages.length > 5) {
      console.log(`  ... and ${this.securityConfig.criticalPackages.length - 5} more`);
    }
    
    // Scan Schedule
    console.log('\n⏰ SCAN SCHEDULE');
    console.log('-'.repeat(30));
    console.log(`Daily Scan: ${this.securityConfig.scanSchedule.daily}`);
    console.log(`Weekly Scan: ${this.securityConfig.scanSchedule.weekly}`);
    console.log(`On Push: ${this.securityConfig.scanSchedule.onPush ? 'Enabled' : 'Disabled'}`);
    
    // Recent Actions
    if (scanResults && scanResults.recommendations) {
      console.log('\n💡 RECOMMENDED ACTIONS');
      console.log('-'.repeat(30));
      scanResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   Command: ${rec.command}`);
      });
    }
    
    // Compliance Status
    console.log('\n📋 COMPLIANCE STATUS');
    console.log('-'.repeat(30));
    console.log(`Standards: ${this.securityConfig.compliance.standards.join(', ')}`);
    console.log(`Audit Frequency: ${this.securityConfig.compliance.auditRequirements.frequency}`);
    console.log(`Evidence Retention: ${this.securityConfig.compliance.auditRequirements.evidenceRetention} days`);
    
    // Quick Actions
    console.log('\n🚀 QUICK ACTIONS');
    console.log('-'.repeat(30));
    console.log('• Run security scan: npm run security:scan');
    console.log('• Fix vulnerabilities: npm audit fix');
    console.log('• Check outdated packages: npm outdated');
    console.log('• View detailed report: cat reports/security-dependency-scan.json');
    
    console.log('\n' + '='.repeat(70));
    
    // Return status for CI/CD
    return securityStatus.status;
  }

  /**
   * Check if security status meets deployment criteria
   */
  checkDeploymentReadiness() {
    const scanResults = this.loadLatestScanResults();
    const securityStatus = this.getSecurityStatus(scanResults);
    
    if (securityStatus.status === 'CRITICAL' || securityStatus.status === 'HIGH') {
      console.log('\n❌ DEPLOYMENT BLOCKED: Critical or high severity vulnerabilities found!');
      return false;
    }
    
    console.log('\n✅ DEPLOYMENT APPROVED: Security status acceptable.');
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const dashboard = new SecurityDashboard();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--check-deployment')) {
    const isReady = dashboard.checkDeploymentReadiness();
    process.exit(isReady ? 0 : 1);
  } else {
    const status = dashboard.displayDashboard();
    
    // Exit with appropriate code
    if (status === 'CRITICAL' || status === 'HIGH') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

module.exports = SecurityDashboard;