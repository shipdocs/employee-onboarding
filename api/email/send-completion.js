// Vercel API Route: /api/email/send-completion.js - Send completion email
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

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

    // Send completion email with certificate
    const result = await unifiedEmailService.sendCompletionCertificateEmail(userId);

    res.json({
      message: 'Completion email sent successfully',
      messageId: result.userResult?.messageId || result.messageId,
      recipient: user.email
    });

  } catch (_error) {
    // console.error('📧 [ERROR] Failed to send completion email:', _error);
    res.status(500).json({
      error: 'Failed to send completion email',
      details: _error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
