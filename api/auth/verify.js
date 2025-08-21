// Vercel API Route: /api/auth/verify.js
const { authenticateRequest, isTokenBlacklisted } = require('../../lib/auth');
const db = require('../../lib/database-direct');
const { authRateLimit } = require('../../lib/rateLimit');
const externalLoggingService = require('../../lib/services/externalLoggingService');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token and check authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check if token is blacklisted first
    try {
      const isBlacklisted = await isTokenBlacklisted(token);
      if (isBlacklisted) {
        // Log blacklisted token attempt
        externalLoggingService.logAuthEvent({
          action: 'blacklisted_token_used',
          ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          success: false,
          reason: 'Token has been revoked'
        }).catch(err => console.error('External logging failed:', err));
        
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    } catch (error) {
      console.error('Blacklist check failed:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }

    // Authenticate the request
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = user.userId;

    // Get fresh user data from database
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const userData = userResult.rows[0];

    if (!userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user can access the system (not suspended or not_started)
    if (userData.status === 'suspended' || userData.status === 'not_started') {
      return res.status(401).json({ error: 'Account access not available' });
    }

    // Fetch manager permissions if user is a manager
    let permissions = [];
    if (userData.role === 'manager') {
      const permissionResult = await db.query(
        'SELECT permission_key FROM manager_permissions WHERE manager_id = $1 AND permission_value = true',
        [userData.id]
      );
      permissions = permissionResult.rows.map(p => p.permission_key);
    }

    res.json({
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        position: userData.position,
        vesselAssignment: userData.vessel_assignment,
        status: userData.status,
        preferredLanguage: userData.preferred_language,
        permissions: permissions
      }
    });

  } catch (_error) {
    // console.error('Token verification error:', _error);
    res.status(500).json({ error: 'Token verification failed' });
  }
}

module.exports = authRateLimit(handler);
