/**
 * Exit Strategy Performance Test API Endpoint
 * Runs performance validation tests for exit strategy operations
 */

const { exitPerformanceTestService } = require('../../../../lib/services/exitPerformanceTestService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAdmin } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      testLargeDataset = true,
      testConcurrentOperations = true,
      testMemoryUsage = true,
      testExportSizes = true,
      generateTestData = false
    } = req.body;

    // Log performance test start
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'performance_test_start',
      {
        action: 'exit_strategy_performance_test_started',
        test_config: {
          testLargeDataset,
          testConcurrentOperations,
          testMemoryUsage,
          testExportSizes,
          generateTestData
        },
        admin_user: user.email
      }
    );

    // Run performance tests
    const testResults = await exitPerformanceTestService.runPerformanceTests({
      testLargeDataset,
      testConcurrentOperations,
      testMemoryUsage,
      testExportSizes,
      generateTestData
    });

    // Log performance test completion
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'performance_test_complete',
      {
        action: 'exit_strategy_performance_test_completed',
        test_results: {
          duration: testResults.duration,
          summary: testResults.summary,
          test_count: testResults.tests.length
        },
        admin_user: user.email
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Performance tests completed successfully',
      results: {
        summary: testResults.summary,
        duration: testResults.duration,
        tests: testResults.tests.map(test => ({
          name: test.name,
          status: test.status,
          duration: test.endTime - test.startTime,
          warnings: test.warnings || [],
          metrics: test.metrics || {},
          error: test.error
        })),
        recommendations: this.generateRecommendations(testResults)
      }
    });

  } catch (error) {
    console.error('Performance test failed:', error);

    // Log performance test failure
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'performance_test_failed',
      {
        action: 'exit_strategy_performance_test_failed',
        error: error.message,
        admin_user: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Performance test failed',
      details: error.message
    });
  }
}

/**
 * Generate performance recommendations based on test results
 */
function generateRecommendations(testResults) {
  const recommendations = [];

  testResults.tests.forEach(test => {
    if (test.warnings && test.warnings.length > 0) {
      test.warnings.forEach(warning => {
        if (warning.includes('Export time')) {
          recommendations.push({
            type: 'performance',
            priority: 'high',
            issue: 'Export time exceeds threshold',
            recommendation: 'Consider implementing data pagination or background processing for large exports'
          });
        }

        if (warning.includes('Memory usage')) {
          recommendations.push({
            type: 'memory',
            priority: 'high',
            issue: 'Memory usage exceeds threshold',
            recommendation: 'Implement streaming data processing to reduce memory footprint'
          });
        }

        if (warning.includes('file size')) {
          recommendations.push({
            type: 'storage',
            priority: 'medium',
            issue: 'Export file size exceeds threshold',
            recommendation: 'Consider data compression or selective export options'
          });
        }

        if (warning.includes('concurrent requests failed')) {
          recommendations.push({
            type: 'concurrency',
            priority: 'medium',
            issue: 'Concurrent operations failing',
            recommendation: 'Implement request queuing or rate limiting for export operations'
          });
        }
      });
    }
  });

  // Add general recommendations
  if (testResults.summary.warnings > 0) {
    recommendations.push({
      type: 'general',
      priority: 'low',
      issue: 'Performance warnings detected',
      recommendation: 'Monitor system resources during peak usage and consider scaling infrastructure'
    });
  }

  if (testResults.summary.failed > 0) {
    recommendations.push({
      type: 'reliability',
      priority: 'critical',
      issue: 'Some performance tests failed',
      recommendation: 'Review failed tests and address underlying issues before production deployment'
    });
  }

  return recommendations;
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication and audit logging
module.exports = withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.ADMIN_ACTION,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.MEDIUM
  }
);
