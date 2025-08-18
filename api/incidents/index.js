/**
 * Incidents API
 * External API for incident response tools to interact with our incident system
 */

const { supabase } = require('../../lib/supabase');
const { incidentDetectionService } = require('../../lib/services/incidentDetectionService');
const { externalIntegrationService } = require('../../lib/services/externalIntegrationService');
const { requireRole } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

/**
 * GET /api/incidents - List incidents with filtering and pagination
 */
async function handleGetIncidents(req, res) {
  try {
    // Require admin or manager role for incident access
    const user = await requireRole(req, ['admin', 'manager']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 50,
      severity,
      type,
      status,
      since,
      until
    } = req.query;

    // Build query
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('detection_time', { ascending: false });

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (since) {
      query = query.gte('detection_time', since);
    }
    if (until) {
      query = query.lte('detection_time', until);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: incidents, error, count } = await query;

    if (error) {
      console.error('Error fetching incidents:', error);
      return res.status(500).json({ error: 'Failed to fetch incidents' });
    }

    return res.status(200).json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in handleGetIncidents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/incidents - Create manual incident (for external tools)
 */
async function handleCreateIncident(req, res) {
  try {
    // Require admin role for manual incident creation
    const user = await requireRole(req, ['admin']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      type,
      severity,
      title,
      description,
      affected_users = [],
      affected_systems = [],
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!type || !severity || !title) {
      return res.status(400).json({
        error: 'Missing required fields: type, severity, title'
      });
    }

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: 'Invalid severity. Must be one of: ' + validSeverities.join(', ')
      });
    }

    // Create incident
    const incident = await incidentDetectionService.createIncident({
      type,
      severity,
      title,
      description,
      sourceSystem: 'manual',
      sourceEventId: `manual-${Date.now()}`,
      affectedUsers: affected_users,
      affectedSystems: affected_systems,
      metadata: {
        ...metadata,
        created_by: user.email,
        manual_creation: true
      }
    });

    if (!incident) {
      return res.status(500).json({ error: 'Failed to create incident' });
    }

    // Send external notifications
    await externalIntegrationService.notifyExternalSystems(incident);

    return res.status(201).json({
      message: 'Incident created successfully',
      incident
    });

  } catch (error) {
    console.error('Error in handleCreateIncident:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Main handler function
 */
async function handler(req, res) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGetIncidents(req, res);
      case 'POST':
        return await handleCreateIncident(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Incidents API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(handler);