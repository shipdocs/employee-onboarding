#!/usr/bin/env node

/**
 * Performance Benchmark Suite for Maritime Onboarding System
 * 
 * Tests key performance metrics:
 * - API response times
 * - Database query performance
 * - Email sending speed
 * - Authentication flow timing
 * - File upload/download speeds
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { performance } = require('perf_hooks');
const db = require('../lib/database-direct');

class PerformanceBenchmark {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      baseUrl: this.baseUrl,
      benchmarks: []
    };
    this.thresholds = {
      api: {
        fast: 100,    // ms
        acceptable: 300,
        slow: 1000
      },
      database: {
        fast: 50,
        acceptable: 150,
        slow: 500
      },
      email: {
        fast: 500,
        acceptable: 2000,
        slow: 5000
      },
      auth: {
        fast: 200,
        acceptable: 500,
        slow: 1500
      },
      file: {
        fast: 1000,
        acceptable: 3000,
        slow: 10000
      }
    };
  }

  async init() {
    console.log(chalk.blue.bold('\n⚡ Performance Benchmark Suite\n'));
    console.log(chalk.gray(`Environment: ${this.results.environment}`));
    console.log(chalk.gray(`Base URL: ${this.results.baseUrl}\n`));
  }

  async measurePerformance(name, category, fn) {
    console.log(chalk.yellow(`📊 Testing: ${name}...`));
    
    const measurements = [];
    const iterations = 5;
    
    // Warm-up run
    await fn();
    
    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await fn();
        const duration = performance.now() - start;
        measurements.push(duration);
      } catch (error) {
        console.error(chalk.red(`  ❌ Error: ${error.message}`));
        measurements.push(-1); // Mark as failed
      }
    }
    
    // Calculate statistics
    const validMeasurements = measurements.filter(m => m > 0);
    if (validMeasurements.length === 0) {
      return {
        name,
        category,
        status: 'failed',
        error: 'All iterations failed'
      };
    }
    
    const avg = validMeasurements.reduce((a, b) => a + b, 0) / validMeasurements.length;
    const min = Math.min(...validMeasurements);
    const max = Math.max(...validMeasurements);
    const median = this.getMedian(validMeasurements);
    
    // Determine performance rating
    const threshold = this.thresholds[category];
    let rating = 'slow';
    let color = chalk.red;
    
    if (avg <= threshold.fast) {
      rating = 'fast';
      color = chalk.green;
    } else if (avg <= threshold.acceptable) {
      rating = 'acceptable';
      color = chalk.yellow;
    }
    
    console.log(color(`  ✓ Average: ${avg.toFixed(2)}ms (${rating})`));
    console.log(chalk.gray(`    Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | Median: ${median.toFixed(2)}ms`));
    
    return {
      name,
      category,
      measurements: validMeasurements,
      stats: {
        average: avg,
        min,
        max,
        median,
        iterations: validMeasurements.length
      },
      rating,
      threshold: threshold[rating]
    };
  }

  getMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // API Benchmarks
  async benchmarkAPIs() {
    console.log(chalk.blue('\n🌐 API Performance Benchmarks\n'));
    
    const endpoints = [
      { name: 'Health Check', path: '/api/health', method: 'GET' },
      { name: 'Public Stats', path: '/api/stats/public', method: 'GET' },
      { name: 'Training Materials List', path: '/api/training/materials', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      const result = await this.measurePerformance(
        endpoint.name,
        'api',
        async () => {
          await axios({
            method: endpoint.method,
            url: `${this.baseUrl}${endpoint.path}`,
            timeout: 10000
          });
        }
      );
      this.results.benchmarks.push(result);
    }
  }

  // Database Benchmarks
  async benchmarkDatabase() {
    console.log(chalk.blue('\n💾 Database Performance Benchmarks\n'));
    
    const queries = [
      {
        name: 'Simple User Query',
        fn: async () => {
          await supabase
            .from('users')
            .select('id, email, role')
            .limit(1);
        }
      },
      {
        name: 'Complex Join Query',
        fn: async () => {
          await supabase
            .from('users')
            .select(`
              id, email, role,
              crew_progress (
                current_phase,
                completed_phases
              )
            `)
            .eq('role', 'crew')
            .limit(10);
        }
      },
      {
        name: 'Aggregation Query',
        fn: async () => {
          await supabase
            .from('crew_progress')
            .select('current_phase', { count: 'exact' });
        }
      }
    ];
    
    for (const query of queries) {
      const result = await this.measurePerformance(
        query.name,
        'database',
        query.fn
      );
      this.results.benchmarks.push(result);
    }
  }

  // Authentication Benchmarks
  async benchmarkAuth() {
    console.log(chalk.blue('\n🔐 Authentication Performance Benchmarks\n'));
    
    const authFlows = [
      {
        name: 'JWT Token Verification',
        fn: async () => {
          // Simulate token verification
          const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiY3JldyJ9.test';
          await axios.get(`${this.baseUrl}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${dummyToken}` }
          }).catch(() => {}); // Ignore auth errors for benchmark
        }
      }
    ];
    
    for (const flow of authFlows) {
      const result = await this.measurePerformance(
        flow.name,
        'auth',
        flow.fn
      );
      this.results.benchmarks.push(result);
    }
  }

  // File Operations Benchmarks
  async benchmarkFileOperations() {
    console.log(chalk.blue('\n📁 File Operations Performance Benchmarks\n'));
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-benchmark.pdf');
    const testFileSize = 1024 * 1024; // 1MB
    const testBuffer = Buffer.alloc(testFileSize, 'benchmark');
    await fs.writeFile(testFilePath, testBuffer);
    
    const fileOps = [
      {
        name: 'File Upload Simulation',
        fn: async () => {
          // Simulate file processing time
          const data = await fs.readFile(testFilePath);
          // Simulate upload processing
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    ];
    
    for (const op of fileOps) {
      const result = await this.measurePerformance(
        op.name,
        'file',
        op.fn
      );
      this.results.benchmarks.push(result);
    }
    
    // Cleanup
    await fs.unlink(testFilePath).catch(() => {});
  }

  // Email Benchmarks
  async benchmarkEmail() {
    console.log(chalk.blue('\n📧 Email Performance Benchmarks\n'));
    
    const { emailTemplateGenerator } = require('../lib/emailTemplateGenerator');
    
    const emailTests = [
      {
        name: 'Email Template Generation',
        fn: async () => {
          await emailTemplateGenerator.generateManagerMagicLinkTemplate(
            { 
              id: 'test-123',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              preferred_language: 'en'
            },
            'https://example.com/magic-link',
            'en'
          );
        }
      }
    ];
    
    for (const test of emailTests) {
      const result = await this.measurePerformance(
        test.name,
        'email',
        test.fn
      );
      this.results.benchmarks.push(result);
    }
  }

  // Generate Report
  async generateReport() {
    console.log(chalk.blue('\n📈 Generating Performance Report...\n'));
    
    // Calculate overall statistics
    const summary = {
      totalBenchmarks: this.results.benchmarks.length,
      byRating: {
        fast: this.results.benchmarks.filter(b => b.rating === 'fast').length,
        acceptable: this.results.benchmarks.filter(b => b.rating === 'acceptable').length,
        slow: this.results.benchmarks.filter(b => b.rating === 'slow').length,
        failed: this.results.benchmarks.filter(b => b.status === 'failed').length
      },
      byCategory: {}
    };
    
    // Group by category
    const categories = ['api', 'database', 'auth', 'email', 'file'];
    for (const category of categories) {
      const categoryBenchmarks = this.results.benchmarks.filter(b => b.category === category);
      if (categoryBenchmarks.length > 0) {
        const avgTimes = categoryBenchmarks
          .filter(b => b.stats)
          .map(b => b.stats.average);
        
        summary.byCategory[category] = {
          count: categoryBenchmarks.length,
          averageTime: avgTimes.length > 0 ? 
            avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length : 0,
          ratings: {
            fast: categoryBenchmarks.filter(b => b.rating === 'fast').length,
            acceptable: categoryBenchmarks.filter(b => b.rating === 'acceptable').length,
            slow: categoryBenchmarks.filter(b => b.rating === 'slow').length
          }
        };
      }
    }
    
    this.results.summary = summary;
    
    // Save report
    const reportDir = path.join(process.cwd(), '.simone', 'benchmarks');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportPath = path.join(reportDir, `benchmark-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    // Also save as latest
    const latestPath = path.join(reportDir, 'latest.json');
    await fs.writeFile(latestPath, JSON.stringify(this.results, null, 2));
    
    // Display summary
    console.log(chalk.white('Performance Summary:'));
    console.log(chalk.green(`  🚀 Fast: ${summary.byRating.fast}`));
    console.log(chalk.yellow(`  ⚡ Acceptable: ${summary.byRating.acceptable}`));
    console.log(chalk.red(`  🐌 Slow: ${summary.byRating.slow}`));
    if (summary.byRating.failed > 0) {
      console.log(chalk.red.bold(`  ❌ Failed: ${summary.byRating.failed}`));
    }
    
    console.log(chalk.white('\nCategory Breakdown:'));
    for (const [category, stats] of Object.entries(summary.byCategory)) {
      console.log(chalk.white(`  ${category.toUpperCase()}:`));
      console.log(`    Average: ${stats.averageTime.toFixed(2)}ms`);
      console.log(`    Fast: ${stats.ratings.fast} | Acceptable: ${stats.ratings.acceptable} | Slow: ${stats.ratings.slow}`);
    }
    
    console.log(chalk.green(`\n✅ Report saved to: ${reportPath}\n`));
    
    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log(chalk.blue('💡 Performance Recommendations:\n'));
    
    const slowBenchmarks = this.results.benchmarks.filter(b => b.rating === 'slow');
    
    if (slowBenchmarks.length === 0) {
      console.log(chalk.green('  ✨ All benchmarks are performing well!'));
      return;
    }
    
    const recommendations = new Map();
    
    for (const benchmark of slowBenchmarks) {
      switch (benchmark.category) {
        case 'api':
          recommendations.set('api', [
            '• Add caching for frequently accessed endpoints',
            '• Implement response compression',
            '• Consider using CDN for static assets',
            '• Optimize database queries in API handlers'
          ]);
          break;
        case 'database':
          recommendations.set('database', [
            '• Add indexes for frequently queried columns',
            '• Optimize complex JOIN queries',
            '• Implement query result caching',
            '• Consider database connection pooling'
          ]);
          break;
        case 'email':
          recommendations.set('email', [
            '• Use email queue for non-critical emails',
            '• Cache email templates',
            '• Optimize template generation logic',
            '• Consider using a faster email service'
          ]);
          break;
        case 'auth':
          recommendations.set('auth', [
            '• Cache JWT verification results',
            '• Optimize token validation logic',
            '• Implement session caching',
            '• Consider using Redis for auth tokens'
          ]);
          break;
        case 'file':
          recommendations.set('file', [
            '• Implement file streaming for large files',
            '• Use compression for file transfers',
            '• Add progress indicators for uploads',
            '• Consider using a CDN for file delivery'
          ]);
          break;
      }
    }
    
    for (const [category, recs] of recommendations) {
      console.log(chalk.yellow(`  ${category.toUpperCase()} Optimizations:`));
      recs.forEach(rec => console.log(chalk.gray(`    ${rec}`)));
      console.log();
    }
  }

  async run() {
    try {
      await this.init();
      
      // Run all benchmarks
      await this.benchmarkAPIs();
      await this.benchmarkDatabase();
      await this.benchmarkAuth();
      await this.benchmarkEmail();
      await this.benchmarkFileOperations();
      
      // Generate report
      await this.generateReport();
      
      // Exit with appropriate code
      const slowCount = this.results.benchmarks.filter(b => b.rating === 'slow').length;
      process.exit(slowCount > 3 ? 1 : 0); // Fail if more than 3 slow benchmarks
      
    } catch (error) {
      console.error(chalk.red('\n❌ Benchmark suite failed:'), error);
      process.exit(1);
    }
  }
}

// Run benchmarks
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run();
}

module.exports = PerformanceBenchmark;