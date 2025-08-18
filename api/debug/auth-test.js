// Debug endpoint - RESTRICTED TO DEVELOPMENT ONLY
// This endpoint should never be accessible in production
// Move module imports to top level for better performance
const jwt = require('jsonwebtoken');
const { handleErrorAndRespond, createSimpleError } = require('../../lib/security/secureErrorHandlerHelper');

async function handler(req, res) {
  // Check if debug endpoint is explicitly enabled
  if (process.env.DEBUG_ENDPOINT_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Block access in production environments
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Additional check using X-Forwarded-Host for proxy scenarios
  const forwardedHost = req.headers['x-forwarded-host'] || '';
  const host = req.headers.host || '';
  if (host.includes('burando.online') || host.includes('vercel.app') ||
      forwardedHost.includes('burando.online') || forwardedHost.includes('vercel.app')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'This endpoint is only available in development mode' 
    });
  }

  try {
    // Check if JWT_SECRET is available
    const jwtSecret = process.env.JWT_SECRET;

    // Check authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'No authorization header',
        message: 'Authentication test failed - no token provided'
      });
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization format. Expected: Bearer <token>',
        message: 'Authentication test failed - invalid header format'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        error: 'No token in authorization header',
        message: 'Authentication test failed - missing token'
      });
    }

    if (!jwtSecret) {
      const error = createSimpleError('JWT_SECRET not configured', 500, 'SYSTEM_CONFIGURATION_ERROR');
      return await handleErrorAndRespond(error, req, res);
    }

    try {
      const verified = jwt.verify(token, jwtSecret);
      return res.status(200).json({
        success: true,
        message: 'Authentication test passed',
        user: {
          id: verified.userId,
          role: verified.role
        }
      });
    } catch (verifyError) {
      return res.status(401).json({
        error: 'Token verification failed',
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    await handleErrorAndRespond(error, req, res);
  }
}

module.exports = handler;