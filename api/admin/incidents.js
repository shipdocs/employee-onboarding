/**
 * Admin Incidents Management API
 * Handles incident management for admin dashboard
 */

const db = require('../../lib/database-direct');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { adminRateLimit } = require('../../lib/rateLimit');

async function getIncidents(req, res) {
  try {
    const {
      status = 'all',
      severity = 'all',
      limit = 50,
      offset = 0,
      timeRange = '7d'
    } = req.query;

    let query = supabase
      .from('incidents')
      .select('*')
      .order('detection_time', { ascending: false });

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity !== 'all') {
      query = query.eq('severity', severity);
    }

    // Apply time range filter
    if (timeRange !== 'all') {
      const timeRangeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeRangeMap[timeRange] || 24 * 7;
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      query = query.gte('detection_time', since.toISOString());
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: incidents, error } = await query;

    if (error) {
      console.error('Failed to fetch incidents:', error);
      return res.status(500).json({ error: 'Failed to fetch incidents' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true });

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    if (severity !== 'all') {
      countQuery = countQuery.eq('severity', severity);
    }

    if (timeRange !== 'all') {
      const timeRangeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeRangeMap[timeRange] || 24 * 7;
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      countQuery = countQuery.gte('detection_time', since.toISOString());
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Failed to get incidents count:', countError);
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('incidents')
      .select('status, severity')
      .gte('detection_time', new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString());

    let summary = {
      total: count || 0,
      byStatus: { detected: 0, acknowledged: 0, resolved: 0 },
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    if (!statsError && stats) {
      stats.forEach(incident => {
        if (incident.status) {
          summary.byStatus[incident.status] = (summary.byStatus[incident.status] || 0) + 1;
        }
        if (incident.severity) {
          summary.bySeverity[incident.severity] = (summary.bySeverity[incident.severity] || 0) + 1;
        }
      });
    }

    return res.json({
      incidents: incidents || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
      },
      summary,
      filters: {
        status,
        severity,
        timeRange
      }
    });

  } catch (error) {
    console.error('Get incidents error:', error);
    return res.status(500).json({
      error: 'Failed to fetch incidents',
      details: error.message
    });
  }
}

async function createIncident(req, res, user) {
  try {
    const {
      type,
      severity,
      title,
      description,
      affected_systems,
      metadata
    } = req.body;

    if (!type || !severity || !title) {
      return res.status(400).json({
        error: 'Missing required fields: type, severity, title'
      });
    }

    const incidentData = {
      incident_id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      status: 'detected',
      title,
      description: description || '',
      detection_time: new Date().toISOString(),
      affected_systems: affected_systems || [],
      metadata: {
        ...metadata,
        created_by: user.id,
        created_manually: true,
        timestamp: new Date().toISOString()
      }
    };

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert(incidentData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create incident:', error);
      return res.status(500).json({ error: 'Failed to create incident' });
    }

    return res.status(201).json({
      success: true,
      incident
    });

  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({
      error: 'Failed to create incident',
      details: error.message
    });
  }
}

/**
 * Main handler function
 */
async function handler(req, res) {
  try {
    applyApiSecurityHeaders(res);

    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getIncidents(req, res);
      case 'POST':
        return await createIncident(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin incidents API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(handler);
