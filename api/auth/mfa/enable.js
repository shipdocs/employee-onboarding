const mfaService = require('../../../lib/mfaService');
const { requireAuth } = require('../../../lib/auth');
const { supabase } = require('../../../lib/supabase');
const { authRateLimit } = require('../../../lib/rateLimit');

// Helper function to log MFA security events
function logMFAEvent(userId, email, ipAddress, userAgent, eventType, success, reason = null) {
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_id: `mfa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: eventType,
          severity: success ? 'low' : 'medium',
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            email: email,
            success: success,
            reason: reason,
            timestamp: new Date().toISOString()
          },
          threats: success ? [] : ['mfa_bypass_attempt']
        });

      if (error) {
        console.error('Failed to log security event:', _error);
      }
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }, 0);
}

/**
 * MFA Enable Endpoint
 * POST /api/auth/mfa/enable
 *
 * Verifies the TOTP code and enables MFA for the authenticated user.
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const userEmail = req.user.email || 'unknown';
    const { verificationToken } = req.body;

    // Get client info for logging
    const clientIP = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Validate input
    if (!verificationToken) {
      logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_failure', false, 'missing_verification_token');
      return res.status(400).json({
        error: 'Verification token is required',
        code: 'VERIFICATION_TOKEN_REQUIRED'
      });
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(verificationToken)) {
      logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_failure', false, 'invalid_token_format');
      return res.status(400).json({
        error: 'Verification token must be 6 digits',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Check if MFA is available
    if (!mfaService.isMFAEnabled()) {
      return res.status(503).json({
        error: 'MFA is not available',
        code: 'MFA_DISABLED'
      });
    }

    // Enable MFA (this will verify the token and enable if valid)
    const result = await mfaService.enableMFA(userId, verificationToken, clientIP);

    if (!result.success) {
      // Handle specific error cases
      if (result.error.includes('rate limit')) {
        logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_failure', false, 'rate_limited');
        return res.status(429).json({
          error: result.error,
          code: 'MFA_RATE_LIMITED',
          retryAfter: result.retryAfter
        });
      }

      if (result.error.includes('Invalid') || result.error.includes('expired')) {
        logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_failure', false, 'invalid_verification_token');
        return res.status(400).json({
          error: result.error,
          code: 'INVALID_VERIFICATION_TOKEN'
        });
      }

      logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_failure', false, result.error);
      return res.status(400).json({
        error: result.error,
        code: 'MFA_ENABLE_FAILED'
      });
    }

    // Log successful MFA enable
    logMFAEvent(userId, userEmail, clientIP, userAgent, 'mfa_setup_success', true, null);

    // Success response
    return res.status(200).json({
      success: true,
      message: 'MFA has been successfully enabled for your account',
      data: {
        enabled: true,
        enabledAt: new Date().toISOString()
      }
    });

  } catch (_error) {
    console.error('MFA enable error:', _error);

    // Return appropriate error based on error type
    if (_error.message.includes('MFA is not enabled')) {
      return res.status(503).json({
        error: 'MFA service is not available',
        code: 'MFA_SERVICE_DISABLED'
      });
    }

    if (_error.message.includes('not configured')) {
      return res.status(400).json({
        error: 'MFA is not set up for this user',
        code: 'MFA_NOT_CONFIGURED'
      });
    }

    return res.status(500).json({
      error: 'Failed to enable MFA',
      code: 'MFA_ENABLE_ERROR'
    });
  }
}

module.exports = authRateLimit(requireAuth(handler));
