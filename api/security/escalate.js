/**
 * Security Event Escalation API
 * Manually escalate security events to incidents
 */

const db = require('../../lib/database');
const { SecurityEventEscalationService } = require('../../lib/services/securityEventEscalationService');
const { requireRole } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

const escalationService = new SecurityEventEscalationService();

module.exports = apiRateLimit(async (req, res) => {
  try {
    const { method } = req;

    switch (method) {
      case 'POST':
        return await handleEscalateEvent(req, res);
      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Security escalation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/security/escalate - Manually escalate security event to incident
 */
async function handleEscalateEvent(req, res) {
  try {
    // Require admin role for manual escalation
    const user = await requireRole(req, ['admin']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Safely extract parameters from request body
    const event_id = req.body?.event_id;
    const force = req.body?.force || false;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // Get security event
    const securityEventResult = await db.query('SELECT * FROM security_events WHERE event_id = $1', [event_id]);
    const securityEvent = securityEventResult.rows[0];
    const fetchError = !securityEvent;

    if (fetchError || !securityEvent) {
      return res.status(404).json({ error: 'Security event not found' });
    }

    // Check if already escalated (unless forced)
    if (!force) {
      const { data: existingIncident } = await supabase
        .from('incidents')
        .select('incident_id')
        .eq('source_event_id', event_id)
        .single();

      if (existingIncident) {
        return res.status(409).json({
          error: 'Security event already escalated',
          incident_id: existingIncident.incident_id
        });
      }
    }

    // Process escalation
    const result = await escalationService.processSecurityEvent(securityEvent);

    if (result.escalated) {
      return res.status(201).json({
        success: true,
        message: 'Security event escalated to incident',
        incident_id: result.incident_id,
        event_id: event_id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Security event could not be escalated',
        reason: result.reason,
        event_id: event_id
      });
    }

  } catch (error) {
    console.error('Error escalating security event:', error);
    return res.status(500).json({
      error: 'Failed to escalate security event',
      details: error.message
    });
  }
}
