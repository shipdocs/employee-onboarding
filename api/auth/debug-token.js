const jwt = require('jsonwebtoken');
const { authRateLimit } = require('../../lib/rateLimit');

/**
 * Debug Token Endpoint
 * GET /api/auth/debug-token
 *
 * Helps debug authentication issues by showing token information
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    const debugInfo = {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader ? authHeader.substring(0, 20) + '...' : null,
      hasToken: !!token,
      tokenLength: token?.length,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length,
      timestamp: new Date().toISOString()
    };

    if (token) {
      try {
        // Decode without verification to see payload
        const decoded = jwt.decode(token);
        debugInfo.tokenPayload = {
          userId: decoded?.userId,
          email: decoded?.email,
          role: decoded?.role,
          iat: decoded?.iat,
          exp: decoded?.exp,
          iss: decoded?.iss,
          jti: decoded?.jti
        };

        const now = Math.floor(Date.now() / 1000);
        debugInfo.tokenStatus = {
          currentTime: now,
          issuedAt: decoded?.iat,
          expiresAt: decoded?.exp,
          isExpired: decoded?.exp < now,
          timeUntilExpiry: decoded?.exp - now
        };

        // Try to verify with JWT_SECRET
        if (process.env.JWT_SECRET) {
          try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            debugInfo.verificationStatus = 'valid';
          } catch (verifyError) {
            debugInfo.verificationStatus = 'invalid';
            debugInfo.verificationError = verifyError.message;
          }
        } else {
          debugInfo.verificationStatus = 'no_secret';
        }

      } catch (decodeError) {
        debugInfo.decodeError = decodeError.message;
      }
    }

    return res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (_error) {
    console.error('Debug token error:', _error);
    return res.status(500).json({
      error: 'Debug failed',
      message: _error.message
    });
  }
}

module.exports = authRateLimit(handler);
