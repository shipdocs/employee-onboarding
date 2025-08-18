#!/usr/bin/env node

/**
 * Dependency Security CLI
 * 
 * Command-line interface for dependency vulnerability scanning and management.
 */

const { program } = require('commander');
const { getDependencySecurityManager } = require('../lib/security/DependencySecurityManager');

program
  .name('dependency-security')
  .description('Dependency security management CLI tool')
  .version('1.0.0');

program
  .command('scan')
  .description('Run comprehensive dependency security scan')
  .option('-c, --include-client', 'Include client dependencies in scan', true)
  .option('-l, --level <level>', 'Scan level (low, moderate, high, critical)', 'moderate')
  .option('-r, --report', 'Generate detailed report', true)
  .option('-a, --auto-remediate', 'Automatically fix vulnerabilities where possible', false)
  .action(async (options) => {
    const manager = getDependencySecurityManager();
    
    console.log('🔍 Starting dependency security scan...');
    console.log(`Scan level: ${options.level}`);
    console.log(`Include client: ${options.includeClient}`);
    console.log(`Auto-remediate: ${options.autoRemediate}`);
    
    try {
      const results = await manager.runComprehensiveScan({
        includeClient: options.includeClient,
        scanLevel: options.level,
        generateReport: options.report,
        autoRemediate: options.autoRemediate
      });
      
      console.log('\n📊 Scan Results:');
      console.log(`Total Vulnerabilities: ${results.summary.totalVulnerabilities}`);
      console.log(`Critical: ${results.summary.criticalCount}`);
      console.log(`High: ${results.summary.highCount}`);
      console.log(`Medium: ${results.summary.mediumCount}`);
      console.log(`Low: ${results.summary.lowCount}`);
      
      if (results.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        results.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
          console.log(`   ${rec.description}`);
          console.log(`   Timeframe: ${rec.timeframe}`);
        });
      }
      
      if (results.remediationActions.length > 0) {
        console.log('\n🔧 Available Remediation Actions:');
        results.remediationActions.forEach((action, index) => {
          const status = action.automated ? '🤖 AUTO' : '👤 MANUAL';
          console.log(`${index + 1}. ${status} ${action.description}`);
          if (action.command) {
            console.log(`   Command: ${action.command}`);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Show scan history')
  .option('-l, --limit <number>', 'Limit number of results', '10')
  .action(async (options) => {
    const manager = getDependencySecurityManager();
    const history = manager.getScanHistory(parseInt(options.limit));
    
    if (history.length === 0) {
      console.log('No scan history found. Run a scan first with: dependency-security scan');
      return;
    }
    
    console.log('\n📅 Scan History:');
    console.log('='.repeat(80));
    
    history.forEach((scan, index) => {
      const date = new Date(scan.timestamp).toLocaleString();
      console.log(`${index + 1}. ${scan.id}`);
      console.log(`   Date: ${date}`);
      console.log(`   Vulnerabilities: ${scan.summary.totalVulnerabilities} (Critical: ${scan.summary.criticalCount}, High: ${scan.summary.highCount})`);
      console.log('');
    });
  });

program
  .command('show <scanId>')
  .description('Show detailed results for a specific scan')
  .action(async (scanId) => {
    const manager = getDependencySecurityManager();
    const results = manager.getScanResults(scanId);
    
    if (!results) {
      console.error(`❌ Scan results not found: ${scanId}`);
      process.exit(1);
    }
    
    console.log(`\n📋 Scan Results: ${scanId}`);
    console.log('='.repeat(50));
    console.log(`Date: ${new Date(results.timestamp).toLocaleString()}`);
    console.log(`Scan Level: ${results.scanLevel}`);
    
    console.log('\n📊 Summary:');
    console.log(`Total Vulnerabilities: ${results.summary.totalVulnerabilities}`);
    console.log(`Critical: ${results.summary.criticalCount}`);
    console.log(`High: ${results.summary.highCount}`);
    console.log(`Medium: ${results.summary.mediumCount}`);
    console.log(`Low: ${results.summary.lowCount}`);
    console.log(`Packages Scanned: ${results.summary.packagesScanned}`);
    console.log(`Vulnerable Packages: ${results.summary.vulnerablePackages}`);
    
    if (results.results.server && results.results.server.vulnerabilities.length > 0) {
      console.log('\n🖥️  Server Vulnerabilities:');
      results.results.server.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.package}`);
        console.log(`   ${vuln.title}`);
        if (vuln.cve) console.log(`   CVE: ${vuln.cve}`);
        if (vuln.fixAvailable) console.log(`   ✅ Fix available`);
        console.log('');
      });
    }
    
    if (results.results.client && results.results.client.vulnerabilities.length > 0) {
      console.log('\n🎨 Client Vulnerabilities:');
      results.results.client.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.package}`);
        console.log(`   ${vuln.title}`);
        if (vuln.cve) console.log(`   CVE: ${vuln.cve}`);
        if (vuln.fixAvailable) console.log(`   ✅ Fix available`);
        console.log('');
      });
    }
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Timeframe: ${rec.timeframe}`);
        if (rec.commands.length > 0) {
          console.log(`   Commands: ${rec.commands.join(', ')}`);
        }
        console.log('');
      });
    }
  });

program
  .command('fix')
  .description('Execute automated remediation actions')
  .option('-s, --scan-id <scanId>', 'Scan ID to fix (uses latest if not specified)')
  .option('-f, --force', 'Force execution of all automated actions', false)
  .action(async (options) => {
    const manager = getDependencySecurityManager();
    
    let scanId = options.scanId;
    if (!scanId) {
      const history = manager.getScanHistory(1);
      if (history.length === 0) {
        console.error('❌ No scan results found. Run a scan first.');
        process.exit(1);
      }
      scanId = history[0].id;
    }
    
    const results = manager.getScanResults(scanId);
    if (!results) {
      console.error(`❌ Scan results not found: ${scanId}`);
      process.exit(1);
    }
    
    const automatedActions = results.remediationActions.filter(action => action.automated);
    
    if (automatedActions.length === 0) {
      console.log('ℹ️  No automated remediation actions available.');
      console.log('Manual review may be required for some vulnerabilities.');
      return;
    }
    
    console.log(`🔧 Found ${automatedActions.length} automated remediation actions:`);
    automatedActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.description}`);
    });
    
    if (!options.force) {
      console.log('\nUse --force to execute these actions automatically.');
      return;
    }
    
    console.log('\n🚀 Executing automated remediation...');
    
    try {
      await manager.executeAutoRemediation(results);
      console.log('✅ Automated remediation completed successfully!');
      console.log('💡 Run another scan to verify fixes: dependency-security scan');
    } catch (error) {
      console.error('❌ Remediation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show vulnerability statistics')
  .action(async () => {
    const manager = getDependencySecurityManager();
    const stats = manager.getVulnerabilityStatistics();
    
    console.log('\n📊 Vulnerability Statistics:');
    console.log('='.repeat(30));
    console.log(`Total Vulnerabilities: ${stats.totalVulnerabilities}`);
    console.log(`Critical: ${stats.criticalCount}`);
    console.log(`High: ${stats.highCount}`);
    console.log(`Medium: ${stats.mediumCount}`);
    console.log(`Low: ${stats.lowCount}`);
    
    if (stats.lastScanDate) {
      console.log(`Last Scan: ${new Date(stats.lastScanDate).toLocaleString()}`);
    } else {
      console.log('Last Scan: Never');
    }
    
    // Security status
    if (stats.criticalCount > 0) {
      console.log('\n🚨 STATUS: CRITICAL - Immediate action required!');
    } else if (stats.highCount > 0) {
      console.log('\n⚠️  STATUS: HIGH RISK - Address within 24 hours');
    } else if (stats.mediumCount > 0) {
      console.log('\n🟡 STATUS: MEDIUM RISK - Address within 1 week');
    } else if (stats.lowCount > 0) {
      console.log('\n🟢 STATUS: LOW RISK - Address during maintenance');
    } else {
      console.log('\n✅ STATUS: SECURE - No vulnerabilities found');
    }
  });

program
  .command('schedule')
  .description('Schedule automated dependency scans')
  .option('-i, --interval <hours>', 'Scan interval in hours', '24')
  .option('-d, --disable', 'Disable scheduled scans', false)
  .action(async (options) => {
    const manager = getDependencySecurityManager();
    
    if (options.disable) {
      console.log('⏹️  Scheduled scans disabled');
      // Would disable scheduled scans
      return;
    }
    
    const intervalHours = parseInt(options.interval);
    console.log(`📅 Scheduling automated scans every ${intervalHours} hours...`);
    
    try {
      manager.scheduleAutomatedScans(intervalHours);
      console.log('✅ Automated scans scheduled successfully!');
      console.log(`Next scan will run in ${intervalHours} hours`);
    } catch (error) {
      console.error('❌ Failed to schedule scans:', error.message);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate and display security report')
  .option('-s, --scan-id <scanId>', 'Scan ID for report (uses latest if not specified)')
  .option('-f, --format <format>', 'Report format (summary, detailed)', 'summary')
  .action(async (options) => {
    const manager = getDependencySecurityManager();
    
    let scanId = options.scanId;
    if (!scanId) {
      const history = manager.getScanHistory(1);
      if (history.length === 0) {
        console.error('❌ No scan results found. Run a scan first.');
        process.exit(1);
      }
      scanId = history[0].id;
    }
    
    const results = manager.getScanResults(scanId);
    if (!results) {
      console.error(`❌ Scan results not found: ${scanId}`);
      process.exit(1);
    }
    
    if (options.format === 'detailed') {
      // Generate and save detailed report
      await manager.generateSecurityReport(results);
      console.log('📄 Detailed report generated and saved to reports/ directory');
    } else {
      // Display summary report
      const summary = manager.generateHumanReadableSummary(results);
      console.log(summary);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}