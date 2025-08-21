// api/auth/refresh.js - Token refresh endpoint
const { rotateRefreshToken, shouldRefreshToken } = require('../../lib/auth');
const { logAuthenticationEvent } = require('../../lib/securityLogger');

async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken, accessToken } = req.body;

    // Validate required fields
    if (!refreshToken) {
      await logAuthenticationEvent(req, null, 'token_refresh', 'failed', 'missing_refresh_token');
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Check if access token actually needs refresh (optional optimization)
    if (accessToken && !shouldRefreshToken(accessToken)) {
      return res.status(400).json({
        error: 'Access token does not need refresh yet',
        shouldRefresh: false
      });
    }

    // Rotate the refresh token
    const result = await rotateRefreshToken(refreshToken, req);

    if (!result.success) {
      await logAuthenticationEvent(req, null, 'token_refresh', 'failed', result.error);
      return res.status(401).json({ error: result.error });
    }

    // Log successful token refresh
    await logAuthenticationEvent(req, result.user.id, 'token_refresh', 'success');

    // Return new token pair
    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 2 * 60 * 60, // 2 hours in seconds
      tokenType: 'Bearer',
      user: result.user
    });

  } catch (error) {
    console.error('Error in token refresh:', error);
    await logAuthenticationEvent(req, null, 'token_refresh', 'failed', 'internalerror');
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;
