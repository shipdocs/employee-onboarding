// Magic Link Login for Crew Members (PostgreSQL)
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Magic link token is required'
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication not configured'
      });
    }

    // Get magic link from database
    const linkResult = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (linkResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid magic link',
        message: 'Magic link is invalid or expired'
      });
    }

    const linkData = linkResult.rows[0];

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, position, vessel_assignment, status, preferred_language FROM users WHERE id = $1 AND is_active = true',
      [linkData.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Block magic link login for privileged users (admin/manager)
    if (['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff members must use the Staff Login option. Magic links are only for crew members.'
      });
    }

    // Mark magic link as used
    await pool.query(
      'UPDATE magic_links SET used_at = NOW(), used_ip = $1 WHERE token = $2',
      [req.headers['x-forwarded-for'] || req.connection.remoteAddress, token]
    );

    // Update user status to in_progress if they're crew and currently not_started
    if (user.role === 'crew' && user.status === 'not_started') {
      await pool.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['in_progress', user.id]
      );
      user.status = 'in_progress';
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Success response
    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        position: user.position,
        vesselAssignment: user.vessel_assignment,
        status: user.status,
        preferredLanguage: user.preferred_language
      }
    });

  } catch (error) {
    console.error('Magic login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Please try again later'
    });
  }
};
