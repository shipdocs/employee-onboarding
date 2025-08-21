/**
 * API endpoints for managing external logging configuration
 * Only accessible by admin users
 */

const { authenticateRequest } = require('../../lib/auth');
const db = require('../../lib/database');
const externalLoggingService = require('../../lib/services/externalLoggingService');
const { authRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {
    // Authenticate and verify admin role
    const user = await authenticateRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { method } = req;
    const path = req.url.split('?')[0];
    const pathParts = path.split('/').filter(Boolean);

    // GET /api/admin/external-logging/config
    if (method === 'GET' && pathParts[3] === 'config') {
      return await getConfiguration(req, res, user);
    }

    // PUT /api/admin/external-logging/config
    if (method === 'PUT' && pathParts[3] === 'config') {
      return await updateConfiguration(req, res, user);
    }

    // POST /api/admin/external-logging/test
    if (method === 'POST' && pathParts[3] === 'test') {
      return await testConnection(req, res, user);
    }

    // GET /api/admin/external-logging/stats
    if (method === 'GET' && pathParts[3] === 'stats') {
      return await getStatistics(req, res, user);
    }

    // GET /api/admin/external-logging/filters
    if (method === 'GET' && pathParts[3] === 'filters') {
      return await getFilters(req, res, user);
    }

    // POST /api/admin/external-logging/filters
    if (method === 'POST' && pathParts[3] === 'filters') {
      return await addFilter(req, res, user);
    }

    // DELETE /api/admin/external-logging/filters/:id
    if (method === 'DELETE' && pathParts[3] === 'filters' && pathParts[4]) {
      return await deleteFilter(req, res, user, pathParts[4]);
    }

    // GET /api/admin/external-logging/audit
    if (method === 'GET' && pathParts[3] === 'audit') {
      return await getAuditLog(req, res, user);
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('External logging API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current external logging configuration
 */
async function getConfiguration(req, res, user) {
  try {
    const result = await db.query(
      `SELECT 
        provider,
        enabled,
        endpoint_url,
        api_user,
        log_level,
        include_security_events,
        include_auth_events,
        includeerror_logs,
        include_audit_logs,
        max_logs_per_minute,
        batch_size,
        flush_interval_ms,
        configured_by,
        configured_at,
        last_modified_at,
        last_connection_test,
        last_connection_status,
        lasterror_message,
        logs_sent_today,
        logs_sent_month,
        last_log_sent_at
      FROM external_logging_config 
      WHERE provider = $1`,
      ['grafana_cloud']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const config = result.rows[0];
    
    // Never send the encrypted API key to the client
    // Only indicate if it's configured
    config.api_key_configured = config.api_key_encrypted ? true : false;
    delete config.api_key_encrypted;

    // Log audit event
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [user.userId, 'view_external_logging_config', 'external_logging', JSON.stringify({ provider: 'grafana_cloud' })]
    );

    return res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Failed to get external logging configuration:', error);
    return res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
}

/**
 * Update external logging configuration
 */
async function updateConfiguration(req, res, user) {
  try {
    const config = req.body;

    // Validate required fields when enabling
    if (config.enabled === true) {
      if (!config.endpoint_url && !config.skip_endpoint_validation) {
        return res.status(400).json({ error: 'Endpoint URL is required when enabling external logging' });
      }
      if (!config.api_key && !config.skip_api_key_validation) {
        // Check if API key is already configured
        const existing = await db.query(
          'SELECT api_key_encrypted FROM external_logging_config WHERE provider = $1',
          ['grafana_cloud']
        );
        if (!existing.rows[0]?.api_key_encrypted) {
          return res.status(400).json({ error: 'API key is required when enabling external logging' });
        }
      }
    }

    // Update configuration
    const result = await externalLoggingService.updateConfiguration(config, user.userId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Log audit event
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        config.enabled ? 'enable_external_logging' : 'disable_external_logging',
        'external_logging',
        JSON.stringify({ provider: 'grafana_cloud', changes: config })
      ]
    );

    return res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Failed to update external logging configuration:', error);
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
}

/**
 * Test connection to external logging service
 */
async function testConnection(req, res, user) {
  try {
    const result = await externalLoggingService.testConnection();

    // Log audit event
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        'test_external_logging_connection',
        'external_logging',
        JSON.stringify({ provider: 'grafana_cloud', result })
      ]
    );

    return res.json(result);
  } catch (error) {
    console.error('Failed to test external logging connection:', error);
    return res.status(500).json({ error: 'Connection test failed', message: error.message });
  }
}

/**
 * Get external logging statistics
 */
async function getStatistics(req, res, user) {
  try {
    const stats = await db.query(
      `SELECT 
        logs_sent_today,
        logs_sent_month,
        last_log_sent_at,
        last_connection_status,
        last_connection_test
      FROM external_logging_config 
      WHERE provider = $1`,
      ['grafana_cloud']
    );

    // Get daily statistics for the last 7 days
    const dailyStats = await db.query(
      `SELECT 
        DATE(changed_at) as date,
        COUNT(*) as events
      FROM external_logging_audit
      WHERE provider = $1 
        AND changed_at > CURRENT_DATE - INTERVAL '7 days'
        AND action IN ('log_sent', 'batch_sent')
      GROUP BY DATE(changed_at)
      ORDER BY date DESC`,
      ['grafana_cloud']
    );

    return res.json({
      success: true,
      current: stats.rows[0] || {},
      daily: dailyStats.rows
    });
  } catch (error) {
    console.error('Failed to get external logging statistics:', error);
    return res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
}

/**
 * Get external logging filters
 */
async function getFilters(req, res, user) {
  try {
    const result = await db.query(
      `SELECT * FROM external_logging_filters 
       WHERE provider = $1 
       ORDER BY filter_type, field_name`,
      ['grafana_cloud']
    );

    return res.json({
      success: true,
      filters: result.rows
    });
  } catch (error) {
    console.error('Failed to get external logging filters:', error);
    return res.status(500).json({ error: 'Failed to retrieve filters' });
  }
}

/**
 * Add external logging filter
 */
async function addFilter(req, res, user) {
  try {
    const { filter_type, field_name, operator, value, enabled = true } = req.body;

    // Validate required fields
    if (!filter_type || !field_name || !operator || !value) {
      return res.status(400).json({ error: 'Missing required filter fields' });
    }

    // Validate filter type
    if (!['include', 'exclude'].includes(filter_type)) {
      return res.status(400).json({ error: 'Invalid filter type. Must be "include" or "exclude"' });
    }

    // Validate operator
    if (!['equals', 'contains', 'regex', 'greater_than'].includes(operator)) {
      return res.status(400).json({ error: 'Invalid operator' });
    }

    const result = await db.query(
      `INSERT INTO external_logging_filters 
       (provider, filter_type, field_name, operator, value, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['grafana_cloud', filter_type, field_name, operator, value, enabled]
    );

    // Log audit event
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        'add_external_logging_filter',
        'external_logging',
        JSON.stringify({ filter: result.rows[0] })
      ]
    );

    return res.json({
      success: true,
      filter: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to add external logging filter:', error);
    return res.status(500).json({ error: 'Failed to add filter' });
  }
}

/**
 * Delete external logging filter
 */
async function deleteFilter(req, res, user, filterId) {
  try {
    const result = await db.query(
      `DELETE FROM external_logging_filters 
       WHERE id = $1 AND provider = $2
       RETURNING *`,
      [filterId, 'grafana_cloud']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    // Log audit event
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        'delete_external_logging_filter',
        'external_logging',
        JSON.stringify({ filter: result.rows[0] })
      ]
    );

    return res.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete external logging filter:', error);
    return res.status(500).json({ error: 'Failed to delete filter' });
  }
}

/**
 * Get external logging audit log
 */
async function getAuditLog(req, res, user) {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT * FROM external_logging_audit 
       WHERE provider = $1
       ORDER BY changed_at DESC
       LIMIT $2 OFFSET $3`,
      ['grafana_cloud', limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM external_logging_audit WHERE provider = $1`,
      ['grafana_cloud']
    );

    return res.json({
      success: true,
      audit_logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Failed to get external logging audit log:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit log' });
  }
}

module.exports = authRateLimit(handler);