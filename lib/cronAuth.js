/**
 * Cron Authentication Helper
 * Provides secure authentication for Vercel cron jobs
 */

/**
 * Validates that a request is from Vercel's cron system
 * @param {Request} req - The incoming request
 * @param {Response} res - The response object
 * @returns {boolean} - True if authorized, false if not (response already sent)
 */
function verifyCronRequest(req, res) {
  // Check for cron secret in environment
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('⚠️ CRON_SECRET not configured - cron endpoints are vulnerable');
    res.status(500).json({
      error: 'Cron authentication not configured',
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // Check authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized - Missing authentication',
      timestamp: new Date().toISOString()
    });
    return false;
  }

  const token = authHeader.substring(7);
  
  if (token !== cronSecret) {
    res.status(401).json({
      error: 'Unauthorized - Invalid token',
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // Additional security: Check if request is from Vercel's IP ranges (optional)
  // This can be enabled if you want extra security
  const vercelIps = req.headers['x-vercel-ip-country'];
  if (process.env.ENFORCE_VERCEL_IPS === 'true' && !vercelIps) {
    res.status(403).json({
      error: 'Forbidden - Request not from Vercel infrastructure',
      timestamp: new Date().toISOString()
    });
    return false;
  }

  return true;
}

/**
 * Middleware wrapper for cron endpoints
 * @param {Function} handler - The cron handler function
 * @returns {Function} - Wrapped handler with authentication
 */
function requireCronAuth(handler) {
  return async (req, res) => {
    // Verify cron authentication
    if (!verifyCronRequest(req, res)) {
      return; // Response already sent
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Log cron execution
    console.log(`📅 Cron job started: ${req.url} at ${new Date().toISOString()}`);
    
    try {
      // Execute the handler
      await handler(req, res);
      
      console.log(`✅ Cron job completed: ${req.url} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`❌ Cron job failed: ${req.url}`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Cron job execution failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

module.exports = {
  verifyCronRequest,
  requireCronAuth
};