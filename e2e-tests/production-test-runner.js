#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Import test modules
const AdminTestSetupModule = require('./src/modules/AdminTestSetupModule');
const EnhancedAuthenticationModule = require('./src/modules/EnhancedAuthenticationModule');
const ManagerWorkflowModule = require('./src/modules/ManagerWorkflowModule');
const CrewWorkflowModule = require('./src/modules/CrewWorkflowModule');
const TrainingWorkflowModule = require('./src/modules/TrainingWorkflowModule');

// Import existing modules
const AuthenticationModule = require('./src/modules/AuthenticationModule');
const CrewOnboardingModule = require('./src/modules/CrewOnboardingModule');

class ProductionTestRunner {
  constructor() {
    this.config = require('./config.json');
    this.browser = null;
    this.page = null;
    this.results = [];
    this.startTime = new Date();
  }

  async initialize() {
    console.log('🚀 Maritime Onboarding Production E2E Test Suite');
    console.log('=================================================');
    console.log(`📍 Target URL: ${this.config.baseUrl}`);
    console.log(`⏰ Started at: ${this.startTime.toISOString()}`);
    console.log('');

    // Launch browser
    this.browser = await chromium.launch({ 
      headless: false,  // Set to true for CI/CD
      slowMo: 100 
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Set longer timeout for production
    this.page.setDefaultTimeout(30000);
    
    console.log('🌐 Browser launched and configured');
  }

  async runTestSuite() {
    console.log('\n🧪 === PRODUCTION TEST SUITE EXECUTION ===\n');
    
    try {
      // Phase 1: Admin Setup and Manager Creation
      console.log('📋 PHASE 1: Admin Setup and Test Manager Creation');
      console.log('==================================================');
      const adminSetupModule = new AdminTestSetupModule(this.page, this.config);
      const adminSetupResults = await adminSetupModule.runAllTests();
      this.results.push(adminSetupResults);

      // Phase 2: Enhanced Authentication Testing
      console.log('\n📋 PHASE 2: Enhanced Authentication Testing');
      console.log('===========================================');
      const enhancedAuthModule = new EnhancedAuthenticationModule(this.page, this.config);
      const enhancedAuthResults = await enhancedAuthModule.runAllTests();
      this.results.push(enhancedAuthResults);

      // Phase 3: Manager Workflow Testing
      console.log('\n📋 PHASE 3: Manager Workflow Testing');
      console.log('====================================');
      const managerModule = new ManagerWorkflowModule(this.page, this.config);
      const managerResults = await managerModule.runAllTests();
      this.results.push(managerResults);

      // Phase 4: Crew Workflow Testing
      console.log('\n📋 PHASE 4: Crew Workflow Testing');
      console.log('=================================');
      const crewModule = new CrewWorkflowModule(this.page, this.config);
      const crewResults = await crewModule.runAllTests();
      this.results.push(crewResults);

      // Phase 5: Training Workflow Testing (if authenticated)
      console.log('\n📋 PHASE 5: Training Workflow Testing');
      console.log('=====================================');
      const trainingModule = new TrainingWorkflowModule(this.page, this.config);
      const trainingResults = await trainingModule.runAllTests();
      this.results.push(trainingResults);
      
      // Phase 6: Comprehensive Authentication Testing (Original)
      console.log('\n📋 PHASE 6: Comprehensive Authentication Testing');
      console.log('===============================================');
      const authModule = new AuthenticationModule(this.page, this.config);
      const authResults = await authModule.runAllTests();
      this.results.push(authResults);

      // Phase 7: Crew Onboarding Testing (Original)
      console.log('\n📋 PHASE 7: Crew Onboarding Testing');
      console.log('===================================');
      const crewOnboardingModule = new CrewOnboardingModule(this.page, this.config);
      const crewOnboardingResults = await crewOnboardingModule.runAllTests();
      this.results.push(crewOnboardingResults);
      
    } catch (error) {
      console.error('❌ Fatal error in test suite:', error);
      this.results.push({
        moduleName: 'TestSuite',
        results: [{
          testName: 'Fatal Error',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      });
    }
  }

  generateComprehensiveReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    // Calculate overall statistics
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    this.results.forEach(moduleResult => {
      if (moduleResult.results) {
        moduleResult.results.forEach(test => {
          totalTests++;
          if (test.success) {
            totalPassed++;
          } else {
            totalFailed++;
          }
        });
      }
    });
    
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0;
    
    // Generate detailed report
    const report = {
      testSuite: 'Maritime Onboarding Production E2E Tests',
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      totalTests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      successRate: `${successRate}%`,
      modules: this.results,
      summary: {
        adminSetup: this.getModuleSummary('AdminTestSetup'),
        enhancedAuth: this.getModuleSummary('EnhancedAuthentication'),
        managerWorkflow: this.getModuleSummary('ManagerWorkflow'),
        crewWorkflow: this.getModuleSummary('CrewWorkflow'),
        trainingWorkflow: this.getModuleSummary('TrainingWorkflow'),
        authentication: this.getModuleSummary('Authentication'),
        crewOnboarding: this.getModuleSummary('CrewOnboarding')
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const timestamp = this.startTime.toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + 
                     this.startTime.toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const reportPath = path.join(__dirname, 'reports', `production-test-report-${timestamp}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }

  getModuleSummary(moduleName) {
    const moduleResult = this.results.find(r => r.moduleName === moduleName);
    if (!moduleResult || !moduleResult.results) {
      return { tests: 0, passed: 0, failed: 0, successRate: '0%' };
    }
    
    const tests = moduleResult.results.length;
    const passed = moduleResult.results.filter(t => t.success).length;
    const failed = tests - passed;
    const successRate = tests > 0 ? ((passed / tests) * 100).toFixed(2) : 0;
    
    return {
      tests: tests,
      passed: passed,
      failed: failed,
      successRate: `${successRate}%`
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze results and generate recommendations
    const adminSetup = this.getModuleSummary('AdminTestSetup');
    const enhancedAuth = this.getModuleSummary('EnhancedAuthentication');
    const training = this.getModuleSummary('TrainingWorkflow');
    
    if (adminSetup.passed === 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Admin Access',
        issue: 'Admin login not working',
        action: 'Verify admin credentials and login flow'
      });
    }
    
    if (enhancedAuth.successRate < 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication',
        issue: 'Authentication flow has major issues',
        action: 'Fix magic link completion and user feedback'
      });
    }
    
    if (training.passed === 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Training Access',
        issue: 'Training workflow not accessible',
        action: 'Ensure authenticated users can access training dashboard'
      });
    }
    
    // Add general recommendations
    recommendations.push({
      priority: 'MEDIUM',
      category: 'User Experience',
      issue: 'Missing visual feedback',
      action: 'Add loading states and confirmation messages'
    });
    
    recommendations.push({
      priority: 'LOW',
      category: 'Testing',
      issue: 'E2E test coverage',
      action: 'Add more test selectors with data-testid attributes'
    });
    
    return recommendations;
  }

  printSummary(report) {
    console.log('\n📊 === PRODUCTION TEST RESULTS SUMMARY ===');
    console.log('==========================================');
    console.log(`⏱️  Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`📋 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    console.log(`📈 Success Rate: ${report.successRate}`);
    console.log('');
    
    console.log('📋 Module Breakdown:');
    Object.entries(report.summary).forEach(([module, summary]) => {
      const status = summary.successRate === '100%' ? '✅' : 
                    parseFloat(summary.successRate) > 50 ? '⚠️' : '❌';
      console.log(`  ${status} ${module}: ${summary.passed}/${summary.tests} (${summary.successRate})`);
    });
    
    console.log('\n🎯 Key Recommendations:');
    report.recommendations.slice(0, 5).forEach(rec => {
      const priority = rec.priority === 'CRITICAL' ? '🔴' : 
                      rec.priority === 'HIGH' ? '🟡' : '🔵';
      console.log(`  ${priority} ${rec.category}: ${rec.action}`);
    });
    
    console.log('\n📧 Magic Link Testing Instructions:');
    console.log('===================================');
    console.log('1. Check email for e2etest@shipdocs.app');
    console.log('2. Copy the magic link URL from the email');
    console.log('3. Set environment variable: MAGIC_LINK_URL="<copied_url>"');
    console.log('4. Re-run tests for complete magic link testing');
    console.log('');
    console.log('Example:');
    console.log('export MAGIC_LINK_URL="https://new-onboarding-2025.vercel.app/login?token=abc123"');
    console.log('node production-test-runner.js');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser closed');
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.runTestSuite();
      
      const { report, reportPath } = this.generateComprehensiveReport();
      this.printSummary(report);
      
      console.log(`\n📄 Detailed report saved: ${reportPath}`);
      console.log('🎉 Production test suite completed!');
      
      return report;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ProductionTestRunner();
  runner.run()
    .then(report => {
      const successRate = parseFloat(report.successRate);
      process.exit(successRate > 80 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ProductionTestRunner;
