/**
 * Individual Incident API
 * External API for incident response tools to interact with specific incidents
 */

const { supabase } = require('../../lib/supabase');
const { requireRole } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

/**
 * GET /api/incidents/[id] - Get specific incident details
 */
async function handleGetIncident(req, res, incidentId) {
  try {
    // Require admin or manager role
    const user = await requireRole(req, ['admin', 'manager']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch incident
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Incident not found' });
      }
      console.error('Error fetching incident:', error);
      return res.status(500).json({ error: 'Failed to fetch incident' });
    }

    // Fetch external notifications for this incident
    const { data: notifications, error: notificationError } = await supabase
      .from('incident_external_notifications')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (notificationError) {
      console.error('Error fetching notifications:', notificationError);
    }

    return res.status(200).json({
      incident,
      external_notifications: notifications || []
    });

  } catch (error) {
    console.error('Error in handleGetIncident:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/incidents/[id] - Update incident (for external acknowledgment/resolution)
 */
async function handleUpdateIncident(req, res, incidentId) {
  try {
    // Allow external systems to update incidents with API key
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.INCIDENT_API_KEY;

    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      // Fallback to user authentication
      const user = await requireRole(req, ['admin', 'manager']);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const {
      status,
      assigned_to,
      resolution_notes,
      external_reference
    } = req.body;

    // Validate status
    const validStatuses = ['detected', 'acknowledged', 'investigating', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;

      // Set timestamps based on status
      if (status === 'acknowledged' && !updateData.response_time) {
        updateData.response_time = new Date().toISOString();
      }
      if (status === 'resolved' || status === 'closed') {
        updateData.resolution_time = new Date().toISOString();
      }
    }

    if (assigned_to) {
      updateData.assigned_to = assigned_to;
    }

    // Add external reference to metadata
    if (external_reference || resolution_notes) {
      // First fetch current metadata
      const { data: currentIncident, error: fetchError } = await supabase
        .from('incidents')
        .select('metadata')
        .eq('incident_id', incidentId)
        .single();

      if (fetchError) {
        console.error('Error fetching current incident:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch incident' });
      }

      const currentMetadata = currentIncident.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        ...(external_reference && { external_reference }),
        ...(resolution_notes && { resolution_notes }),
        last_updated_by: 'external_system',
        last_updated_at: new Date().toISOString()
      };
    }

    // Update incident
    const { data: updatedIncident, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('incident_id', incidentId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Incident not found' });
      }
      console.error('Error updating incident:', error);
      return res.status(500).json({ error: 'Failed to update incident' });
    }

    return res.status(200).json({
      message: 'Incident updated successfully',
      incident: updatedIncident
    });

  } catch (error) {
    console.error('Error in handleUpdateIncident:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Main handler function
 */
async function handler(req, res) {
  try {
    const { method, query } = req;
    const { id } = query;

    if (!id) {
      return res.status(400).json({ error: 'Incident ID is required' });
    }

    switch (method) {
      case 'GET':
        return await handleGetIncident(req, res, id);
      case 'PATCH':
        return await handleUpdateIncident(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PATCH']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Individual incident API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(handler);