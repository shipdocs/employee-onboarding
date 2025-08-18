#!/usr/bin/env node

/**
 * Security Test Runner
 * 
 * Comprehensive security test execution script that runs all security tests
 * and generates detailed security validation reports.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityTestRunner {
  constructor() {
    this.results = {
      xssTests: null,
      rateLimitTests: null,
      jwtTests: null,
      fileUploadTests: null,
      authTests: null,
      verifiedVulnTests: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        coverage: 0,
        securityScore: 0
      }
    };
    this.startTime = Date.now();
  }

  /**
   * Run all security tests
   */
  async runAllSecurityTests() {
    console.log('🔒 Starting Comprehensive Security Test Suite');
    console.log('='.repeat(60));
    
    try {
      // Run individual test suites
      await this.runXSSTests();
      await this.runRateLimitingTests();
      await this.runJWTSecurityTests();
      await this.runFileUploadSecurityTests();
      await this.runAuthenticationSecurityTests();
      await this.runVerifiedVulnerabilityTests();
      
      // Generate comprehensive report
      await this.generateSecurityReport();
      
      // Calculate security score
      this.calculateSecurityScore();
      
      // Display summary
      this.displaySummary();
      
      // Return exit code based on results
      return this.results.summary.failedTests === 0 ? 0 : 1;
      
    } catch (error) {
      console.error('❌ Security test suite failed:', error.message);
      return 1;
    }
  }

  /**
   * Run XSS prevention tests
   */
  async runXSSTests() {
    console.log('\n🛡️  Running XSS Prevention Tests...');
    
    try {
      const result = this.runJestTest('tests/security/xss-prevention.test.js');
      this.results.xssTests = this.parseJestResults(result);
      
      console.log(`   ✅ XSS Tests: ${this.results.xssTests.passed}/${this.results.xssTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ XSS Tests failed: ${error.message}`);
      this.results.xssTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run rate limiting tests
   */
  async runRateLimitingTests() {
    console.log('\n⏱️  Running Rate Limiting Tests...');
    
    try {
      const result = this.runJestTest('tests/security/rate-limiting.test.js');
      this.results.rateLimitTests = this.parseJestResults(result);
      
      console.log(`   ✅ Rate Limiting Tests: ${this.results.rateLimitTests.passed}/${this.results.rateLimitTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ Rate Limiting Tests failed: ${error.message}`);
      this.results.rateLimitTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run JWT security tests
   */
  async runJWTSecurityTests() {
    console.log('\n🔑 Running JWT Security Tests...');
    
    try {
      const result = this.runJestTest('tests/security/jwt-security.test.js');
      this.results.jwtTests = this.parseJestResults(result);
      
      console.log(`   ✅ JWT Security Tests: ${this.results.jwtTests.passed}/${this.results.jwtTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ JWT Security Tests failed: ${error.message}`);
      this.results.jwtTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run file upload security tests
   */
  async runFileUploadSecurityTests() {
    console.log('\n📁 Running File Upload Security Tests...');
    
    try {
      const result = this.runJestTest('tests/security/file-upload-security.test.js');
      this.results.fileUploadTests = this.parseJestResults(result);
      
      console.log(`   ✅ File Upload Security Tests: ${this.results.fileUploadTests.passed}/${this.results.fileUploadTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ File Upload Security Tests failed: ${error.message}`);
      this.results.fileUploadTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run authentication security tests
   */
  async runAuthenticationSecurityTests() {
    console.log('\n🔐 Running Authentication Security Tests...');
    
    try {
      const result = this.runJestTest('tests/security/authentication-security.test.js');
      this.results.authTests = this.parseJestResults(result);
      
      console.log(`   ✅ Authentication Security Tests: ${this.results.authTests.passed}/${this.results.authTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ Authentication Security Tests failed: ${error.message}`);
      this.results.authTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run verified vulnerability tests
   */
  async runVerifiedVulnerabilityTests() {
    console.log('\n🎯 Running Verified Vulnerability Tests...');
    
    try {
      const result = this.runJestTest('tests/security/verified-vulnerabilities.test.js');
      this.results.verifiedVulnTests = this.parseJestResults(result);
      
      console.log(`   ✅ Verified Vulnerability Tests: ${this.results.verifiedVulnTests.passed}/${this.results.verifiedVulnTests.total} passed`);
      
    } catch (error) {
      console.log(`   ❌ Verified Vulnerability Tests failed: ${error.message}`);
      this.results.verifiedVulnTests = { total: 0, passed: 0, failed: 1, skipped: 0 };
    }
  }

  /**
   * Run Jest test and capture output
   */
  runJestTest(testFile) {
    try {
      const command = `npx jest ${testFile} --json --testTimeout=30000`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      return JSON.parse(output);
      
    } catch (error) {
      // Jest returns non-zero exit code for failing tests
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch (parseError) {
          throw new Error(`Failed to parse Jest output: ${parseError.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Parse Jest results
   */
  parseJestResults(jestOutput) {
    if (!jestOutput || !jestOutput.testResults) {
      return { total: 0, passed: 0, failed: 0, skipped: 0 };
    }

    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    jestOutput.testResults.forEach(testFile => {
      testFile.assertionResults.forEach(test => {
        total++;
        switch (test.status) {
          case 'passed':
            passed++;
            break;
          case 'failed':
            failed++;
            break;
          case 'skipped':
          case 'pending':
            skipped++;
            break;
        }
      });
    });

    return { total, passed, failed, skipped };
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore() {
    const testSuites = [
      this.results.xssTests,
      this.results.rateLimitTests,
      this.results.jwtTests,
      this.results.fileUploadTests,
      this.results.authTests,
      this.results.verifiedVulnTests
    ];

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    testSuites.forEach(suite => {
      if (suite) {
        totalTests += suite.total;
        totalPassed += suite.passed;
        totalFailed += suite.failed;
        totalSkipped += suite.skipped;
      }
    });

    this.results.summary = {
      totalTests,
      passedTests: totalPassed,
      failedTests: totalFailed,
      skippedTests: totalSkipped,
      coverage: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      securityScore: this.calculateSecurityScoreValue(testSuites)
    };
  }

  /**
   * Calculate security score based on test results and criticality
   */
  calculateSecurityScoreValue(testSuites) {
    // Weight different test categories by importance
    const weights = {
      xssTests: 25,           // XSS prevention is critical
      verifiedVulnTests: 25,  // Verified vulnerabilities are critical
      jwtTests: 20,           // JWT security is very important
      authTests: 15,          // Authentication security is important
      rateLimitTests: 10,     // Rate limiting is important
      fileUploadTests: 5      // File upload security is moderately important
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(testType => {
      const suite = this.results[testType];
      if (suite && suite.total > 0) {
        const suiteScore = (suite.passed / suite.total) * 100;
        weightedScore += suiteScore * weights[testType];
        totalWeight += weights[testType];
      }
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: this.results.summary,
      testResults: {
        xssTests: this.results.xssTests,
        rateLimitTests: this.results.rateLimitTests,
        jwtTests: this.results.jwtTests,
        fileUploadTests: this.results.fileUploadTests,
        authTests: this.results.authTests,
        verifiedVulnTests: this.results.verifiedVulnTests
      },
      recommendations: this.generateRecommendations(),
      vulnerabilityStatus: this.getVulnerabilityStatus()
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'reports', 'security-test-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Security test report saved to: ${reportPath}`);

    return report;
  }

  /**
   * Generate security recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.results.xssTests && this.results.xssTests.failed > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'XSS Prevention',
        issue: 'XSS prevention tests are failing',
        action: 'Review and fix XSS vulnerabilities in SafeContentRenderer and DOMPurify integration'
      });
    }

    if (this.results.verifiedVulnTests && this.results.verifiedVulnTests.failed > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Verified Vulnerabilities',
        issue: 'Previously identified vulnerabilities may not be fully fixed',
        action: 'Review RichTextEditor innerHTML usage and FileUploadQuestion dangerouslySetInnerHTML'
      });
    }

    if (this.results.jwtTests && this.results.jwtTests.failed > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'JWT Security',
        issue: 'JWT security tests are failing',
        action: 'Verify JWT expiration limits and token binding implementation'
      });
    }

    if (this.results.rateLimitTests && this.results.rateLimitTests.failed > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Rate Limiting',
        issue: 'Rate limiting tests are failing',
        action: 'Check rate limiting implementation on all API endpoints'
      });
    }

    if (this.results.summary.securityScore < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Overall Security',
        issue: `Security score is below acceptable threshold (${this.results.summary.securityScore}/100)`,
        action: 'Address failing security tests to improve overall security posture'
      });
    }

    return recommendations;
  }

  /**
   * Get vulnerability status summary
   */
  getVulnerabilityStatus() {
    return {
      richTextEditorXSS: this.results.verifiedVulnTests?.passed > 0 ? 'FIXED' : 'UNKNOWN',
      fileUploadXSS: this.results.verifiedVulnTests?.passed > 0 ? 'FIXED' : 'UNKNOWN',
      rateLimitingGaps: this.results.rateLimitTests?.passed > 0 ? 'FIXED' : 'UNKNOWN',
      jwtExpiration: this.results.jwtTests?.passed > 0 ? 'FIXED' : 'UNKNOWN',
      overallStatus: this.results.summary.securityScore >= 80 ? 'SECURE' : 'NEEDS_ATTENTION'
    };
  }

  /**
   * Display test summary
   */
  displaySummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skippedTests}`);
    console.log(`📈 Coverage: ${this.results.summary.coverage}%`);
    console.log(`🛡️  Security Score: ${this.results.summary.securityScore}/100`);
    
    // Security score interpretation
    if (this.results.summary.securityScore >= 90) {
      console.log('🟢 Security Status: EXCELLENT');
    } else if (this.results.summary.securityScore >= 80) {
      console.log('🟡 Security Status: GOOD');
    } else if (this.results.summary.securityScore >= 60) {
      console.log('🟠 Security Status: NEEDS IMPROVEMENT');
    } else {
      console.log('🔴 Security Status: CRITICAL ISSUES');
    }
    
    // Show test suite breakdown
    console.log('\n📋 Test Suite Breakdown:');
    const suites = [
      { name: 'XSS Prevention', results: this.results.xssTests },
      { name: 'Rate Limiting', results: this.results.rateLimitTests },
      { name: 'JWT Security', results: this.results.jwtTests },
      { name: 'File Upload Security', results: this.results.fileUploadTests },
      { name: 'Authentication Security', results: this.results.authTests },
      { name: 'Verified Vulnerabilities', results: this.results.verifiedVulnTests }
    ];
    
    suites.forEach(suite => {
      if (suite.results) {
        const status = suite.results.failed === 0 ? '✅' : '❌';
        console.log(`  ${status} ${suite.name}: ${suite.results.passed}/${suite.results.total}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

// CLI interface
if (require.main === module) {
  const runner = new SecurityTestRunner();
  
  runner.runAllSecurityTests()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Security test runner failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityTestRunner;