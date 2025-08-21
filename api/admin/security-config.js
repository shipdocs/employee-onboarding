/**
 * Security Configuration API
 * 
 * Admin-only endpoints for managing security alert configuration via GUI
 */

const { SecurityConfigService } = require('../../lib/security/SecurityConfigService');
const { authMiddleware } = require('../../lib/auth');

const securityConfigService = new SecurityConfigService();

/**
 * GET /api/admin/security-config
 * Get all security configuration
 */
async function getSecurityConfig(req, res) {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [
      config,
      recipients,
      thresholds,
      dashboardStats
    ] = await Promise.all([
      securityConfigService.getConfig(),
      securityConfigService.getAlertRecipients(),
      securityConfigService.getAlertThresholds(),
      securityConfigService.getDashboardStats('24h')
    ]);

    res.json({
      success: true,
      data: {
        config,
        recipients: recipients.success ? recipients.data : {},
        thresholds: thresholds.success ? thresholds.data : {},
        stats: dashboardStats.success ? dashboardStats.data : {}
      }
    });

  } catch (error) {
    console.error('Error getting security config:', error);
    res.status(500).json({ error: 'Failed to get security configuration' });
  }
}

/**
 * PUT /api/admin/security-config/:configKey
 * Update security configuration setting
 */
async function updateSecurityConfig(req, res) {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { configKey } = req.params;
    const { configValue, description } = req.body;

    if (!configKey || configValue === undefined) {
      return res.status(400).json({ error: 'Config key and value are required' });
    }

    const result = await securityConfigService.updateConfig(
      configKey,
      configValue,
      req.user.id,
      description
    );

    if (result.success) {
      res.json({ success: true, message: 'Configuration updated successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error updating security config:', error);
    res.status(500).json({ error: 'Failed to update security configuration' });
  }
}

/**
 * GET /api/admin/security-config/recipients
 * Get alert recipients
 */
async function getAlertRecipients(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { alertType } = req.query;
    const result = await securityConfigService.getAlertRecipients(alertType);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error getting alert recipients:', error);
    res.status(500).json({ error: 'Failed to get alert recipients' });
  }
}

/**
 * POST /api/admin/security-config/recipients
 * Add alert recipient
 */
async function addAlertRecipient(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { alertType, recipientType, recipientValue } = req.body;

    if (!alertType || !recipientType || !recipientValue) {
      return res.status(400).json({ 
        error: 'Alert type, recipient type, and recipient value are required' 
      });
    }

    // Validate alert type
    if (!['critical', 'warning', 'info'].includes(alertType)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    // Validate recipient type
    if (!['email', 'slack', 'webhook'].includes(recipientType)) {
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    // Validate email format if recipient type is email
    if (recipientType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientValue)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    const result = await securityConfigService.addAlertRecipient(
      alertType,
      recipientType,
      recipientValue,
      req.user.id
    );

    if (result.success) {
      res.json({ success: true, message: 'Alert recipient added successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error adding alert recipient:', error);
    res.status(500).json({ error: 'Failed to add alert recipient' });
  }
}

/**
 * DELETE /api/admin/security-config/recipients/:id
 * Remove alert recipient
 */
async function removeAlertRecipient(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid recipient ID is required' });
    }

    const result = await securityConfigService.removeAlertRecipient(parseInt(id));

    if (result.success) {
      res.json({ success: true, message: 'Alert recipient removed successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error removing alert recipient:', error);
    res.status(500).json({ error: 'Failed to remove alert recipient' });
  }
}

/**
 * GET /api/admin/security-config/thresholds
 * Get alert thresholds
 */
async function getAlertThresholds(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await securityConfigService.getAlertThresholds();

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error getting alert thresholds:', error);
    res.status(500).json({ error: 'Failed to get alert thresholds' });
  }
}

/**
 * PUT /api/admin/security-config/thresholds/:metricName
 * Update alert threshold
 */
async function updateAlertThreshold(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { metricName } = req.params;
    const { warningThreshold, criticalThreshold } = req.body;

    if (!metricName) {
      return res.status(400).json({ error: 'Metric name is required' });
    }

    if (warningThreshold === undefined || criticalThreshold === undefined) {
      return res.status(400).json({ error: 'Warning and critical thresholds are required' });
    }

    if (warningThreshold < 0 || criticalThreshold < 0) {
      return res.status(400).json({ error: 'Thresholds must be non-negative' });
    }

    if (warningThreshold >= criticalThreshold) {
      return res.status(400).json({ error: 'Warning threshold must be less than critical threshold' });
    }

    const result = await securityConfigService.updateAlertThreshold(
      metricName,
      warningThreshold,
      criticalThreshold,
      req.user.id
    );

    if (result.success) {
      res.json({ success: true, message: 'Alert threshold updated successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error updating alert threshold:', error);
    res.status(500).json({ error: 'Failed to update alert threshold' });
  }
}

/**
 * GET /api/admin/security-config/alerts
 * Get security alerts with pagination and filtering
 */
async function getSecurityAlerts(req, res) {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Admin or manager access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page

    const filters = {};
    if (req.query.alertType) filters.alertType = req.query.alertType;
    if (req.query.metricName) filters.metricName = req.query.metricName;
    if (req.query.isResolved !== undefined) filters.isResolved = req.query.isResolved === 'true';
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const result = await securityConfigService.getAlerts(page, limit, filters);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({ error: 'Failed to get security alerts' });
  }
}

/**
 * PUT /api/admin/security-config/alerts/:alertId/resolve
 * Mark alert as resolved
 */
async function resolveAlert(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { alertId } = req.params;
    const { resolutionNotes } = req.body;

    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const result = await securityConfigService.resolveAlert(
      alertId,
      req.user.id,
      resolutionNotes
    );

    if (result.success) {
      res.json({ success: true, message: 'Alert resolved successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
}

// Export handlers
module.exports = {
  getSecurityConfig,
  updateSecurityConfig,
  getAlertRecipients,
  addAlertRecipient,
  removeAlertRecipient,
  getAlertThresholds,
  updateAlertThreshold,
  getSecurityAlerts,
  resolveAlert
};
