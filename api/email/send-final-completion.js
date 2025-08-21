// Vercel API Route: /api/email/send-final-completion.js - Send final completion email
const db = require('../../lib/database');
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
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

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

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send final completion email:', error);
    res.status(500).json({
      error: 'Failed to send final completion email',
      details: error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
