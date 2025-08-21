#!/usr/bin/env node

/**
 * Security Monitoring CLI
 * 
 * Command-line interface for security monitoring operations.
 */

const { program } = require('commander');
const { getSecurityMonitoring } = require('../lib/security/SecurityMonitoringService');

program
  .name('security-monitoring')
  .description('Security monitoring CLI tool')
  .version('1.0.0');

program
  .command('start')
  .description('Start security monitoring')
  .option('-i, --interval <ms>', 'Monitoring interval in milliseconds', '60000')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    const interval = parseInt(options.interval);
    
    console.log(`Starting security monitoring with ${interval}ms interval...`);
    
    // Set up event listeners
    securityMonitoring.on('monitoring-started', () => {
      console.log('✅ Security monitoring started successfully');
    });
    
    securityMonitoring.on('security-alert', (alert) => {
      console.log(`🚨 ${alert.type.toUpperCase()} ALERT: ${alert.message}`);
    });
    
    securityMonitoring.on('metrics-collected', (metrics) => {
      console.log(`📊 Metrics collected: ${Object.keys(metrics).length} metrics`);
    });
    
    securityMonitoring.on('monitoring-error', (error) => {
      console.error(`❌ Monitoring error: ${error.message}`);
    });
    
    // Start monitoring
    securityMonitoring.startMonitoring(interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down security monitoring...');
      securityMonitoring.stopMonitoring();
      process.exit(0);
    });
    
    // Keep process alive
    process.stdin.resume();
  });

program
  .command('stop')
  .description('Stop security monitoring')
  .action(async () => {
    const securityMonitoring = getSecurityMonitoring();
    securityMonitoring.stopMonitoring();
    console.log('Security monitoring stopped');
  });

program
  .command('status')
  .description('Show security monitoring status')
  .action(async () => {
    const securityMonitoring = getSecurityMonitoring();
    const dashboard = securityMonitoring.getDashboardData();
    
    console.log('\n📊 Security Monitoring Status');
    console.log('================================');
    console.log(`Status: ${dashboard.status}`);
    console.log(`Last Update: ${dashboard.lastUpdate || 'Never'}`);
    console.log(`Total Alerts: ${dashboard.summary.totalAlerts}`);
    console.log(`Critical Alerts: ${dashboard.summary.criticalAlerts}`);
    console.log(`Warning Alerts: ${dashboard.summary.warningAlerts}`);
    console.log(`Metrics Collected: ${dashboard.summary.metricsCollected}`);
    
    if (dashboard.alerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      dashboard.alerts.slice(0, 5).forEach(alert => {
        console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }
  });

program
  .command('dashboard')
  .description('Show security dashboard')
  .option('-t, --time-range <range>', 'Time range (1h, 24h, 7d)', '24h')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    const report = securityMonitoring.generateReport(options.timeRange);
    
    console.log(`\n🔒 Security Dashboard (${options.timeRange})`);
    console.log('=====================================');
    console.log(`Time Range: ${report.startTime} to ${report.endTime}`);
    console.log(`Security Score: ${report.summary.securityScore}/100`);
    console.log(`Total Alerts: ${report.alertsCount}`);
    console.log(`Critical Alerts: ${report.summary.criticalAlerts}`);
    console.log(`Warning Alerts: ${report.summary.warningAlerts}`);
    
    if (report.summary.mostFrequentAlert) {
      console.log(`Most Frequent Alert: ${report.summary.mostFrequentAlert}`);
    }
    
    console.log('\n📈 Metrics Summary:');
    Object.entries(report.aggregatedMetrics).forEach(([metric, stats]) => {
      console.log(`  ${metric}: Total=${stats.total}, Avg=${stats.average.toFixed(2)}, Max=${stats.max}`);
    });
  });

program
  .command('alerts')
  .description('Show security alerts')
  .option('-t, --time-range <range>', 'Time range (1h, 24h, 7d)', '24h')
  .option('-l, --limit <number>', 'Limit number of alerts', '20')
  .option('--type <type>', 'Filter by alert type (critical, warning)')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (options.timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    let alerts = securityMonitoring.getAlertsForTimeRange(startTime, now);
    
    // Filter by type if specified
    if (options.type) {
      alerts = alerts.filter(alert => alert.type === options.type);
    }
    
    // Limit results
    alerts = alerts.slice(0, parseInt(options.limit));
    
    console.log(`\n🚨 Security Alerts (${options.timeRange})`);
    console.log('===============================');
    console.log(`Found ${alerts.length} alerts`);
    
    if (alerts.length === 0) {
      console.log('No alerts found for the specified time range.');
      return;
    }
    
    alerts.forEach((alert, index) => {
      const timestamp = new Date(alert.timestamp).toLocaleString();
      console.log(`\n${index + 1}. [${alert.type.toUpperCase()}] ${alert.metric}`);
      console.log(`   Message: ${alert.message}`);
      console.log(`   Value: ${alert.value} (threshold: ${alert.threshold})`);
      console.log(`   Time: ${timestamp}`);
    });
  });

program
  .command('metrics')
  .description('Show security metrics')
  .option('-t, --time-range <range>', 'Time range (1h, 24h, 7d)', '24h')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (options.timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const metrics = securityMonitoring.getMetricsForTimeRange(startTime, now);
    
    console.log(`\n📊 Security Metrics (${options.timeRange})`);
    console.log('===============================');
    console.log(`Data Points: ${metrics.length}`);
    
    if (metrics.length === 0) {
      console.log('No metrics found for the specified time range.');
      return;
    }
    
    // Calculate aggregated statistics
    const latest = metrics[metrics.length - 1];
    const metricKeys = Object.keys(latest).filter(key => 
      key !== 'timestamp' && key !== 'collectedAt'
    );
    
    console.log('\nLatest Metrics:');
    metricKeys.forEach(key => {
      console.log(`  ${key}: ${latest[key]}`);
    });
    
    if (metrics.length > 1) {
      console.log('\nAggregated Statistics:');
      metricKeys.forEach(key => {
        const values = metrics.map(m => m[key] || 0);
        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        console.log(`  ${key}: Total=${total}, Avg=${avg.toFixed(2)}, Max=${max}, Min=${min}`);
      });
    }
  });

program
  .command('export')
  .description('Export security data')
  .option('-f, --format <format>', 'Export format (json, csv)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    const data = securityMonitoring.exportData(options.format);
    
    if (options.output) {
      const fs = require('fs');
      fs.writeFileSync(options.output, data);
      console.log(`Security data exported to ${options.output}`);
    } else {
      console.log(data);
    }
  });

program
  .command('test-alert')
  .description('Generate test security alert')
  .option('-t, --type <type>', 'Alert type (critical, warning)', 'warning')
  .option('-m, --metric <metric>', 'Metric name', 'testMetric')
  .action(async (options) => {
    const securityMonitoring = getSecurityMonitoring();
    
    // Manually trigger an alert for testing
    const testAlert = {
      id: `test-${Date.now()}`,
      type: options.type,
      metric: options.metric,
      value: 999,
      threshold: 10,
      message: `Test ${options.type} alert for ${options.metric}`,
      timestamp: new Date().toISOString()
    };
    
    securityMonitoring.emit('security-alert', testAlert);
    console.log(`Test alert generated: ${testAlert.message}`);
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}