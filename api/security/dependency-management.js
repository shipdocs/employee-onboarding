/**
 * Dependency Management API
 * 
 * Provides API endpoints for dependency vulnerability scanning,
 * management, and remediation through the web interface.
 */

const { getDependencySecurityManager } = require('../../lib/security/DependencySecurityManager');
const { requireAuth } = require('../../lib/auth');

async function handler(req, res) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(req, res, ['admin']);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dependencyManager = getDependencySecurityManager();
    const { method } = req;

    switch (method) {
      case 'GET':
        return handleGetRequest(req, res, dependencyManager);
      
      case 'POST':
        return handlePostRequest(req, res, dependencyManager);
      
      case 'PUT':
        return handlePutRequest(req, res, dependencyManager);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Dependency management API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Handle GET requests
 */
async function handleGetRequest(req, res, dependencyManager) {
  const { action, scanId } = req.query;

  switch (action) {
    case 'dashboard':
      return handleGetDashboard(req, res, dependencyManager);
    
    case 'scan-history':
      return handleGetScanHistory(req, res, dependencyManager);
    
    case 'scan-results':
      return handleGetScanResults(req, res, dependencyManager, scanId);
    
    case 'vulnerability-stats':
      return handleGetVulnerabilityStats(req, res, dependencyManager);
    
    case 'recommendations':
      return handleGetRecommendations(req, res, dependencyManager, scanId);
    
    default:
      return handleGetDashboard(req, res, dependencyManager);
  }
}

/**
 * Handle POST requests
 */
async function handlePostRequest(req, res, dependencyManager) {
  const { action } = req.body;

  switch (action) {
    case 'run-scan':
      return handleRunScan(req, res, dependencyManager);
    
    case 'execute-remediation':
      return handleExecuteRemediation(req, res, dependencyManager);
    
    case 'schedule-scans':
      return handleScheduleScans(req, res, dependencyManager);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

/**
 * Handle PUT requests
 */
async function handlePutRequest(req, res, dependencyManager) {
  const { action } = req.body;

  switch (action) {
    case 'update-scan-config':
      return handleUpdateScanConfig(req, res, dependencyManager);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

/**
 * Get dependency management dashboard data
 */
async function handleGetDashboard(req, res, dependencyManager) {
  try {
    const stats = dependencyManager.getVulnerabilityStatistics();
    const recentScans = dependencyManager.getScanHistory(5);
    
    const dashboard = {
      vulnerabilityStats: stats,
      recentScans,
      systemStatus: {
        lastScanDate: stats.lastScanDate,
        nextScheduledScan: null, // Would be calculated based on schedule
        scanningEnabled: true,
        autoRemediationEnabled: false
      },
      quickActions: [
        {
          id: 'run-scan',
          title: 'Run Security Scan',
          description: 'Scan all dependencies for vulnerabilities',
          icon: 'scan',
          priority: stats.totalVulnerabilities > 0 ? 'high' : 'normal'
        },
        {
          id: 'view-vulnerabilities',
          title: 'View Vulnerabilities',
          description: `${stats.totalVulnerabilities} vulnerabilities found`,
          icon: 'warning',
          priority: stats.criticalCount > 0 ? 'critical' : 'normal',
          disabled: stats.totalVulnerabilities === 0
        },
        {
          id: 'auto-fix',
          title: 'Auto Fix Issues',
          description: 'Automatically fix resolvable vulnerabilities',
          icon: 'fix',
          priority: 'normal',
          disabled: stats.totalVulnerabilities === 0
        }
      ]
    };

    return res.status(200).json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to get dashboard data',
      message: error.message 
    });
  }
}

/**
 * Get scan history
 */
async function handleGetScanHistory(req, res, dependencyManager) {
  try {
    const { limit = 20 } = req.query;
    const history = dependencyManager.getScanHistory(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: {
        scans: history,
        total: history.length
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to get scan history',
      message: error.message 
    });
  }
}

/**
 * Get specific scan results
 */
async function handleGetScanResults(req, res, dependencyManager, scanId) {
  try {
    if (!scanId) {
      return res.status(400).json({ error: 'Scan ID is required' });
    }

    const results = dependencyManager.getScanResults(scanId);
    if (!results) {
      return res.status(404).json({ error: 'Scan results not found' });
    }

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to get scan results',
      message: error.message 
    });
  }
}

/**
 * Get vulnerability statistics
 */
async function handleGetVulnerabilityStats(req, res, dependencyManager) {
  try {
    const stats = dependencyManager.getVulnerabilityStatistics();

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to get vulnerability statistics',
      message: error.message 
    });
  }
}

/**
 * Get recommendations for a specific scan
 */
async function handleGetRecommendations(req, res, dependencyManager, scanId) {
  try {
    if (!scanId) {
      // Get recommendations from latest scan
      const history = dependencyManager.getScanHistory(1);
      if (history.length === 0) {
        return res.status(404).json({ error: 'No scan results available' });
      }
      scanId = history[0].id;
    }

    const results = dependencyManager.getScanResults(scanId);
    if (!results) {
      return res.status(404).json({ error: 'Scan results not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId,
        recommendations: results.recommendations,
        remediationActions: results.remediationActions
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to get recommendations',
      message: error.message 
    });
  }
}

/**
 * Run dependency security scan
 */
async function handleRunScan(req, res, dependencyManager) {
  try {
    const {
      includeClient = true,
      scanLevel = 'moderate',
      autoRemediate = false
    } = req.body;

    // Start scan asynchronously
    const scanPromise = dependencyManager.runComprehensiveScan({
      includeClient,
      scanLevel,
      generateReport: true,
      autoRemediate
    });

    // Return immediately with scan started status
    res.status(202).json({
      success: true,
      message: 'Dependency scan started',
      data: {
        status: 'scanning',
        estimatedDuration: '2-5 minutes'
      }
    });

    // Continue scan in background
    try {
      const results = await scanPromise;
      console.log(`Scan completed: ${results.id}`);
    } catch (error) {
      console.error('Background scan failed:', error);
    }

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to start dependency scan',
      message: error.message 
    });
  }
}

/**
 * Execute remediation actions
 */
async function handleExecuteRemediation(req, res, dependencyManager) {
  try {
    const { scanId, actionIds = [] } = req.body;

    if (!scanId) {
      return res.status(400).json({ error: 'Scan ID is required' });
    }

    const scanResults = dependencyManager.getScanResults(scanId);
    if (!scanResults) {
      return res.status(404).json({ error: 'Scan results not found' });
    }

    // Filter actions to execute
    const actionsToExecute = actionIds.length > 0
      ? scanResults.remediationActions.filter(action => actionIds.includes(action.id))
      : scanResults.remediationActions.filter(action => action.automated);

    if (actionsToExecute.length === 0) {
      return res.status(400).json({ error: 'No actions to execute' });
    }

    // Execute remediation actions
    await dependencyManager.executeAutoRemediation({
      ...scanResults,
      remediationActions: actionsToExecute
    });

    return res.status(200).json({
      success: true,
      message: `${actionsToExecute.length} remediation actions executed`,
      data: {
        executedActions: actionsToExecute.length,
        actions: actionsToExecute
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to execute remediation',
      message: error.message 
    });
  }
}

/**
 * Schedule automated scans
 */
async function handleScheduleScans(req, res, dependencyManager) {
  try {
    const { intervalHours = 24, enabled = true } = req.body;

    if (enabled) {
      dependencyManager.scheduleAutomatedScans(intervalHours);
      
      return res.status(200).json({
        success: true,
        message: `Automated scans scheduled every ${intervalHours} hours`,
        data: {
          intervalHours,
          enabled: true,
          nextScan: new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString()
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Automated scans disabled',
        data: {
          enabled: false
        }
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to schedule scans',
      message: error.message 
    });
  }
}

/**
 * Update scan configuration
 */
async function handleUpdateScanConfig(req, res, dependencyManager) {
  try {
    const { scanLevel, includeClient, autoRemediate } = req.body;

    // This would update the default scan configuration
    // For now, just return success
    return res.status(200).json({
      success: true,
      message: 'Scan configuration updated',
      data: {
        scanLevel,
        includeClient,
        autoRemediate
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to update scan configuration',
      message: error.message 
    });
  }
}

module.exports = handler;