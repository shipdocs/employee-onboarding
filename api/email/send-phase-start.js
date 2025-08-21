// Vercel API Route: /api/email/send-phase-start.js - Send phase start email
const db = require('../../lib/database');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, phase } = req.body;

    if (!userId || !phase) {
      return res.status(400).json({ error: 'User ID and phase are required' });
    }

    // Get user details to verify they exist
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send phase start email
    const result = await unifiedEmailService.sendPhaseStartEmail(userId, phase);

    res.json({
      message: 'Phase start email sent successfully',
      messageId: result.messageId,
      recipient: user.email,
      phase: phase
    });

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send phase start email:', error);
    res.status(500).json({
      error: 'Failed to send phase start email',
      details: error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
