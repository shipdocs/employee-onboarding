#!/usr/bin/env node

/**
 * Real-time Performance Monitor for Maritime Onboarding System
 * 
 * Monitors:
 * - API response times
 * - Memory usage
 * - CPU usage
 * - Active connections
 * - Error rates
 */

const axios = require('axios');
const os = require('os');
const chalk = require('chalk');
const Table = require('cli-table3');

class PerformanceMonitor {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.interval = 5000; // 5 seconds
    this.history = {
      api: [],
      memory: [],
      cpu: [],
      errors: []
    };
    this.maxHistoryLength = 20;
    this.isRunning = false;
  }

  async init() {
    console.clear();
    console.log(chalk.blue.bold('🔍 Real-time Performance Monitor\n'));
    console.log(chalk.gray('Monitoring:', this.baseUrl));
    console.log(chalk.gray('Interval:', this.interval / 1000, 'seconds'));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));
  }

  // Get system metrics
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percent: memUsagePercent
      },
      cpu: {
        cores: cpus.length,
        usage: cpuUsage,
        model: cpus[0].model
      },
      uptime: os.uptime(),
      loadAvg: os.loadavg()
    };
  }

  // Test API endpoints
  async testAPIEndpoints() {
    const endpoints = [
      { name: 'Health', path: '/api/health' },
      { name: 'Stats', path: '/api/stats/public' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint.path}`, {
          timeout: 5000
        });
        const duration = Date.now() - start;
        
        results.push({
          name: endpoint.name,
          status: response.status,
          duration,
          success: true
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: error.response?.status || 0,
          duration: Date.now() - start,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Format bytes
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  // Format uptime
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Update history
  updateHistory(type, value) {
    this.history[type].push(value);
    if (this.history[type].length > this.maxHistoryLength) {
      this.history[type].shift();
    }
  }

  // Calculate average
  getAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // Get trend
  getTrend(arr) {
    if (arr.length < 2) return '→';
    const recent = arr.slice(-5);
    const older = arr.slice(-10, -5);
    
    if (older.length === 0) return '→';
    
    const recentAvg = this.getAverage(recent);
    const olderAvg = this.getAverage(older);
    
    if (recentAvg > olderAvg * 1.1) return '↑';
    if (recentAvg < olderAvg * 0.9) return '↓';
    return '→';
  }

  // Display metrics
  async displayMetrics() {
    const metrics = this.getSystemMetrics();
    const apiResults = await this.testAPIEndpoints();
    
    // Update history
    this.updateHistory('memory', metrics.memory.percent);
    this.updateHistory('cpu', metrics.cpu.usage);
    
    const avgApiTime = this.getAverage(apiResults.map(r => r.duration));
    this.updateHistory('api', avgApiTime);
    
    const errorCount = apiResults.filter(r => !r.success).length;
    this.updateHistory('errors', errorCount);
    
    // Clear console and display
    console.clear();
    console.log(chalk.blue.bold('🔍 Real-time Performance Monitor\n'));
    
    // System metrics table
    const sysTable = new Table({
      head: ['Metric', 'Current', 'Average', 'Trend'],
      style: { head: ['cyan'] }
    });
    
    sysTable.push(
      [
        'Memory Usage',
        `${metrics.memory.percent.toFixed(1)}%`,
        `${this.getAverage(this.history.memory).toFixed(1)}%`,
        this.getTrend(this.history.memory)
      ],
      [
        'CPU Usage',
        `${metrics.cpu.usage.toFixed(1)}%`,
        `${this.getAverage(this.history.cpu).toFixed(1)}%`,
        this.getTrend(this.history.cpu)
      ],
      [
        'System Uptime',
        this.formatUptime(metrics.uptime),
        '-',
        '→'
      ],
      [
        'Load Average',
        metrics.loadAvg.map(l => l.toFixed(2)).join(' '),
        '-',
        '→'
      ]
    );
    
    console.log(chalk.white('📊 System Metrics:'));
    console.log(sysTable.toString());
    
    // API metrics table
    const apiTable = new Table({
      head: ['Endpoint', 'Status', 'Response Time', 'Result'],
      style: { head: ['cyan'] }
    });
    
    for (const result of apiResults) {
      const statusColor = result.success ? chalk.green : chalk.red;
      const timeColor = result.duration < 100 ? chalk.green :
                       result.duration < 300 ? chalk.yellow : chalk.red;
      
      apiTable.push([
        result.name,
        statusColor(result.status || 'ERR'),
        timeColor(`${result.duration}ms`),
        result.success ? chalk.green('✓') : chalk.red('✗')
      ]);
    }
    
    console.log(chalk.white('\n🌐 API Performance:'));
    console.log(apiTable.toString());
    
    // Summary statistics
    const summaryTable = new Table({
      head: ['Metric', 'Value', 'Status'],
      style: { head: ['cyan'] }
    });
    
    const avgMemory = this.getAverage(this.history.memory);
    const avgCpu = this.getAverage(this.history.cpu);
    const avgApi = this.getAverage(this.history.api);
    const totalErrors = this.history.errors.reduce((a, b) => a + b, 0);
    
    summaryTable.push(
      [
        'Avg Memory',
        `${avgMemory.toFixed(1)}%`,
        avgMemory < 80 ? chalk.green('Good') : chalk.red('High')
      ],
      [
        'Avg CPU',
        `${avgCpu.toFixed(1)}%`,
        avgCpu < 70 ? chalk.green('Good') : chalk.red('High')
      ],
      [
        'Avg API Time',
        `${avgApi.toFixed(0)}ms`,
        avgApi < 200 ? chalk.green('Fast') : avgApi < 500 ? chalk.yellow('OK') : chalk.red('Slow')
      ],
      [
        'Total Errors',
        totalErrors,
        totalErrors === 0 ? chalk.green('None') : chalk.red(`${totalErrors} errors`)
      ]
    );
    
    console.log(chalk.white('\n📈 Summary (last 100s):'));
    console.log(summaryTable.toString());
    
    // Alerts
    if (avgMemory > 90) {
      console.log(chalk.red.bold('\n⚠️  ALERT: High memory usage!'));
    }
    if (avgCpu > 80) {
      console.log(chalk.red.bold('\n⚠️  ALERT: High CPU usage!'));
    }
    if (errorCount > 0) {
      console.log(chalk.red.bold(`\n⚠️  ALERT: ${errorCount} API endpoints failing!`));
    }
    
    console.log(chalk.gray('\n\nPress Ctrl+C to stop monitoring...'));
  }

  // Start monitoring
  async start() {
    await this.init();
    this.isRunning = true;
    
    // Initial display
    await this.displayMetrics();
    
    // Set up interval
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.displayMetrics();
      }
    }, this.interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  // Stop monitoring
  stop() {
    console.log(chalk.yellow('\n\n👋 Stopping monitor...'));
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Generate final report
    this.generateFinalReport();
    
    process.exit(0);
  }

  // Generate final report
  generateFinalReport() {
    console.log(chalk.blue('\n📊 Final Performance Report:\n'));
    
    const avgMemory = this.getAverage(this.history.memory);
    const avgCpu = this.getAverage(this.history.cpu);
    const avgApi = this.getAverage(this.history.api);
    const totalErrors = this.history.errors.reduce((a, b) => a + b, 0);
    
    console.log(chalk.white('Average Metrics:'));
    console.log(`  Memory Usage: ${avgMemory.toFixed(1)}%`);
    console.log(`  CPU Usage: ${avgCpu.toFixed(1)}%`);
    console.log(`  API Response Time: ${avgApi.toFixed(0)}ms`);
    console.log(`  Total Errors: ${totalErrors}`);
    
    // Performance grade
    let grade = 'A';
    let gradeColor = chalk.green;
    
    if (avgMemory > 80 || avgCpu > 70 || avgApi > 500 || totalErrors > 5) {
      grade = 'B';
      gradeColor = chalk.yellow;
    }
    if (avgMemory > 90 || avgCpu > 85 || avgApi > 1000 || totalErrors > 10) {
      grade = 'C';
      gradeColor = chalk.red;
    }
    
    console.log(chalk.white('\nPerformance Grade: ') + gradeColor.bold(grade));
  }
}

// Run monitor
if (require.main === module) {
  // Check if cli-table3 is installed
  try {
    require('cli-table3');
  } catch (error) {
    console.error(chalk.red('Error: cli-table3 is required for the performance monitor'));
    console.log(chalk.yellow('Please install it with: npm install cli-table3'));
    process.exit(1);
  }
  
  const monitor = new PerformanceMonitor();
  monitor.start();
}

module.exports = PerformanceMonitor;