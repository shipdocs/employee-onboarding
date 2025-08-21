/**
 * Admin Security Alert Update API
 * Handles updating individual security alerts
 */

const { supabase } = require('../../../../lib/database-supabase-compat');
const { applyApiSecurityHeaders } = require('../../../../lib/securityHeaders');
const { adminRateLimit } = require('../../../../lib/rateLimit');

const { db } = require('../../../../lib/database');

module.exports = adminRateLimit(async (req, res) => {
  try {
    applyApiSecurityHeaders(res);

    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const user = null; // TODO: Implement authentication
    const authError = null;

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const profileResult = await db.query('SELECT role FROM user_profiles WHERE user_id = $1', [user.id]);
    const profile = profileResult.rows[0];
    const profileError = !profile;

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.query;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status
    const validStatuses = ['active', 'acknowledged', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Since we're using security_events as our alerts store,
    // we'll update the event details to include the alert status
    const eventResult = await db.query('SELECT * FROM security_events WHERE event_id = $1', [id]);
    const event = eventResult.rows[0];
    const fetchError = !event;

    if (fetchError || !event) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Update the event with alert status information
    const updatedDetails = {
      ...event.details,
      alert_status: status,
      alert_updated_at: new Date().toISOString(),
      alert_updated_by: user.id
    };

    const { data: updatedEvent, error: updateError } = await supabase
      .from('security_events')
      .update({
        details: updatedDetails
      })
      .eq('event_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update alert status:', updateError);
      return res.status(500).json({ error: 'Failed to update alert status' });
    }

    // Log the alert status change
    await supabase
      .from('security_events')
      .insert({
        event_id: `alert_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'alert_status_changed',
        severity: 'low',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          alert_id: id,
          old_status: event.details?.alert_status || 'active',
          new_status: status,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    // Transform back to alert format
    const alert = {
      id: updatedEvent.event_id,
      type: 'security_event',
      severity: updatedEvent.severity,
      status: status,
      title: updatedEvent.details?.title || `Security Event: ${updatedEvent.type}`,
      description: updatedEvent.details?.description || `${updatedEvent.type} detected`,
      created_at: updatedEvent.created_at,
      updated_at: new Date().toISOString(),
      metadata: {
        event_type: updatedEvent.type,
        ip_address: updatedEvent.ip_address,
        user_agent: updatedEvent.user_agent,
        threats: updatedEvent.threats,
        details: updatedEvent.details
      }
    };

    return res.json({
      success: true,
      alert,
      message: `Alert status updated to ${status}`
    });

  } catch (error) {
    console.error('Update alert status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
