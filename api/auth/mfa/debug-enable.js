const mfaService = require('../../../lib/mfaService');
const { requireAuth } = require('../../../lib/auth');
const { authRateLimit } = require('../../../lib/rateLimit');

/**
 * MFA Enable Debug Endpoint
 * POST /api/auth/mfa/debug-enable
 *
 * Debug endpoint to test MFA enable functionality
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const { verificationToken } = req.body;

    const debugInfo = {
      userId,
      verificationToken: verificationToken ? '***' + verificationToken.slice(-2) : null,
      timestamp: new Date().toISOString()
    };

    // Check MFA status before enable
    const statusBefore = await mfaService.getMFAStatus(userId);
    debugInfo.statusBefore = statusBefore;

    if (!verificationToken) {
      return res.status(400).json({
        error: 'Verification token required',
        debug: debugInfo
      });
    }

    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    debugInfo.clientIP = clientIP;

    // Try to enable MFA
    const enableResult = await mfaService.enableMFA(userId, verificationToken, clientIP);
    debugInfo.enableResult = enableResult;

    // Check MFA status after enable attempt
    const statusAfter = await mfaService.getMFAStatus(userId);
    debugInfo.statusAfter = statusAfter;

    return res.status(200).json({
      success: enableResult.success,
      message: enableResult.success ? 'MFA enabled successfully' : 'MFA enable failed',
      debug: debugInfo,
      result: enableResult
    });

  } catch (error) {
    console.error('MFA enable debug error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = authRateLimit(requireAuth(handler));
