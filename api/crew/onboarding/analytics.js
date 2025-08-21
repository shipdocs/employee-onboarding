// Vercel API Route: /api/crew/onboarding/analytics.js - Track onboarding analytics
const db = require('../../../lib/database-direct');
const { requireCrew } = require('../../../lib/auth');
const { trainingRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const {
      event_type,
      step_number,
      event_data,
      session_id,
      duration_seconds
    } = req.body;

    // Validate required fields
    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    // Get client IP and user agent
    const ip_address = req.headers['x-forwarded-for'] ||
                      req.headers['x-real-ip'] ||
                      req.connection?.remoteAddress ||
                      null;
    const user_agent = req.headers['user-agent'] || null;

    // Insert analytics event
    const { data, error } = await supabase
      .from('onboarding_analytics')
      .insert({
        user_id: userId,
        event_type,
        step_number,
        event_data: event_data || {},
        session_id,
        user_agent,
        ip_address,
        duration_seconds
      })
      .select()
      .single();

    if (error) {
      // console.error('Error inserting onboarding analytics:', _error);
      return res.status(500).json({ error: 'Failed to track analytics' });
    }

    return res.json({
      message: 'Analytics tracked successfully',
      event_id: data.id
    });

  } catch (_error) {
    // console.error('Error in onboarding analytics endpoint:', _error);
    res.status(500).json({
      error: 'Failed to track analytics',
      message: _error.message
    });
  }
}

module.exports = trainingRateLimit(requireCrew(handler));
