#!/usr/bin/env node

/**
 * Health Check Monitoring Script
 * Monitors the frequency and performance of health check requests
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const MONITORING_PORT = process.env.MONITORING_PORT || 3001;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/api/health';
const CHECK_INTERVAL = 60000; // 1 minute
const STATS_INTERVAL = 300000; // 5 minutes

// Statistics
const stats = {
  totalChecks: 0,
  successfulChecks: 0,
  failedChecks: 0,
  responseTimes: [],
  cacheHits: 0,
  errors: [],
  startTime: Date.now()
};

// Parse target URL
const targetUrl = url.parse(TARGET_URL);
const client = targetUrl.protocol === 'https:' ? https : http;

/**
 * Perform a health check
 */
async function performHealthCheck() {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.path,
      method: 'GET',
      headers: {
        'x-health-check-type': 'monitoring',
        'User-Agent': 'HealthCheckMonitor/1.0'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        stats.totalChecks++;
        stats.responseTimes.push(responseTime);
        
        // Keep only last 100 response times
        if (stats.responseTimes.length > 100) {
          stats.responseTimes.shift();
        }
        
        if (res.statusCode === 200) {
          stats.successfulChecks++;
          
          // Check if response was cached
          const cacheControl = res.headers['cache-control'];
          if (cacheControl && cacheControl.includes('max-age')) {
            stats.cacheHits++;
          }
          
          try {
            const result = JSON.parse(data);
            console.log(`✅ Health check successful - ${responseTime}ms - Status: ${result.status}`);
          } catch (e) {
            console.log(`✅ Health check successful - ${responseTime}ms`);
          }
        } else {
          stats.failedChecks++;
          stats.errors.push({
            time: new Date().toISOString(),
            status: res.statusCode,
            message: data
          });
          console.error(`❌ Health check failed - Status: ${res.statusCode}`);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      stats.totalChecks++;
      stats.failedChecks++;
      stats.errors.push({
        time: new Date().toISOString(),
        error: error.message
      });
      console.error(`❌ Health check error: ${error.message}`);
      resolve();
    });

    req.on('timeout', () => {
      req.abort();
      stats.totalChecks++;
      stats.failedChecks++;
      stats.errors.push({
        time: new Date().toISOString(),
        error: 'Request timeout'
      });
      console.error('❌ Health check timeout');
      resolve();
    });

    req.end();
  });
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const uptime = Date.now() - stats.startTime;
  const avgResponseTime = stats.responseTimes.length > 0
    ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
    : 0;
  
  const successRate = stats.totalChecks > 0
    ? (stats.successfulChecks / stats.totalChecks * 100).toFixed(2)
    : 0;
    
  const cacheHitRate = stats.successfulChecks > 0
    ? (stats.cacheHits / stats.successfulChecks * 100).toFixed(2)
    : 0;

  return {
    uptime: Math.floor(uptime / 1000), // seconds
    totalChecks: stats.totalChecks,
    successfulChecks: stats.successfulChecks,
    failedChecks: stats.failedChecks,
    successRate: `${successRate}%`,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime: Math.min(...stats.responseTimes),
    maxResponseTime: Math.max(...stats.responseTimes),
    cacheHitRate: `${cacheHitRate}%`,
    recentErrors: stats.errors.slice(-5)
  };
}

/**
 * Print statistics
 */
function printStats() {
  const statistics = calculateStats();
  
  console.log('\n📊 Health Check Statistics:');
  console.log('─'.repeat(50));
  console.log(`Uptime: ${Math.floor(statistics.uptime / 60)} minutes`);
  console.log(`Total Checks: ${statistics.totalChecks}`);
  console.log(`Success Rate: ${statistics.successRate}`);
  console.log(`Cache Hit Rate: ${statistics.cacheHitRate}`);
  console.log(`Average Response Time: ${statistics.avgResponseTime}ms`);
  console.log(`Min/Max Response Time: ${statistics.minResponseTime}ms / ${statistics.maxResponseTime}ms`);
  
  if (statistics.recentErrors.length > 0) {
    console.log('\n⚠️  Recent Errors:');
    statistics.recentErrors.forEach(error => {
      console.log(`  - ${error.time}: ${error.error || error.message}`);
    });
  }
  console.log('─'.repeat(50));
}

/**
 * Start monitoring server
 */
function startMonitoringServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(calculateStats(), null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n\nAvailable endpoints:\n- /stats - Get monitoring statistics\n');
    }
  });

  server.listen(MONITORING_PORT, () => {
    console.log(`🖥️  Monitoring server running on http://localhost:${MONITORING_PORT}`);
    console.log(`📊 View stats at: http://localhost:${MONITORING_PORT}/stats`);
  });
}

// Main execution
console.log('🏥 Health Check Monitor Started');
console.log(`🎯 Target: ${TARGET_URL}`);
console.log(`⏱️  Check Interval: ${CHECK_INTERVAL / 1000} seconds`);
console.log(`📊 Stats Interval: ${STATS_INTERVAL / 60000} minutes\n`);

// Start monitoring server
startMonitoringServer();

// Perform initial check
performHealthCheck();

// Schedule regular checks
setInterval(performHealthCheck, CHECK_INTERVAL);

// Print statistics periodically
setInterval(printStats, STATS_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down monitor...');
  printStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down monitor...');
  printStats();
  process.exit(0);
});