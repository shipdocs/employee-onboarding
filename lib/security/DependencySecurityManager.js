/**
 * Dependency Security Manager
 * 
 * Provides comprehensive dependency vulnerability scanning, management,
 * and automated remediation capabilities.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencySecurityManager {
  constructor() {
    this.scanResults = new Map();
    this.vulnerabilityDatabase = new Map();
    this.remediationQueue = [];
    this.scanHistory = [];
  }

  /**
   * Run comprehensive dependency security scan
   */
  async runComprehensiveScan(options = {}) {
    const {
      includeClient = true,
      scanLevel = 'moderate', // low, moderate, high, critical
      generateReport = true,
      autoRemediate = false
    } = options;

    console.log('🔍 Starting comprehensive dependency security scan...');
    
    const scanId = `scan-${Date.now()}`;
    const scanResults = {
      id: scanId,
      timestamp: new Date().toISOString(),
      scanLevel,
      results: {
        server: null,
        client: null
      },
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        packagesScanned: 0,
        vulnerablePackages: 0
      },
      recommendations: [],
      remediationActions: []
    };

    try {
      // Scan server dependencies
      console.log('📦 Scanning server dependencies...');
      scanResults.results.server = await this.scanDependencies('.', 'server');
      
      // Scan client dependencies if requested
      if (includeClient && fs.existsSync('./client/package.json')) {
        console.log('🎨 Scanning client dependencies...');
        scanResults.results.client = await this.scanDependencies('./client', 'client');
      }

      // Aggregate results
      this.aggregateScanResults(scanResults);

      // Generate recommendations
      scanResults.recommendations = this.generateRecommendations(scanResults);

      // Generate remediation actions
      scanResults.remediationActions = await this.generateRemediationActions(scanResults);

      // Store scan results
      this.scanResults.set(scanId, scanResults);
      this.scanHistory.push({
        id: scanId,
        timestamp: scanResults.timestamp,
        summary: scanResults.summary
      });

      // Auto-remediate if requested
      if (autoRemediate) {
        await this.executeAutoRemediation(scanResults);
      }

      // Generate report if requested
      if (generateReport) {
        await this.generateSecurityReport(scanResults);
      }

      console.log(`✅ Dependency scan completed: ${scanResults.summary.totalVulnerabilities} vulnerabilities found`);
      return scanResults;

    } catch (error) {
      console.error('❌ Dependency scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan dependencies in a specific directory
   */
  async scanDependencies(directory, type) {
    const results = {
      type,
      directory,
      npmAudit: null,
      packageInfo: null,
      vulnerabilities: [],
      outdatedPackages: []
    };

    try {
      // Get package information
      const packageJsonPath = path.join(directory, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        results.packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      }

      // Run npm audit
      try {
        const auditCommand = `cd ${directory} && npm audit --audit-level=low --json`;
        const auditOutput = execSync(auditCommand, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        results.npmAudit = JSON.parse(auditOutput);
      } catch (error) {
        // npm audit returns non-zero exit code when vulnerabilities are found
        if (error.stdout) {
          try {
            results.npmAudit = JSON.parse(error.stdout);
          } catch (parseError) {
            console.warn(`Failed to parse npm audit output for ${type}:`, parseError.message);
          }
        }
      }

      // Extract vulnerabilities from audit results
      if (results.npmAudit && results.npmAudit.vulnerabilities) {
        results.vulnerabilities = this.extractVulnerabilities(results.npmAudit.vulnerabilities);
      }

      // Check for outdated packages
      try {
        const outdatedCommand = `cd ${directory} && npm outdated --json`;
        const outdatedOutput = execSync(outdatedCommand, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        results.outdatedPackages = JSON.parse(outdatedOutput || '{}');
      } catch (error) {
        // npm outdated returns non-zero exit code when outdated packages are found
        if (error.stdout) {
          try {
            results.outdatedPackages = JSON.parse(error.stdout || '{}');
          } catch (parseError) {
            results.outdatedPackages = {};
          }
        }
      }

      return results;

    } catch (error) {
      console.error(`Failed to scan dependencies in ${directory}:`, error);
      throw error;
    }
  }

  /**
   * Extract vulnerability information from npm audit results
   */
  extractVulnerabilities(vulnerabilities) {
    const extracted = [];

    Object.entries(vulnerabilities).forEach(([packageName, vulnData]) => {
      if (vulnData.via && Array.isArray(vulnData.via)) {
        vulnData.via.forEach(via => {
          if (typeof via === 'object' && via.source) {
            extracted.push({
              package: packageName,
              title: via.title || 'Unknown vulnerability',
              severity: via.severity || 'unknown',
              cve: via.source || null,
              url: via.url || null,
              range: via.range || 'unknown',
              fixAvailable: vulnData.fixAvailable || false,
              isDirect: vulnData.isDirect || false,
              effects: vulnData.effects || []
            });
          }
        });
      }
    });

    return extracted;
  }

  /**
   * Aggregate scan results from multiple sources
   */
  aggregateScanResults(scanResults) {
    const summary = scanResults.summary;

    [scanResults.results.server, scanResults.results.client].forEach(result => {
      if (!result || !result.npmAudit) return;

      const metadata = result.npmAudit.metadata;
      if (metadata && metadata.vulnerabilities) {
        summary.totalVulnerabilities += metadata.vulnerabilities.total || 0;
        summary.criticalCount += metadata.vulnerabilities.critical || 0;
        summary.highCount += metadata.vulnerabilities.high || 0;
        summary.mediumCount += metadata.vulnerabilities.moderate || 0;
        summary.lowCount += metadata.vulnerabilities.low || 0;
      }

      if (metadata && metadata.dependencies) {
        summary.packagesScanned += metadata.dependencies.total || 0;
        summary.vulnerablePackages += metadata.dependencies.vulnerable || 0;
      }
    });
  }

  /**
   * Generate security recommendations based on scan results
   */
  generateRecommendations(scanResults) {
    const recommendations = [];
    const { summary } = scanResults;

    if (summary.criticalCount > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Immediate Action Required',
        title: `${summary.criticalCount} Critical Vulnerabilities Found`,
        description: 'Critical vulnerabilities pose immediate security risks and should be addressed immediately.',
        actions: [
          'Run npm audit fix --force to attempt automatic fixes',
          'Manually update packages if automatic fixes fail',
          'Consider temporarily disabling affected features if fixes are not available'
        ],
        commands: ['npm audit fix --force'],
        timeframe: 'Immediate (within 4 hours)'
      });
    }

    if (summary.highCount > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security Risk',
        title: `${summary.highCount} High Severity Vulnerabilities Found`,
        description: 'High severity vulnerabilities should be addressed within 24 hours.',
        actions: [
          'Run npm audit fix to attempt automatic fixes',
          'Review and test fixes in development environment',
          'Deploy fixes to production within 24 hours'
        ],
        commands: ['npm audit fix'],
        timeframe: 'Within 24 hours'
      });
    }

    if (summary.mediumCount > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Security Improvement',
        title: `${summary.mediumCount} Medium Severity Vulnerabilities Found`,
        description: 'Medium severity vulnerabilities should be addressed within one week.',
        actions: [
          'Schedule time to review and fix vulnerabilities',
          'Test fixes thoroughly before deployment',
          'Consider updating to latest package versions'
        ],
        commands: ['npm audit fix', 'npm update'],
        timeframe: 'Within 1 week'
      });
    }

    if (summary.lowCount > 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'Maintenance',
        title: `${summary.lowCount} Low Severity Vulnerabilities Found`,
        description: 'Low severity vulnerabilities can be addressed during regular maintenance.',
        actions: [
          'Include fixes in next scheduled maintenance window',
          'Review if packages can be updated to latest versions',
          'Consider alternative packages if fixes are not available'
        ],
        commands: ['npm audit fix', 'npm update'],
        timeframe: 'Next maintenance window'
      });
    }

    if (summary.totalVulnerabilities === 0) {
      recommendations.push({
        priority: 'INFO',
        category: 'All Clear',
        title: 'No Vulnerabilities Found',
        description: 'All dependencies are up to date and secure.',
        actions: [
          'Continue regular dependency scanning',
          'Keep dependencies updated',
          'Monitor for new vulnerabilities'
        ],
        commands: [],
        timeframe: 'Ongoing'
      });
    }

    return recommendations;
  }

  /**
   * Generate automated remediation actions
   */
  async generateRemediationActions(scanResults) {
    const actions = [];

    // Analyze vulnerabilities and generate specific remediation actions
    [scanResults.results.server, scanResults.results.client].forEach(result => {
      if (!result || !result.vulnerabilities) return;

      result.vulnerabilities.forEach(vuln => {
        if (vuln.fixAvailable) {
          actions.push({
            type: 'update_package',
            package: vuln.package,
            severity: vuln.severity,
            description: `Update ${vuln.package} to fix ${vuln.title}`,
            command: vuln.isDirect ? `npm update ${vuln.package}` : 'npm audit fix',
            automated: vuln.severity === 'critical' || vuln.severity === 'high',
            directory: result.directory
          });
        } else {
          actions.push({
            type: 'manual_review',
            package: vuln.package,
            severity: vuln.severity,
            description: `Manual review required for ${vuln.package}: ${vuln.title}`,
            command: null,
            automated: false,
            directory: result.directory,
            alternatives: [] // Would be populated by this.findPackageAlternatives(vuln.package)
          });
        }
      });
    });

    return actions;
  }

  /**
   * Execute automated remediation actions
   */
  async executeAutoRemediation(scanResults) {
    console.log('🔧 Executing automated remediation...');

    const automatedActions = scanResults.remediationActions.filter(action => action.automated);
    
    for (const action of automatedActions) {
      try {
        console.log(`Executing: ${action.description}`);
        
        if (action.command) {
          const fullCommand = `cd ${action.directory} && ${action.command}`;
          execSync(fullCommand, { stdio: 'inherit' });
          
          action.status = 'completed';
          action.executedAt = new Date().toISOString();
        }
      } catch (error) {
        console.error(`Failed to execute ${action.description}:`, error.message);
        action.status = 'failed';
        action.error = error.message;
      }
    }

    console.log(`✅ Automated remediation completed: ${automatedActions.length} actions executed`);
  }

  /**
   * Find alternative packages for vulnerable dependencies
   */
  async findPackageAlternatives(packageName) {
    // This would integrate with npm registry API or other package databases
    // For now, return a placeholder
    return [
      {
        name: `${packageName}-alternative`,
        description: 'Alternative package with similar functionality',
        popularity: 'unknown',
        lastUpdated: 'unknown'
      }
    ];
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(scanResults) {
    const reportPath = path.join(__dirname, '..', '..', 'reports', 'dependency-security-report.json');
    const reportsDir = path.dirname(reportPath);

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Enhanced report with additional metadata
    const report = {
      ...scanResults,
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0',
      scanConfiguration: {
        includeClient: true,
        scanLevel: scanResults.scanLevel,
        autoRemediate: false
      },
      systemInfo: {
        nodeVersion: process.version,
        npmVersion: this.getNpmVersion(),
        platform: process.platform,
        arch: process.arch
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate a human-readable summary
    const summaryPath = path.join(reportsDir, 'dependency-security-summary.txt');
    const summary = this.generateHumanReadableSummary(report);
    fs.writeFileSync(summaryPath, summary);

    console.log(`📄 Security report saved to: ${reportPath}`);
    console.log(`📄 Summary report saved to: ${summaryPath}`);

    return report;
  }

  /**
   * Generate human-readable summary
   */
  generateHumanReadableSummary(report) {
    const { summary, recommendations } = report;
    
    let summaryText = `
DEPENDENCY SECURITY SCAN REPORT
===============================
Generated: ${new Date(report.generatedAt).toLocaleString()}
Scan ID: ${report.id}

SUMMARY
-------
Total Vulnerabilities: ${summary.totalVulnerabilities}
Critical: ${summary.criticalCount}
High: ${summary.highCount}
Medium: ${summary.mediumCount}
Low: ${summary.lowCount}

Packages Scanned: ${summary.packagesScanned}
Vulnerable Packages: ${summary.vulnerablePackages}

RECOMMENDATIONS
---------------
`;

    recommendations.forEach((rec, index) => {
      summaryText += `
${index + 1}. [${rec.priority}] ${rec.title}
   ${rec.description}
   Timeframe: ${rec.timeframe}
   Actions:
${rec.actions.map(action => `   - ${action}`).join('\n')}
`;
    });

    return summaryText;
  }

  /**
   * Get npm version
   */
  getNpmVersion() {
    try {
      return execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get scan history
   */
  getScanHistory(limit = 10) {
    return this.scanHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get specific scan results
   */
  getScanResults(scanId) {
    return this.scanResults.get(scanId);
  }

  /**
   * Get vulnerability statistics
   */
  getVulnerabilityStatistics() {
    const latestScan = this.scanHistory[this.scanHistory.length - 1];
    if (!latestScan) {
      return {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        lastScanDate: null
      };
    }

    return {
      ...latestScan.summary,
      lastScanDate: latestScan.timestamp
    };
  }

  /**
   * Schedule automated scans
   */
  scheduleAutomatedScans(intervalHours = 24) {
    console.log(`📅 Scheduling automated dependency scans every ${intervalHours} hours`);
    
    setInterval(async () => {
      try {
        console.log('🔄 Running scheduled dependency scan...');
        await this.runComprehensiveScan({
          generateReport: true,
          autoRemediate: false // Don't auto-remediate in scheduled scans
        });
      } catch (error) {
        console.error('Scheduled dependency scan failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

// Singleton instance
let dependencySecurityManagerInstance = null;

/**
 * Get singleton instance of DependencySecurityManager
 */
function getDependencySecurityManager() {
  if (!dependencySecurityManagerInstance) {
    dependencySecurityManagerInstance = new DependencySecurityManager();
  }
  return dependencySecurityManagerInstance;
}

module.exports = {
  DependencySecurityManager,
  getDependencySecurityManager
};