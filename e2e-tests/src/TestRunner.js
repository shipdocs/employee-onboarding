const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Import all test modules
const AuthenticationModule = require('./modules/AuthenticationModule');
const CrewOnboardingModule = require('./modules/CrewOnboardingModule');
const ManagerDashboardModule = require('./modules/ManagerDashboardModule');
const AdminModule = require('./modules/AdminModule');
const PerformanceModule = require('./modules/PerformanceModule');

class TestRunner {
  constructor(configPath) {
    // Load configuration
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.modules = [];
    this.results = {
      startTime: null,
      endTime: null,
      totalTests: 0,
      passed: 0,
      failed: 0,
      moduleResults: {}
    };
  }

  async initialize() {
    console.log('🚀 Maritime Onboarding E2E Test Suite');
    console.log('=====================================\n');
    
    console.log('📋 Configuration:');
    console.log(`   Base URL: ${this.config.baseUrl}`);
    console.log(`   Timeout: ${this.config.timeout}ms`);
    console.log(`   Features: ${Object.entries(this.config.features).filter(([,v]) => v).map(([k]) => k).join(', ')}`);
    console.log('\n');
    
    // Create reports directory
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['screenshots', 'videos', 'exports'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(reportsDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
      }
    }
  }

  async runModule(ModuleClass, moduleName, options = {}) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Starting ${moduleName} Tests`);
    console.log(`${'='.repeat(50)}`);
    
    const module = new ModuleClass(this.config);
    
    try {
      // Setup browser
      await module.setup({
        headless: options.headless !== false,
        recordVideo: options.recordVideo !== false
      });
      
      // Run module tests
      await module.runAllTests();
      
      // Get results
      const moduleResults = {
        name: moduleName,
        results: module.testResults,
        passed: module.testResults.filter(r => r.success).length,
        failed: module.testResults.filter(r => !r.success).length,
        total: module.testResults.length
      };
      
      this.results.moduleResults[moduleName] = moduleResults;
      this.results.totalTests += moduleResults.total;
      this.results.passed += moduleResults.passed;
      this.results.failed += moduleResults.failed;
      
      // Teardown
      await module.teardown();
      
      return moduleResults;
    } catch (error) {
      console.error(`\n❌ Fatal error in ${moduleName}:`, error);
      
      // Try to capture error screenshot
      try {
        await module.takeScreenshot(`fatal-error-${moduleName.toLowerCase()}`);
      } catch (e) {
        // Ignore screenshot errors
      }
      
      // Teardown on error
      try {
        await module.teardown();
      } catch (e) {
        // Ignore teardown errors
      }
      
      return {
        name: moduleName,
        error: error.message,
        results: [],
        passed: 0,
        failed: 1,
        total: 1
      };
    }
  }

  async runSequential(options = {}) {
    this.results.startTime = new Date();
    
    // Run modules in sequence
    let modulesToRun = [
      { Module: AuthenticationModule, name: 'Authentication' },
      { Module: CrewOnboardingModule, name: 'Crew Onboarding' },
      { Module: ManagerDashboardModule, name: 'Manager Dashboard' },
      { Module: AdminModule, name: 'Admin Functions' },
      { Module: PerformanceModule, name: 'Performance' }
    ];
    
    if (options.modules) {
      // Filter modules if specific ones are requested
      const requestedModules = options.modules.map(m => m.toLowerCase());
      modulesToRun = modulesToRun.filter(m => 
        requestedModules.includes(m.name.toLowerCase())
      );
    }
    
    for (const { Module, name } of modulesToRun) {
      if (options.skipModules && options.skipModules.includes(name)) {
        console.log(`\n⏭️  Skipping ${name} module`);
        continue;
      }
      
      await this.runModule(Module, name, options);
      
      // Small delay between modules
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.results.endTime = new Date();
  }

  async runParallel(options = {}) {
    this.results.startTime = new Date();
    
    // For parallel execution, we need separate browser instances
    // This is more complex and requires careful resource management
    console.log('\n⚠️  Parallel execution not yet implemented');
    console.log('   Running sequential mode instead...\n');
    
    await this.runSequential(options);
  }

  generateHTMLReport() {
    const duration = this.results.endTime - this.results.startTime;
    const successRate = (this.results.passed / this.results.totalTests * 100).toFixed(2);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maritime Onboarding E2E Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #0066cc;
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .value {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .module {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            overflow: hidden;
        }
        .module-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .module-header h2 {
            margin: 0;
            font-size: 20px;
        }
        .test-list {
            padding: 0;
            margin: 0;
            list-style: none;
        }
        .test-item {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .test-name {
            font-weight: 500;
        }
        .test-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .test-duration {
            color: #666;
            font-size: 14px;
            margin-left: 10px;
        }
        .error-details {
            background: #f8d7da;
            color: #721c24;
            padding: 10px 20px;
            margin: 0;
            font-family: monospace;
            font-size: 12px;
        }
        .footer {
            text-align: center;
            color: #666;
            margin-top: 40px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚢 Maritime Onboarding E2E Test Report</h1>
        <p>Generated on ${format(this.results.endTime, 'MMMM dd, yyyy HH:mm:ss')}</p>
        <p>Duration: ${(duration / 1000).toFixed(2)} seconds</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Total Tests</h3>
            <p class="value">${this.results.totalTests}</p>
        </div>
        <div class="summary-card">
            <h3>Passed</h3>
            <p class="value passed">${this.results.passed}</p>
        </div>
        <div class="summary-card">
            <h3>Failed</h3>
            <p class="value failed">${this.results.failed}</p>
        </div>
        <div class="summary-card">
            <h3>Success Rate</h3>
            <p class="value">${successRate}%</p>
        </div>
    </div>
    
    ${Object.entries(this.results.moduleResults).map(([moduleName, module]) => `
        <div class="module">
            <div class="module-header">
                <h2>${moduleName}</h2>
                <div>
                    <span class="passed">${module.passed} passed</span> / 
                    <span class="failed">${module.failed} failed</span> / 
                    <span>${module.total} total</span>
                </div>
            </div>
            <ul class="test-list">
                ${module.results.map(test => `
                    <li class="test-item">
                        <span class="test-name">${test.testName}</span>
                        <div>
                            <span class="test-status status-${test.success ? 'passed' : 'failed'}">
                                ${test.success ? 'Passed' : 'Failed'}
                            </span>
                            ${test.duration ? `<span class="test-duration">${test.duration}ms</span>` : ''}
                        </div>
                    </li>
                    ${test.error ? `<pre class="error-details">${test.error}</pre>` : ''}
                `).join('')}
            </ul>
        </div>
    `).join('')}
    
    <div class="footer">
        <p>Maritime Onboarding System - E2E Test Suite v1.0</p>
        <p>Powered by Playwright & MCP Testing Framework</p>
    </div>
</body>
</html>
    `;
    
    const reportPath = path.join(__dirname, '../../reports', `test-report-${format(this.results.startTime, 'yyyyMMdd-HHmmss')}.html`);
    fs.writeFileSync(reportPath, html);
    
    return reportPath;
  }

  generateJSONReport() {
    const reportPath = path.join(__dirname, '../../reports', `test-report-${format(this.results.startTime, 'yyyyMMdd-HHmmss')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    return reportPath;
  }

  printSummary() {
    const duration = this.results.endTime - this.results.startTime;
    const successRate = (this.results.passed / this.results.totalTests * 100).toFixed(2);
    
    console.log('\n\n');
    console.log('📊 ========== TEST SUMMARY ==========');
    console.log(`   Total Tests: ${this.results.totalTests}`);
    console.log(`   Passed: ${this.results.passed} ✅`);
    console.log(`   Failed: ${this.results.failed} ❌`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('====================================\n');
    
    // Module breakdown
    console.log('📋 Module Results:');
    Object.entries(this.results.moduleResults).forEach(([moduleName, module]) => {
      const moduleSuccessRate = module.total > 0 
        ? (module.passed / module.total * 100).toFixed(0) 
        : 0;
      console.log(`   ${moduleName}: ${module.passed}/${module.total} (${moduleSuccessRate}%)`);
    });
    
    // Failed tests details
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      Object.entries(this.results.moduleResults).forEach(([moduleName, module]) => {
        const failedTests = module.results.filter(r => !r.success);
        if (failedTests.length > 0) {
          console.log(`\n   ${moduleName}:`);
          failedTests.forEach(test => {
            console.log(`     - ${test.testName}: ${test.error || 'Unknown error'}`);
          });
        }
      });
    }
  }

  async run(options = {}) {
    try {
      await this.initialize();
      
      if (options.parallel) {
        await this.runParallel(options);
      } else {
        await this.runSequential(options);
      }
      
      // Generate reports
      const htmlReport = this.generateHTMLReport();
      const jsonReport = this.generateJSONReport();
      
      // Print summary
      this.printSummary();
      
      console.log('\n📄 Reports generated:');
      console.log(`   HTML: ${htmlReport}`);
      console.log(`   JSON: ${jsonReport}`);
      
      // Exit code based on results
      const exitCode = this.results.failed > 0 ? 1 : 0;
      return exitCode;
    } catch (error) {
      console.error('\n❌ Fatal error in test runner:', error);
      return 1;
    }
  }
}

module.exports = TestRunner;