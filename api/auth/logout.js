// Vercel API Route: /api/auth/logout.js
const { verifyJWT, blacklistToken, blacklistUserRefreshTokens } = require('../../lib/auth');
const { authRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Verify the token to get user information
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Blacklist the access token
    const blacklistResult = await blacklistToken(token, decoded.userId, 'logout', req);

    if (!blacklistResult.success) {
      // Log the error but still return success to the client
      // This prevents logout from failing if blacklisting has issues
      console.error('Failed to blacklist access token:', blacklistResult.error);
    }

    // Blacklist all refresh tokens for the user
    const refreshTokenResult = await blacklistUserRefreshTokens(decoded.userId, 'logout');

    if (!refreshTokenResult.success) {
      // Log the error but still return success to the client
      console.error('Failed to blacklist refresh tokens:', refreshTokenResult.error);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (_error) {
    console.error('Logout error:', _error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

module.exports = authRateLimit(handler);
