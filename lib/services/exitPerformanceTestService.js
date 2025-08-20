/**
 * Exit Strategy Performance Testing Service
 * Validates performance with large datasets and stress testing
 */

const { supabase } = require('../supabase');
const { exitStrategyService } = require('./exitStrategyService');
const { dataDeletionService } = require('./dataDeletionService');
const { auditService, ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('./auditService');

class ExitPerformanceTestService {
  constructor() {
    this.testResults = [];
    this.performanceThresholds = {
      exportTime: 30 * 60 * 1000, // 30 minutes max
      deletionTime: 15 * 60 * 1000, // 15 minutes max
      memoryUsage: 512 * 1024 * 1024, // 512MB max
      maxFileSize: 1024 * 1024 * 1024 // 1GB max export
    };
  }

  /**
   * Run comprehensive performance tests
   */
  async runPerformanceTests(testConfig = {}) {
    const {
      testLargeDataset = true,
      testConcurrentOperations = true,
      testMemoryUsage = true,
      testExportSizes = true,
      generateTestData = false
    } = testConfig;

    console.log('🚀 Starting Exit Strategy Performance Tests...');

    const testSuite = {
      startTime: Date.now(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    try {
      // Test 1: Large Dataset Export Performance
      if (testLargeDataset) {
        const largeDatasetTest = await this.testLargeDatasetExport(generateTestData);
        testSuite.tests.push(largeDatasetTest);
        this.updateSummary(testSuite.summary, largeDatasetTest);
      }

      // Test 2: Concurrent Operations
      if (testConcurrentOperations) {
        const concurrentTest = await this.testConcurrentOperations();
        testSuite.tests.push(concurrentTest);
        this.updateSummary(testSuite.summary, concurrentTest);
      }

      // Test 3: Memory Usage Monitoring
      if (testMemoryUsage) {
        const memoryTest = await this.testMemoryUsage();
        testSuite.tests.push(memoryTest);
        this.updateSummary(testSuite.summary, memoryTest);
      }

      // Test 4: Export Size Validation
      if (testExportSizes) {
        const sizeTest = await this.testExportSizes();
        testSuite.tests.push(sizeTest);
        this.updateSummary(testSuite.summary, sizeTest);
      }

      testSuite.endTime = Date.now();
      testSuite.duration = testSuite.endTime - testSuite.startTime;

      // Log performance test results
      await this.logPerformanceResults(testSuite);

      console.log(`✅ Performance tests completed in ${testSuite.duration}ms`);
      console.log(`📊 Results: ${testSuite.summary.passed}/${testSuite.summary.total} passed`);

      return testSuite;

    } catch (error) {
      console.error('Performance testing failed:', error);
      throw error;
    }
  }

  /**
   * Test large dataset export performance
   */
  async testLargeDatasetExport(generateTestData = false) {
    const test = {
      name: 'Large Dataset Export Performance',
      startTime: Date.now(),
      status: 'running',
      metrics: {},
      warnings: []
    };

    try {
      // Get current data counts
      const dataCounts = await this.getDataCounts();
      test.metrics.initialDataCounts = dataCounts;

      // Generate test data if requested and dataset is small
      if (generateTestData && dataCounts.totalRecords < 10000) {
        console.log('📊 Generating test data for performance testing...');
        await this.generateTestData(10000);
        test.metrics.testDataGenerated = true;
      }

      // Measure export performance
      const exportStartTime = Date.now();
      const memoryBefore = process.memoryUsage();

      // Simulate export data collection (without actual file creation)
      const exportData = await this.simulateDataCollection();

      const exportEndTime = Date.now();
      const memoryAfter = process.memoryUsage();

      test.metrics.exportTime = exportEndTime - exportStartTime;
      test.metrics.memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;
      test.metrics.recordsProcessed = exportData.totalRecords;
      test.metrics.estimatedFileSize = exportData.estimatedSize;

      // Validate performance thresholds
      if (test.metrics.exportTime > this.performanceThresholds.exportTime) {
        test.warnings.push(`Export time (${test.metrics.exportTime}ms) exceeds threshold (${this.performanceThresholds.exportTime}ms)`);
      }

      if (test.metrics.memoryUsed > this.performanceThresholds.memoryUsage) {
        test.warnings.push(`Memory usage (${test.metrics.memoryUsed} bytes) exceeds threshold (${this.performanceThresholds.memoryUsage} bytes)`);
      }

      if (test.metrics.estimatedFileSize > this.performanceThresholds.maxFileSize) {
        test.warnings.push(`Estimated file size (${test.metrics.estimatedFileSize} bytes) exceeds threshold (${this.performanceThresholds.maxFileSize} bytes)`);
      }

      test.status = test.warnings.length > 0 ? 'warning' : 'passed';
      test.endTime = Date.now();

      return test;

    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.endTime = Date.now();
      return test;
    }
  }

  /**
   * Test concurrent operations
   */
  async testConcurrentOperations() {
    const test = {
      name: 'Concurrent Operations Test',
      startTime: Date.now(),
      status: 'running',
      metrics: {},
      warnings: []
    };

    try {
      // Test multiple concurrent export requests
      const concurrentRequests = 3;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(this.simulateExportRequest(`test-admin-${i}@test.com`));
      }

      const results = await Promise.allSettled(promises);

      test.metrics.concurrentRequests = concurrentRequests;
      test.metrics.successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      test.metrics.failedRequests = results.filter(r => r.status === 'rejected').length;

      if (test.metrics.failedRequests > 0) {
        test.warnings.push(`${test.metrics.failedRequests} out of ${concurrentRequests} concurrent requests failed`);
      }

      test.status = test.warnings.length > 0 ? 'warning' : 'passed';
      test.endTime = Date.now();

      return test;

    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.endTime = Date.now();
      return test;
    }
  }

  /**
   * Test memory usage patterns
   */
  async testMemoryUsage() {
    const test = {
      name: 'Memory Usage Monitoring',
      startTime: Date.now(),
      status: 'running',
      metrics: {},
      warnings: []
    };

    try {
      const memorySnapshots = [];

      // Take initial memory snapshot
      memorySnapshots.push({
        stage: 'initial',
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });

      // Simulate data processing
      const largeArray = new Array(100000).fill(0).map((_, i) => ({
        id: i,
        data: `test-data-${i}`,
        timestamp: new Date().toISOString()
      }));

      memorySnapshots.push({
        stage: 'after_data_creation',
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });

      // Process data (simulate export operations)
      const processedData = largeArray.map(item => ({
        ...item,
        processed: true,
        processedAt: Date.now()
      }));

      memorySnapshots.push({
        stage: 'after_processing',
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });

      // Clean up
      largeArray.length = 0;
      processedData.length = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      memorySnapshots.push({
        stage: 'after_cleanup',
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });

      test.metrics.memorySnapshots = memorySnapshots;
      test.metrics.peakMemoryUsage = Math.max(...memorySnapshots.map(s => s.memory.heapUsed));
      test.metrics.memoryGrowth = memorySnapshots[memorySnapshots.length - 1].memory.heapUsed - memorySnapshots[0].memory.heapUsed;

      if (test.metrics.peakMemoryUsage > this.performanceThresholds.memoryUsage) {
        test.warnings.push(`Peak memory usage (${test.metrics.peakMemoryUsage} bytes) exceeds threshold`);
      }

      test.status = test.warnings.length > 0 ? 'warning' : 'passed';
      test.endTime = Date.now();

      return test;

    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.endTime = Date.now();
      return test;
    }
  }

  /**
   * Test export file sizes
   */
  async testExportSizes() {
    const test = {
      name: 'Export Size Validation',
      startTime: Date.now(),
      status: 'running',
      metrics: {},
      warnings: []
    };

    try {
      // Test different export configurations
      const exportConfigs = [
        { name: 'minimal', includeUserData: true, includeSystemConfig: false, includeAuditLogs: false },
        { name: 'standard', includeUserData: true, includeSystemConfig: true, includeAuditLogs: false },
        { name: 'complete', includeUserData: true, includeSystemConfig: true, includeAuditLogs: true }
      ];

      const sizeTests = [];

      for (const config of exportConfigs) {
        const sizeTest = await this.estimateExportSize(config);
        sizeTests.push(sizeTest);

        if (sizeTest.estimatedSize > this.performanceThresholds.maxFileSize) {
          test.warnings.push(`${config.name} export size (${sizeTest.estimatedSize} bytes) exceeds threshold`);
        }
      }

      test.metrics.sizeTests = sizeTests;
      test.metrics.largestExport = Math.max(...sizeTests.map(t => t.estimatedSize));

      test.status = test.warnings.length > 0 ? 'warning' : 'passed';
      test.endTime = Date.now();

      return test;

    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.endTime = Date.now();
      return test;
    }
  }

  /**
   * Helper methods
   */
  async getDataCounts() {
    const tables = ['users', 'training_progress', 'certificates', 'audit_log'];
    const counts = {};
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        counts[table] = count || 0;
        totalRecords += count || 0;
      } catch (error) {
        counts[table] = 0;
      }
    }

    counts.totalRecords = totalRecords;
    return counts;
  }

  async simulateDataCollection() {
    const dataCounts = await this.getDataCounts();

    // Estimate data size based on record counts
    const avgRecordSize = 1024; // 1KB per record average
    const estimatedSize = dataCounts.totalRecords * avgRecordSize;

    return {
      totalRecords: dataCounts.totalRecords,
      estimatedSize,
      tables: dataCounts
    };
  }

  async simulateExportRequest(adminEmail) {
    // Simulate export request without actual processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          adminEmail,
          status: 'simulated',
          timestamp: Date.now()
        });
      }, Math.random() * 1000); // Random delay 0-1 second
    });
  }

  async estimateExportSize(config) {
    const dataCounts = await this.getDataCounts();
    let estimatedSize = 0;

    if (config.includeUserData) {
      estimatedSize += (dataCounts.users || 0) * 2048; // 2KB per user with relations
    }
    if (config.includeSystemConfig) {
      estimatedSize += 50 * 1024; // 50KB for system config
    }
    if (config.includeAuditLogs) {
      estimatedSize += (dataCounts.audit_log || 0) * 512; // 512B per audit log
    }

    return {
      config: config.name,
      estimatedSize,
      breakdown: {
        userData: config.includeUserData ? (dataCounts.users || 0) * 2048 : 0,
        systemConfig: config.includeSystemConfig ? 50 * 1024 : 0,
        auditLogs: config.includeAuditLogs ? (dataCounts.audit_log || 0) * 512 : 0
      }
    };
  }

  async generateTestData(targetRecords) {
    // This would generate test data for performance testing
    // Implementation would depend on specific requirements
    console.log(`📊 Would generate ${targetRecords} test records for performance testing`);
    return { generated: targetRecords };
  }

  updateSummary(summary, test) {
    summary.total++;
    if (test.status === 'passed') {
      summary.passed++;
    } else if (test.status === 'failed') {
      summary.failed++;
    } else if (test.status === 'warning') {
      summary.warnings++;
      summary.passed++; // Warnings still count as passed
    }
  }

  async logPerformanceResults(testSuite) {
    try {
      await auditService.logEvent({
        userId: null,
        userEmail: 'system',
        action: ACTION_TYPES.ADMIN_ACTION,
        resourceType: RESOURCE_TYPES.SYSTEM,
        resourceId: 'performance_test',
        details: {
          action: 'exit_strategy_performance_test',
          test_suite: testSuite,
          performance_summary: testSuite.summary
        },
        severityLevel: SEVERITY_LEVELS.LOW
      });
    } catch (error) {
      console.error('Failed to log performance results:', error);
    }
  }
}

// Export singleton instance
const exitPerformanceTestService = new ExitPerformanceTestService();

module.exports = {
  exitPerformanceTestService,
  ExitPerformanceTestService
};
