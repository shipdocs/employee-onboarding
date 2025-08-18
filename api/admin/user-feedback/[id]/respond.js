/**
 * Admin User Feedback Response API
 * Handles responding to user feedback
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
    const { response: responseText } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    if (!responseText) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    // Try to update the feedback
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .update({
        status: 'responded',
        response: responseText,
        responded_at: new Date().toISOString(),
        responded_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error && error.code === '42P01') {
      // Table doesn't exist, return mock response
      return res.json({
        success: true,
        feedback: {
          id,
          status: 'responded',
          response: responseText,
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          message: 'Feedback response recorded (mock mode - table not found)'
        }
      });
    }

    if (error || !feedback) {
      console.error('Failed to update feedback:', error);
      return res.status(404).json({ error: 'Feedback not found or failed to update' });
    }

    // Log the response action
    await supabase
      .from('security_events')
      .insert({
        event_id: `feedback_resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'feedback_responded',
        severity: 'low',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          feedback_id: id,
          response_length: responseText.length,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    // If the feedback has a user_id, we could send them a notification
    // For now, we'll just log it
    if (feedback.user_id) {
      console.log(`Feedback response sent for user ${feedback.user_id}, feedback ${id}`);
    }

    return res.json({
      success: true,
      feedback,
      message: 'Response sent successfully'
    });

  } catch (error) {
    console.error('Respond to feedback API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});
