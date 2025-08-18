/**
 * Security Incident Response API
 * 
 * Provides API endpoints for security incident management,
 * escalation, and forensic data access.
 */

const { getSecurityIncidentResponse } = require('../../lib/security/SecurityIncidentResponse');
const { requireAuth } = require('../../lib/auth');

async function handler(req, res) {
  try {
    // Require admin or security team authentication
    const authResult = await requireAuth(req, res, ['admin', 'security']);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const securityIncidentResponse = getSecurityIncidentResponse();
    const { method } = req;

    switch (method) {
      case 'GET':
        return handleGetRequest(req, res, securityIncidentResponse);
      
      case 'POST':
        return handlePostRequest(req, res, securityIncidentResponse);
      
      case 'PUT':
        return handlePutRequest(req, res, securityIncidentResponse);
      
      case 'DELETE':
        return handleDeleteRequest(req, res, securityIncidentResponse);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Security incident response API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Handle GET requests
 */
async function handleGetRequest(req, res, securityIncidentResponse) {
  const { action, id } = req.query;

  switch (action) {
    case 'list':
      return handleListIncidents(req, res, securityIncidentResponse);
    
    case 'get':
      return handleGetIncident(req, res, securityIncidentResponse, id);
    
    case 'report':
      return handleGetReport(req, res, securityIncidentResponse);
    
    case 'playbooks':
      return handleGetPlaybooks(req, res, securityIncidentResponse);
    
    case 'forensics':
      return handleGetForensics(req, res, securityIncidentResponse, id);
    
    default:
      return handleListIncidents(req, res, securityIncidentResponse);
  }
}

/**
 * Handle POST requests
 */
async function handlePostRequest(req, res, securityIncidentResponse) {
  const { action } = req.body;

  switch (action) {
    case 'create':
      return handleCreateIncident(req, res, securityIncidentResponse);
    
    case 'escalate':
      return handleEscalateIncident(req, res, securityIncidentResponse);
    
    case 'test':
      return handleTestIncident(req, res, securityIncidentResponse);
    
    default:
      return handleCreateIncident(req, res, securityIncidentResponse);
  }
}

/**
 * Handle PUT requests
 */
async function handlePutRequest(req, res, securityIncidentResponse) {
  const { id } = req.query;
  const updates = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Incident ID is required' });
  }

  try {
    const incident = securityIncidentResponse.updateIncident(id, {
      ...updates,
      updatedBy: req.user?.email || 'api'
    });

    return res.status(200).json({
      success: true,
      data: incident,
      message: 'Incident updated successfully'
    });

  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
}

/**
 * Handle DELETE requests (close incident)
 */
async function handleDeleteRequest(req, res, securityIncidentResponse) {
  const { id } = req.query;
  const { resolution } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Incident ID is required' });
  }

  if (!resolution) {
    return res.status(400).json({ error: 'Resolution is required' });
  }

  try {
    const incident = securityIncidentResponse.closeIncident(
      id, 
      resolution, 
      req.user?.email || 'api'
    );

    return res.status(200).json({
      success: true,
      data: incident,
      message: 'Incident closed successfully'
    });

  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
}

/**
 * Handle list incidents request
 */
function handleListIncidents(req, res, securityIncidentResponse) {
  const {
    status,
    severity,
    type,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (severity) filters.severity = severity;
  if (type) filters.type = type;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const allIncidents = securityIncidentResponse.getIncidents(filters);
  const total = allIncidents.length;
  const incidents = allIncidents.slice(
    parseInt(offset), 
    parseInt(offset) + parseInt(limit)
  );

  return res.status(200).json({
    success: true,
    data: {
      incidents,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      },
      filters
    }
  });
}

/**
 * Handle get single incident request
 */
function handleGetIncident(req, res, securityIncidentResponse, id) {
  if (!id) {
    return res.status(400).json({ error: 'Incident ID is required' });
  }

  const incident = securityIncidentResponse.getIncident(id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  return res.status(200).json({
    success: true,
    data: incident
  });
}

/**
 * Handle get report request
 */
function handleGetReport(req, res, securityIncidentResponse) {
  const { timeRange = '24h' } = req.query;
  
  const report = securityIncidentResponse.generateIncidentReport(timeRange);
  
  return res.status(200).json({
    success: true,
    data: report
  });
}

/**
 * Handle get playbooks request
 */
function handleGetPlaybooks(req, res, securityIncidentResponse) {
  const playbooks = Array.from(securityIncidentResponse.responsePlaybooks.entries())
    .map(([key, playbook]) => ({ id: key, ...playbook }));

  return res.status(200).json({
    success: true,
    data: { playbooks }
  });
}

/**
 * Handle get forensics request
 */
function handleGetForensics(req, res, securityIncidentResponse, id) {
  if (!id) {
    return res.status(400).json({ error: 'Incident ID is required' });
  }

  const incident = securityIncidentResponse.getIncident(id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  return res.status(200).json({
    success: true,
    data: {
      incidentId: id,
      forensicData: incident.forensicData,
      collectedAt: incident.updatedAt
    }
  });
}

/**
 * Handle create incident request
 */
async function handleCreateIncident(req, res, securityIncidentResponse) {
  const {
    type,
    description,
    metadata = {},
    tags = []
  } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Incident type is required' });
  }

  try {
    const incident = await securityIncidentResponse.createIncident({
      type,
      description,
      metadata: {
        ...metadata,
        createdBy: req.user?.email || 'api',
        source: 'manual'
      },
      tags
    });

    return res.status(201).json({
      success: true,
      data: incident,
      message: 'Security incident created successfully'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to create incident',
      message: error.message 
    });
  }
}

/**
 * Handle escalate incident request
 */
async function handleEscalateIncident(req, res, securityIncidentResponse) {
  const { incidentId } = req.body;

  if (!incidentId) {
    return res.status(400).json({ error: 'Incident ID is required' });
  }

  const incident = securityIncidentResponse.getIncident(incidentId);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  try {
    await securityIncidentResponse.escalateIncident(incident);

    return res.status(200).json({
      success: true,
      data: incident,
      message: 'Incident escalated successfully'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to escalate incident',
      message: error.message 
    });
  }
}

/**
 * Handle test incident request
 */
async function handleTestIncident(req, res, securityIncidentResponse) {
  const {
    type = 'test-incident',
    severity = 'low'
  } = req.body;

  try {
    const incident = await securityIncidentResponse.createIncident({
      type,
      description: 'Test security incident for validation',
      metadata: {
        test: true,
        createdBy: req.user?.email || 'api',
        source: 'test'
      },
      tags: ['test']
    });

    return res.status(201).json({
      success: true,
      data: incident,
      message: 'Test incident created successfully'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to create test incident',
      message: error.message 
    });
  }
}

module.exports = handler;