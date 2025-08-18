// Vercel API Route: /api/email/send-final-completion.js - Send final completion email
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const unifiedEmailService = require('../../lib/unifiedEmailService');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, managerComments } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user details to verify they exist
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send final completion email
    const result = await unifiedEmailService.sendFinalCompletionEmail(userId, managerComments);

    res.json({
      message: 'Final completion email sent successfully',
      messageId: result.messageId,
      recipient: user.email
    });

  } catch (_error) {
    // console.error('📧 [ERROR] Failed to send final completion email:', _error);
    res.status(500).json({
      error: 'Failed to send final completion email',
      details: _error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
