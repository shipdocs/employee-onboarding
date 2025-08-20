/**
 * Admin Incident Acknowledge API
 * Handles acknowledging incidents
 */

const { supabase } = require('../../../../lib/supabase');
const { authenticateRequest } = require('../../../../lib/auth');
const { applyApiSecurityHeaders } = require('../../../../lib/securityHeaders');
const { adminRateLimit } = require('../../../../lib/rateLimit');

module.exports = adminRateLimit(async (req, res) => {
  try {
    applyApiSecurityHeaders(res);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.query;

    // Safely extract notes from request body
    const notes = req.body?.notes || '';

    if (!id) {
      return res.status(400).json({ error: 'Incident ID is required' });
    }

    // Update incident status to acknowledged
    const { data: incident, error } = await supabase
      .from('incidents')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
        acknowledgment_notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('incident_id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to acknowledge incident:', error);
      return res.status(500).json({ error: 'Failed to acknowledge incident' });
    }

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Log the acknowledgment action
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'acknowledge_incident',
        resource_type: 'incident',
        resource_id: id,
        details: {
          incident_id: id,
          notes: notes || '',
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    return res.json({
      success: true,
      incident,
      message: 'Incident acknowledged successfully'
    });

  } catch (error) {
    console.error('Acknowledge incident API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
